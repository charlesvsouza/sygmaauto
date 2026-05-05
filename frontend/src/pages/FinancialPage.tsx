import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { financialApi, tenantsApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Filter,
  Download,
  Activity,
  BarChart4,
  Wallet,
  Percent,
  Receipt,
  X,
  CreditCard,
  Banknote,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { cn } from '../lib/utils';

const FINANCIAL_PRINT_STYLE = `
@media screen {
  #fin-print-doc { display: none; }
}
@media print {
  body * { visibility: hidden; }
  #fin-print-doc, #fin-print-doc * { visibility: visible; }
  #fin-print-doc { position: absolute; left: 0; top: 0; width: 100%; background: white; }
  @page { size: A4; margin: 12mm 14mm; }
}
.fin-doc {
  font-family: Arial, 'Helvetica Neue', sans-serif;
  font-size: 10pt;
  color: #111;
  width: 100%;
}
.fin-doc table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.fin-doc td, .fin-doc th { border: 1px solid #888; padding: 5px 8px; font-size: 9pt; vertical-align: middle; }
.fin-doc th { font-weight: bold; }
.fin-doc .hdr-row td, .fin-doc .hdr-row th {
  background: #1e293b !important; color: #fff !important; border-color: #1e293b !important;
  font-weight: bold; text-transform: uppercase; font-size: 9pt; letter-spacing: 0.05em;
}
.fin-doc .income-row td { background: #f0fdf4; }
.fin-doc .expense-row td { background: #fff5f5; }
.fin-doc .summary-value { font-size: 13pt; font-weight: 900; }
.fin-doc hr { border: none; border-top: 1.5px solid #333; margin: 7px 0; }
`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

export function FinancialPage() {
  const { user } = useAuthStore();
  const userRole = String(user?.role ?? '').toUpperCase();
  const canManageFinancial = ['MASTER', 'ADMIN'].includes(userRole);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantData, setTenantData] = useState<any>(null);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    type: 'EXPENSE',
    category: 'Geral',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { loadFinancialData(); }, []);

  const loadFinancialData = async () => {
    try {
      const [transRes, summaryRes, tenantRes] = await Promise.all([
        financialApi.getAll(),
        financialApi.getSummary(),
        tenantsApi.getMe(),
      ]);
      setTransactions(Array.isArray(transRes.data) ? transRes.data : []);
      setSummary({
        income: summaryRes.data.totalIncome ?? 0,
        expense: summaryRes.data.totalExpense ?? 0,
        balance: summaryRes.data.netProfit ?? 0,
      });
      setTenantData(tenantRes.data);
    } catch (error) {
      console.error('Falha ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageFinancial) {
      alert('Seu perfil nao possui permissao para lancar movimentacoes financeiras.');
      return;
    }
    try {
      await financialApi.create(formData);
      setShowAddModal(false);
      loadFinancialData();
      setFormData({ description: '', amount: 0, type: 'EXPENSE', category: 'Geral', date: new Date().toISOString().split('T')[0] });
    } catch {
      alert('Erro ao salvar transação');
    }
  };

  const filteredTransactions = useMemo(
    () => transactions.filter(
      (t) =>
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [transactions, searchTerm]
  );

  const metrics = useMemo(() => {
    const incomeTrans = transactions.filter((t) => t.type === 'INCOME');
    const ticketMedio = incomeTrans.length > 0 ? summary.income / incomeTrans.length : 0;
    const lucratividade = summary.income > 0 ? ((summary.income - summary.expense) / summary.income) * 100 : 0;
    return { ticketMedio, lucratividade, count: transactions.length, incomeCount: incomeTrans.length };
  }, [transactions, summary]);

  // Gráfico real: últimos 5 meses com base nas transações de INCOME
  const monthlyData = useMemo(() => {
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const buckets = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return { month: MONTHS[d.getMonth()], year: d.getFullYear(), monthIdx: d.getMonth(), value: 0 };
    });
    transactions
      .filter((t) => t.type === 'INCOME')
      .forEach((t) => {
        const tDate = new Date(t.date);
        const bucket = buckets.find((b) => b.monthIdx === tDate.getMonth() && b.year === tDate.getFullYear());
        if (bucket) bucket.value += Number(t.amount);
      });
    return buckets;
  }, [transactions]);

  const maxVal = Math.max(...monthlyData.map((d) => d.value), 1);

  const fmtBR = (v: number, dec = 2) =>
    Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      <style>{FINANCIAL_PRINT_STYLE}</style>

      {/* PRINT DOCUMENT */}
      <div id="fin-print-doc">
        {tenantData && (
          <div className="fin-doc">
            {/* Header */}
            <table style={{ marginBottom: '6px' }}>
              <tbody>
                <tr>
                  <td style={{ border: 'none', paddingLeft: 0, verticalAlign: 'top', width: '65%' }}>
                    <div style={{ fontSize: '16pt', fontWeight: 900, lineHeight: 1.1 }}>{tenantData.name}</div>
                    {tenantData.document && <div style={{ fontSize: '9pt', marginTop: '3px' }}>{tenantData.companyType || 'CNPJ'}: {tenantData.document}</div>}
                    {tenantData.address && <div style={{ fontSize: '9pt' }}>{tenantData.address}</div>}
                    <div style={{ fontSize: '9pt' }}>
                      {tenantData.phone && `Tel: ${tenantData.phone}`}
                      {tenantData.phone && tenantData.email && '  |  '}
                      {tenantData.email}
                    </div>
                  </td>
                  <td style={{ border: '2px solid #1e293b', padding: '8px 12px', textAlign: 'right', verticalAlign: 'top', minWidth: '155px' }}>
                    <div style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#555' }}>Relatório Financeiro</div>
                    <div style={{ fontSize: '9pt', color: '#444', marginTop: '4px' }}>Gerado em: {new Date().toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: '9pt', color: '#444' }}>Total de lançamentos: {transactions.length}</div>
                  </td>
                </tr>
              </tbody>
            </table>
            <hr />

            {/* Summary */}
            <table style={{ marginBottom: '8px' }}>
              <tbody>
                <tr className="hdr-row"><td colSpan={4}>RESUMO DO PERÍODO</td></tr>
                <tr>
                  <td style={{ textAlign: 'center', padding: '10px' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' }}>Receitas (Entradas)</div>
                    <div className="summary-value" style={{ color: '#16a34a' }}>R$ {fmtBR(summary.income)}</div>
                    <div style={{ fontSize: '8pt', color: '#888' }}>{metrics.incomeCount} lançamentos</div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' }}>Despesas (Saídas)</div>
                    <div className="summary-value" style={{ color: '#dc2626' }}>R$ {fmtBR(summary.expense)}</div>
                    <div style={{ fontSize: '8pt', color: '#888' }}>{transactions.length - metrics.incomeCount} lançamentos</div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px', background: summary.balance >= 0 ? '#f0fdf4' : '#fff5f5' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' }}>Saldo Líquido</div>
                    <div className="summary-value" style={{ color: summary.balance >= 0 ? '#16a34a' : '#dc2626' }}>R$ {fmtBR(summary.balance)}</div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' }}>Lucratividade</div>
                    <div className="summary-value">{metrics.lucratividade.toFixed(1)}%</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Transactions */}
            <table>
              <thead>
                <tr className="hdr-row">
                  <td style={{ width: '80px' }}>Data</td>
                  <td>Descrição</td>
                  <td style={{ width: '100px' }}>Categoria</td>
                  <td style={{ width: '55px', textAlign: 'center' }}>Tipo</td>
                  <td style={{ width: '110px', textAlign: 'right' }}>Valor</td>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className={t.type === 'INCOME' ? 'income-row' : 'expense-row'}>
                    <td>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td>
                      {t.description}
                      {t.referenceId && <span style={{ fontSize: '8pt', color: '#888', marginLeft: '4px' }}>(OS: {t.referenceId.slice(0, 8)})</span>}
                    </td>
                    <td>{t.category || 'Geral'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: t.type === 'INCOME' ? '#16a34a' : '#dc2626' }}>
                      {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: t.type === 'INCOME' ? '#16a34a' : '#dc2626' }}>
                      {t.type === 'INCOME' ? '+' : '−'} R$ {fmtBR(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #555', display: 'inline-block', width: '200px', marginBottom: '4px' }}></div><br />
                <span style={{ fontSize: '9pt' }}>Responsável Financeiro</span><br />
                <span style={{ fontSize: '8pt', color: '#666' }}>Data: _____/_____/__________</span>
              </div>
              <div style={{ fontSize: '7pt', color: '#999', textAlign: 'right', alignSelf: 'flex-end' }}>
                Documento gerado em {new Date().toLocaleString('pt-BR')}<br />Sigma Auto — Sistema de Gestão
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 text-primary-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
            <Activity size={14} /> Inteligência Financeira
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
            Gestão <span className="text-primary-600">Financeira</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">Relatórios detalhados e controle de fluxo de caixa</p>
        </motion.div>
        <motion.div variants={itemVariants} className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="h-12 px-6 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <Printer size={18} className="text-slate-400" /> Imprimir Relatório
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!canManageFinancial}
            className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canManageFinancial ? 'Sem permissao para lancamentos financeiros' : undefined}
          >
            <Plus size={18} /> Lançar Movimentação
          </button>
        </motion.div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Chart */}
        <motion.div variants={itemVariants} className="md:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                  <BarChart4 size={20} />
                </div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Evolução do Faturamento</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {monthlyData[0]?.month}/{monthlyData[0]?.year} — {monthlyData[4]?.month}/{monthlyData[4]?.year}
              </span>
            </div>
            <div className="flex items-end justify-between h-32 gap-4">
              {monthlyData.map((d, i) => (
                <div key={`${d.month}-${d.year}`} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative h-full flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.value / maxVal) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={cn(
                        'w-full rounded-t-xl transition-all group-hover:opacity-80',
                        i === monthlyData.length - 1 ? 'bg-primary-600 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-200'
                      )}
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">{d.month}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-500/5 rounded-full blur-[80px]" />
        </motion.div>

        <div className="grid grid-cols-1 gap-6">
          <motion.div variants={itemVariants} className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden group">
            <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-4">Ticket Médio</p>
            <h3 className="text-3xl font-black tracking-tight">R$ {fmtBR(metrics.ticketMedio, 0)}</h3>
            <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400 font-bold uppercase">
              <Receipt size={12} /> {metrics.incomeCount} Entradas
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <Wallet size={80} />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Lucratividade</p>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{metrics.lucratividade.toFixed(1)}%</h3>
            </div>
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(metrics.lucratividade, 100)}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
              <Percent size={80} />
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="bg-primary-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-primary-500/20 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-primary-200 uppercase tracking-widest mb-2">Fluxo Disponível</p>
            <h3 className={cn('text-4xl font-black tracking-tighter', summary.balance < 0 && 'text-red-200')}>
              R$ {fmtBR(summary.balance)}
            </h3>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
              <p className="text-[10px] font-bold text-primary-100 uppercase tracking-widest">
                {summary.balance >= 0 ? 'Saúde Financeira: ÓTIMA' : 'Atenção: saldo negativo'}
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        </motion.div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Entradas Acumuladas</p>
            <h4 className="text-2xl font-black text-slate-900">R$ {fmtBR(summary.income)}</h4>
          </div>
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:rotate-12 transition-transform">
            <ArrowDownLeft size={24} />
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Saídas Totais</p>
            <h4 className="text-2xl font-black text-slate-900">R$ {fmtBR(summary.expense)}</h4>
          </div>
          <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:-rotate-12 transition-transform">
            <ArrowUpRight size={24} />
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Projeção Próx. Mês</p>
            <h4 className="text-2xl font-black text-slate-900">R$ {fmtBR(summary.income * 1.1, 0)}</h4>
          </div>
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
        </motion.div>
      </div>

      {/* Transactions Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50/20">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Livro Caixa</h3>
            <p className="text-sm text-slate-500 font-medium">Registro cronológico de todas as operações</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Filtrar descrição ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
              />
            </div>
            <button className="p-3.5 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-400">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Sincronizando Banco de Dados...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-black uppercase tracking-[0.2em] text-[9px]">
                  <th className="px-8 py-5">Movimentação / Data</th>
                  <th className="px-8 py-5">Histórico do Lançamento</th>
                  <th className="px-8 py-5 text-center">Classificação</th>
                  <th className="px-8 py-5 text-right">Valor Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence>
                  {filteredTransactions.map((t, idx) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                            t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                          )}>
                            {t.type === 'INCOME' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Ref: {t.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-bold text-slate-700">{t.description}</p>
                        {t.referenceId && (
                          <span className="mt-1 inline-block px-2 py-0.5 bg-primary-50 text-primary-600 rounded-md text-[9px] font-black uppercase tracking-tighter">
                            Vínculo OS: {t.referenceId.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                          {t.category || 'Geral'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <p className={cn('text-lg font-black tracking-tighter', t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600')}>
                          {t.type === 'INCOME' ? '+' : '−'} R$ {fmtBR(t.amount)}
                        </p>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {filteredTransactions.length === 0 && (
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="text-slate-200" size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Nenhum registro</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto mt-2">Ajuste os filtros ou realize um novo lançamento manual.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                    <Banknote size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Novo Lançamento</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Movimentação Manual</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 rounded-2xl mb-6">
                  <button type="button" onClick={() => setFormData({ ...formData, type: 'INCOME' })} className={cn('py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all', formData.type === 'INCOME' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50')}>Entrada</button>
                  <button type="button" onClick={() => setFormData({ ...formData, type: 'EXPENSE' })} className={cn('py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all', formData.type === 'EXPENSE' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500 hover:bg-white/50')}>Saída</button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Lançamento</label>
                  <input type="text" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-sm" placeholder="Ex: Aluguel do Galpão" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-black text-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                    <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-sm" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria / Classificação</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-sm">
                    <option value="Geral">Geral</option>
                    <option value="Aluguel">Aluguel</option>
                    <option value="Energia/Água">Energia/Água</option>
                    <option value="Peças">Peças</option>
                    <option value="Salários">Salários</option>
                    <option value="Impostos">Impostos</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={!canManageFinancial}
                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
