import os
import csv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from notion_client import Client
from notion_client.errors import APIResponseError

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

if not NOTION_TOKEN or not DATABASE_ID:
    raise ValueError("Variáveis NOTION_TOKEN e NOTION_DATABASE_ID devem estar configuradas no .env")

app = FastAPI(title="Notion Expenses API")

# Habilita CORS para permitir comunicação com o frontend React local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

notion = Client(auth=NOTION_TOKEN)

class GastoCreate(BaseModel):
    nome: str
    valor: float
    tipo: str
    conta: str
    data: str  # Formato YYYY-MM-DD

@app.get("/api/gastos")
def get_gastos():
    try:
        results = []
        has_more = True
        start_cursor = None

        while has_more:
            response = notion.data_sources.query(
                data_source_id=DATABASE_ID,
                start_cursor=start_cursor
            )
            results.extend(response.get("results", []))
            has_more = response.get("has_more", False)
            start_cursor = response.get("next_cursor")

        gastos = []
        for page in results:
            props = page.get("properties", {})
            
            # Extrai Nome (Title)
            name_list = props.get("Name", {}).get("title", [])
            name = "".join([t.get("plain_text", "") for t in name_list]) if name_list else ""

            # Extrai Valor (Number)
            valor = props.get("Valor", {}).get("number") or 0.0

            # Extrai Tipo (Select)
            tipo_data = props.get("Tipo", {}).get("select")
            tipo = tipo_data.get("name", "") if tipo_data else ""

            # Extrai Conta (Select)
            conta_data = props.get("Conta", {}).get("select")
            conta = conta_data.get("name", "") if conta_data else ""

            # Extrai Data (Date)
            date_data = props.get("Date", {}).get("date")
            date = date_data.get("start", "") if date_data else ""

            # Extrai Criado Em (Created Time)
            criado_em = props.get("Created time", {}).get("created_time", "")

            gastos.append({
                "id": page.get("id"),
                "nome": name,
                "valor": valor,
                "tipo": tipo,
                "conta": conta,
                "data": date,
                "criado_em": criado_em
            })

        return gastos

    except APIResponseError as e:
        raise HTTPException(status_code=400, detail=f"Erro da API do Notion: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/gastos")
def create_gasto(gasto: GastoCreate):
    try:
        properties = {
            "Name": {
                "title": [
                    {
                        "text": {
                            "content": gasto.nome
                        }
                    }
                ]
            },
            "Valor": {
                "number": gasto.valor
            }
        }

        if gasto.tipo:
            properties["Tipo"] = {
                "select": {
                    "name": gasto.tipo
                }
            }

        if gasto.conta:
            properties["Conta"] = {
                "select": {
                    "name": gasto.conta
                }
            }

        if gasto.data:
            properties["Date"] = {
                "date": {
                    "start": gasto.data
                }
            }

        # Cria a página usando o ID do data source como parent
        new_page = notion.pages.create(
            parent={"type": "data_source_id", "data_source_id": DATABASE_ID},
            properties=properties
        )

        return {"status": "success", "id": new_page.get("id")}

    except APIResponseError as e:
        raise HTTPException(status_code=400, detail=f"Erro da API do Notion: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metadados")
def get_metadados():
    fallback_tipos = [
        "Alimentação", "Lanche/Doces", "Mercado", "Transporte", "Saúde", "Academia",
        "Cuidados Pessoais", "Vestuário", "Cosméticos", "Entretenimento e Lazer", 
        "Jogo", "Livro", "Softwares", "Internet", "Escola", "Profissional", 
        "Presente", "Eletrodomésticos", "Eletrônicos", "Parcelas de Compras", "Seguro", "Esporte"
    ]
    fallback_contas = [
        "Crédito Nubank", "Conta Nubank", "Conta Banco Do Brasil", 
        "Cartão Alimentação iFood", "Cartão Mobilidade iFood"
    ]
    try:
        # Busca os gastos atuais para mapear quais categorias/contas já existem
        gastos = get_gastos()
        
        tipos_reais = set(g["tipo"] for g in gastos if g.get("tipo"))
        contas_reais = set(g["conta"] for g in gastos if g.get("conta"))
        
        # Une as opções cadastradas com as padrões para histórico completo
        tipos = sorted(list(tipos_reais.union(set(fallback_tipos))))
        contas = sorted(list(contas_reais.union(set(fallback_contas))))
        
        return {"tipos": tipos, "contas": contas}
    except Exception as e:
        print(f"Erro ao computar metadados da base: {e}")
        return {"tipos": sorted(fallback_tipos), "contas": sorted(fallback_contas)}

@app.get("/api/exportar")
def exportar_csv():
    csv_file_path = "gastos.csv"
    try:
        results = []
        has_more = True
        start_cursor = None

        while has_more:
            response = notion.data_sources.query(
                data_source_id=DATABASE_ID,
                start_cursor=start_cursor
            )
            results.extend(response.get("results", []))
            has_more = response.get("has_more", False)
            start_cursor = response.get("next_cursor")

        headers = ["ID", "Nome", "Valor", "Tipo", "Conta", "Data", "Criado Em"]

        with open(csv_file_path, mode="w", newline="", encoding="utf-8-sig") as file:
            writer = csv.writer(file, delimiter=";")
            writer.writerow(headers)

            for page in results:
                page_id = page.get("id")
                props = page.get("properties", {})

                name_list = props.get("Name", {}).get("title", [])
                name = "".join([t.get("plain_text", "") for t in name_list]) if name_list else ""

                valor = props.get("Valor", {}).get("number")
                valor = valor if valor is not None else ""

                tipo_data = props.get("Tipo", {}).get("select")
                tipo = tipo_data.get("name", "") if tipo_data else ""

                conta_data = props.get("Conta", {}).get("select")
                conta = conta_data.get("name", "") if conta_data else ""

                date_data = props.get("Date", {}).get("date")
                date = date_data.get("start", "") if date_data else ""

                criado_em = props.get("Created time", {}).get("created_time", "")

                writer.writerow([page_id, name, valor, tipo, conta, date, criado_em])

        return FileResponse(path=csv_file_path, filename="gastos.csv", media_type="text/csv")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao exportar CSV: {str(e)}")

class GastoUpdate(BaseModel):
    nome: str
    valor: float
    tipo: str
    conta: str
    data: str  # Formato YYYY-MM-DD

@app.patch("/api/gastos/{gasto_id}")
def update_gasto(gasto_id: str, gasto: GastoUpdate):
    try:
        properties = {
            "Name": {
                "title": [
                    {
                        "text": {
                            "content": gasto.nome
                        }
                    }
                ]
            },
            "Valor": {
                "number": gasto.valor
            }
        }

        if gasto.tipo:
            properties["Tipo"] = {
                "select": {
                    "name": gasto.tipo
                }
            }

        if gasto.conta:
            properties["Conta"] = {
                "select": {
                    "name": gasto.conta
                }
            }

        if gasto.data:
            properties["Date"] = {
                "date": {
                    "start": gasto.data
                }
            }

        notion.pages.update(page_id=gasto_id, properties=properties)
        return {"status": "success", "message": "Gasto atualizado com sucesso"}
    except APIResponseError as e:
        raise HTTPException(status_code=400, detail=f"Erro da API do Notion: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/gastos/{gasto_id}")
def delete_gasto(gasto_id: str):
    try:
        notion.pages.update(page_id=gasto_id, archived=True)
        return {"status": "success", "message": "Gasto excluído com sucesso"}
    except APIResponseError as e:
        raise HTTPException(status_code=400, detail=f"Erro da API do Notion: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

