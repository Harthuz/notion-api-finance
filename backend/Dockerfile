FROM python:3.11-slim

WORKDIR /app

# Instala as dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código
COPY . .

# Expõe a porta que o FastAPI escuta
EXPOSE 8000

# Executa o uvicorn ligando no host 0.0.0.0 para aceitar conexões externas ao container
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
