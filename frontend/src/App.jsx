import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  OutlinedInput,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TableHead,
  Paper,
  Chip,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  TableSortLabel,
  Fab,
  Zoom
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircleOutlined';
import DownloadIcon from '@mui/icons-material/CloudDownload';
import FilterIcon from '@mui/icons-material/FilterAlt';
import MoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import SyncIcon from '@mui/icons-material/Sync';
import ResetIcon from '@mui/icons-material/RestartAlt';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

const COLORS = [
  '#2E5A44', '#3E7D5C', '#556B2F', '#8FBC8F', '#4E785F',
  '#7F9E4B', '#6B8E23', '#2E7D32', '#A9DFBF', '#1C3A2B',
  '#A0B8A5', '#B2C4B7'
];

const gerarCorPorString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return {
    bg: `hsl(${hue}, 50%, 93%)`,
    border: `hsl(${hue}, 40%, 82%)`,
    text: `hsl(${hue}, 55%, 22%)`,
    main: `hsl(${hue}, 50%, 40%)`
  };
};

export default function App() {
  const [gastos, setGastos] = useState([]);
  const [metadados, setMetadados] = useState({ tipos: [], contas: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtros
  const [filtroDataDe, setFiltroDataDe] = useState('');
  const [filtroDataAte, setFiltroDataAte] = useState('');
  const [selectedTipos, setSelectedTipos] = useState([]);
  const [selectedContas, setSelectedContas] = useState([]);

  // Ordenação e Paginação de lançamentos
  const [ordemDirecao, setOrdemDirecao] = useState('desc'); // 'desc' = mais recente primeiro
  const [limiteExibicao, setLimiteExibicao] = useState(20);

  // Controle de visibilidade do formulário flutuante (Cadastro)
  const [formAberto, setFormAberto] = useState(false);

  const toggleOrdenacaoData = () => {
    setOrdemDirecao(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Reseta o limite para 20 sempre que os filtros mudarem
  useEffect(() => {
    setLimiteExibicao(20);
  }, [filtroDataDe, filtroDataAte, selectedTipos, selectedContas]);

  // Form de cadastro
  const [form, setForm] = useState({
    nome: '',
    valor: '',
    tipo: '',
    conta: '',
    data: new Date().toISOString().split('T')[0]
  });

  // Notificações Snackbar (MUI Toast)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const showToast = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const fetchDados = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const resGastos = await fetch(`http://${window.location.hostname}:8000/api/gastos`);
      if (!resGastos.ok) throw new Error('Falha ao buscar gastos');
      const dataGastos = await resGastos.json();
      setGastos(dataGastos);

      const resMeta = await fetch(`http://${window.location.hostname}:8000/api/metadados`);
      if (!resMeta.ok) throw new Error('Falha ao buscar metadados');
      const dataMeta = await resMeta.json();
      setMetadados(dataMeta);

      if (dataMeta.tipos.length > 0 && !form.tipo) {
        setForm(prev => ({ ...prev, tipo: dataMeta.tipos[0] }));
      }
      if (dataMeta.contas.length > 0 && !form.conta) {
        setForm(prev => ({ ...prev, conta: dataMeta.contas[0] }));
      }

    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar dados do Notion. Verifique se o backend está ativo.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.valor || !form.tipo || !form.conta || !form.data) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/gastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          valor: parseFloat(form.valor),
          tipo: form.tipo,
          conta: form.conta,
          data: form.data
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Erro ao cadastrar gasto');
      }

      showToast('Gasto cadastrado com sucesso no Notion!');
      setFormAberto(false);
      setForm(prev => ({
        ...prev,
        nome: '',
        valor: ''
      }));
      fetchDados(false);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Erro ao enviar dados para o Notion.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    window.open(`http://${window.location.hostname}:8000/api/exportar`, '_blank');
    showToast('Download do CSV iniciado com sucesso!');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDados(false);
    showToast('Sincronizando registros...');
  };

  const toggleTipoFiltro = (tipo) => {
    setSelectedTipos(prev => 
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    );
  };

  const toggleContaFiltro = (conta) => {
    setSelectedContas(prev => 
      prev.includes(conta) ? prev.filter(c => c !== conta) : [...prev, conta]
    );
  };

  const limparFiltros = () => {
    setFiltroDataDe('');
    setFiltroDataAte('');
    setSelectedTipos([]);
    setSelectedContas([]);
    setOrdemDirecao('desc');
    setLimiteExibicao(20);
    showToast('Filtros redefinidos com sucesso');
  };

  // Filtragem local
  const gastosFiltrados = gastos.filter(g => {
    if (filtroDataDe && g.data < filtroDataDe) return false;
    if (filtroDataAte && g.data > filtroDataAte) return false;
    if (selectedTipos.length > 0 && !selectedTipos.includes(g.tipo)) return false;
    if (selectedContas.length > 0 && !selectedContas.includes(g.conta)) return false;
    return true;
  });

  const valorTotal = gastosFiltrados.reduce((sum, g) => sum + g.valor, 0);

  // Ordena os gastos por data (descrescente por padrão, ou crescente se selecionado)
  const gastosOrdenados = [...gastosFiltrados].sort((a, b) => {
    const dataA = a.data || '';
    const dataB = b.data || '';
    if (dataA < dataB) return ordemDirecao === 'asc' ? -1 : 1;
    if (dataA > dataB) return ordemDirecao === 'asc' ? 1 : -1;
    return 0;
  });

  // Fatiamento de exibição limite de 20
  const gastosExibidos = gastosOrdenados.slice(0, limiteExibicao);

  // Dados do gráfico
  const dadosGrafico = Object.entries(
    gastosFiltrados.reduce((acc, g) => {
      const cat = g.tipo || 'Sem Categoria';
      acc[cat] = (acc[cat] || 0) + g.valor;
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  })).sort((a, b) => b.value - a.value);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Toast Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, pb: 2, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 36 }} />
          <Typography variant="h4" component="h1" color="primary.main">
            Controle de Gastos Notion
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <IconButton 
            onClick={handleRefresh} 
            disabled={refreshing || loading}
            color="primary"
            sx={{ border: '1px solid rgba(46, 90, 68, 0.2)' }}
          >
            <SyncIcon className={refreshing ? 'spin-anim' : ''} />
          </IconButton>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<DownloadIcon />} 
            onClick={handleExportCSV}
          >
            Exportar CSV
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 2 }}>
          <CircularProgress color="primary" size={50} />
          <Typography variant="body1" color="text.secondary">
            Carregando dados sincronizados do Notion...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Somatórios rápidos - 100% Horizontal em qualquer tela */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={4}>
              <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <CardContent sx={{ textAlign: 'center', py: 3, px: { xs: 1, sm: 2 } }}>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
                    Gasto Total
                  </Typography>
                  <Typography variant="h4" component="span" sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.7rem', md: '2.1rem' } }}>
                    R$ {valorTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 3, px: { xs: 1, sm: 2 } }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
                    Transações
                  </Typography>
                  <Typography variant="h4" component="span" color="primary.main" sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.7rem', md: '2.1rem' } }}>
                    {gastosFiltrados.length} <Typography variant="body2" component="span" color="text.secondary" sx={{ display: { xs: 'none', sm: 'inline' } }}>de {gastos.length}</Typography>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 3, px: { xs: 1, sm: 2 } }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
                    Categorias
                  </Typography>
                  <Typography variant="h4" component="span" color="primary.main" sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', sm: '1.7rem', md: '2.1rem' } }}>
                    {dadosGrafico.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Grid Principal - 100% de Largura com Relatórios e Gráficos */}
          <Grid container spacing={4}>
            
            {/* Coluna Única de Relatórios */}
            <Grid item xs={12} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              
              {/* Card de Filtros */}
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FilterIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" component="h3" color="text.primary">
                        Filtros Customizados
                      </Typography>
                    </Box>
                    {(filtroDataDe || filtroDataAte || selectedTipos.length > 0 || selectedContas.length > 0) && (
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="secondary"
                        startIcon={<ResetIcon />} 
                        onClick={limparFiltros}
                      >
                        Limpar Filtros
                      </Button>
                    )}
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel shrink htmlFor="filtro-data-de">Período (Início)</InputLabel>
                        <OutlinedInput
                          id="filtro-data-de"
                          type="date"
                          notched
                          label="Período (Início)"
                          value={filtroDataDe}
                          onChange={(e) => setFiltroDataDe(e.target.value)}
                        />
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel shrink htmlFor="filtro-data-ate">Período (Fim)</InputLabel>
                        <OutlinedInput
                          id="filtro-data-ate"
                          type="date"
                          notched
                          label="Período (Fim)"
                          value={filtroDataAte}
                          onChange={(e) => setFiltroDataAte(e.target.value)}
                        />
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* Multi-seleção de Categoria com cores dinâmicas e quebra de linha */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Filtrar por Categoria ({selectedTipos.length} selecionadas)
                    </Typography>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1, 
                        pt: 0.5
                      }}
                    >
                      {metadados.tipos.map(tipo => {
                        const selected = selectedTipos.includes(tipo);
                        const cores = gerarCorPorString(tipo);
                        return (
                          <Chip
                            key={tipo}
                            label={tipo}
                            onClick={() => toggleTipoFiltro(tipo)}
                            clickable
                            size="small"
                            sx={{ 
                              bgcolor: selected ? cores.main : cores.bg,
                              border: `1px solid ${cores.border}`,
                              color: selected ? '#ffffff' : cores.text,
                              fontWeight: 500,
                              '&:hover': {
                                bgcolor: selected ? cores.main : 'rgba(0,0,0,0.04)',
                                opacity: 0.95
                              }
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>

                  {/* Multi-seleção de Conta com quebra de linha */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Filtrar por Conta ({selectedContas.length} selecionadas)
                    </Typography>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1, 
                        pt: 0.5
                      }}
                    >
                      {metadados.contas.map(conta => {
                        const selected = selectedContas.includes(conta);
                        return (
                          <Chip
                            key={conta}
                            label={conta}
                            onClick={() => toggleContaFiltro(conta)}
                            color={selected ? 'primary' : 'default'}
                            variant={selected ? 'filled' : 'outlined'}
                            clickable
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Card do Gráfico */}
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <TrendingUpIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" component="h2" color="text.primary">
                      Distribuição de Gastos por Categoria
                    </Typography>
                  </Box>

                  {dadosGrafico.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px' }}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhum gasto registrado para os filtros aplicados.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {/* Círculo do gráfico */}
                      <Box sx={{ width: 220, height: 220, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={dadosGrafico}
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={85}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {dadosGrafico.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={gerarCorPorString(entry.name).main} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Gasto']}
                              contentStyle={{ 
                                background: '#FFFFFF', 
                                border: '1px solid rgba(46, 90, 68, 0.15)', 
                                borderRadius: '8px', 
                                color: '#1F2E26',
                                fontSize: '0.85rem'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                            Total Filtrado
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1.05rem' }}>
                            R$ {valorTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Legenda Lateral */}
                      <Box 
                        className="custom-scrollbar"
                        sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 1.2, 
                          width: '100%', 
                          maxWidth: { xs: '100%', md: '340px' }, 
                          maxHeight: '220px', 
                          overflowY: 'auto', 
                          pr: 1 
                        }}
                      >
                        {dadosGrafico.map((entry, index) => {
                          const percent = ((entry.value / valorTotal) * 100).toFixed(1);
                          return (
                            <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.8rem' }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: gerarCorPorString(entry.name).main, flexShrink: 0 }}></Box>
                              <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1, fontSize: '0.8rem', color: 'text.secondary' }} title={entry.name}>
                                {entry.name}
                                <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary', opacity: 0.7 }}>({percent}%)</Typography>
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.8rem', flexShrink: 0 }}>
                                R$ {entry.value.toLocaleString('pt-BR')}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>

            </Grid>

          </Grid>

          {/* Tabela de Lançamentos */}
          <Card sx={{ mt: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <WalletIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" component="h2" color="text.primary">
                  Últimos Lançamentos
                </Typography>
              </Box>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead sx={{ bgcolor: 'rgba(46, 90, 68, 0.02)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        <TableSortLabel
                          active={true}
                          direction={ordemDirecao}
                          onClick={toggleOrdenacaoData}
                          sx={{
                            '&.Mui-active': { color: 'text.secondary' },
                            '& .MuiTableSortLabel-icon': { color: 'primary.main !important' }
                          }}
                        >
                          Data
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Descrição</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Categoria</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Conta</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gastosExibidos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          Nenhum registro corresponde aos filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      gastosExibidos.map((g) => (
                        <TableRow key={g.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            {g.data ? new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500, color: 'text.primary' }}>{g.nome}</TableCell>
                          <TableCell>
                            {(() => {
                              const cores = gerarCorPorString(g.tipo || 'Sem Categoria');
                              return (
                                <Chip 
                                  label={g.tipo || 'Sem Categoria'} 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: cores.bg, 
                                    border: `1px solid ${cores.border}`, 
                                    color: cores.text,
                                    fontWeight: 500
                                  }} 
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={g.conta} 
                              size="small" 
                              sx={{ 
                                bgcolor: 'rgba(85, 107, 47, 0.06)', 
                                border: '1px solid rgba(85, 107, 47, 0.12)', 
                                color: 'secondary.main',
                                fontWeight: 500
                              }} 
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'text.primary', whiteSpace: 'nowrap' }}>
                            R$ {g.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {gastosFiltrados.length > limiteExibicao && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={() => setLimiteExibicao(prev => prev + 20)}
                  >
                    Mostrar Mais ({gastosFiltrados.length - limiteExibicao} restantes)
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Botão Flutuante (FAB) para Adicionar Novo Gasto */}
      {!formAberto && (
        <Fab 
          color="primary" 
          aria-label="add" 
          onClick={() => setFormAberto(true)}
          sx={{ 
            position: 'fixed', 
            bottom: 24, 
            right: 24,
            boxShadow: '0 4px 20px rgba(46, 90, 68, 0.3)',
            transition: 'transform 0.2s ease-in-out',
            zIndex: 1000,
            '&:hover': { transform: 'scale(1.1)' }
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Card de Cadastro Flutuante com Animação Zoom */}
      <Zoom in={formAberto}>
        <Card 
          sx={{ 
            position: 'fixed', 
            bottom: 24, 
            right: 24, 
            width: { xs: 'calc(100% - 48px)', sm: 380 },
            zIndex: 1001,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(46, 90, 68, 0.15)',
            display: formAberto ? 'block' : 'none'
          }}
        >
          <CardContent sx={{ p: 3, position: 'relative' }}>
            {/* Ícone de Fechar */}
            <IconButton 
              onClick={() => setFormAberto(false)}
              sx={{ position: 'absolute', top: 12, right: 12, color: 'text.secondary' }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, pr: 4 }}>
              <AddCircleIcon sx={{ color: 'success.main' }} />
              <Typography variant="h6" component="h2" color="text.primary" sx={{ fontSize: '1.1rem' }}>
                Adicionar Novo Gasto
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
              <TextField
                label="Descrição / Item"
                name="nome"
                variant="outlined"
                size="small"
                placeholder="Ex: Parcela do celular, Mercado, etc."
                value={form.nome}
                onChange={handleInputChange}
                required
                fullWidth
              />

              <TextField
                label="Valor (R$)"
                name="valor"
                type="number"
                variant="outlined"
                size="small"
                placeholder="0,00"
                value={form.valor}
                onChange={handleInputChange}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon size={18} sx={{ color: 'text.secondary' }} style={{ marginRight: '4px' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl fullWidth size="small" required>
                <InputLabel shrink htmlFor="cadastro-data">Data de Competência</InputLabel>
                <OutlinedInput
                  id="cadastro-data"
                  name="data"
                  type="date"
                  notched
                  label="Data de Competência"
                  value={form.data}
                  onChange={handleInputChange}
                  startAdornment={
                    <InputAdornment position="start">
                      <CalendarIcon size={18} sx={{ color: 'text.secondary' }} style={{ marginRight: '8px' }} />
                    </InputAdornment>
                  }
                />
              </FormControl>

              <FormControl fullWidth size="small" required>
                <InputLabel id="label-tipo">Categoria (Tipo)</InputLabel>
                <Select
                  labelId="label-tipo"
                  name="tipo"
                  value={form.tipo}
                  label="Categoria (Tipo)"
                  onChange={handleInputChange}
                >
                  {metadados.tipos.map(t => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" required>
                <InputLabel id="label-conta">Conta Financeira</InputLabel>
                <Select
                  labelId="label-conta"
                  name="conta"
                  value={form.conta}
                  label="Conta Financeira"
                  onChange={handleInputChange}
                >
                  {metadados.contas.map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddCircleIcon />}
                fullWidth
                sx={{ mt: 0.5, py: 1.1 }}
              >
                {submitting ? 'Salvando...' : 'Adicionar Gasto'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Zoom>
    </Container>
  );
}
