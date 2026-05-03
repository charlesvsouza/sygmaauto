import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportsApi, tenantsApi } from '../api/client';
import {
  FileText,
  BarChart3,
  Users,
  ShoppingCart,
  Loader2,
  Printer,
  X,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Activity,
  DollarSign,
} from 'lucide-react';
import { cn } from '../lib/utils';

/* ─── print styles ─────────────────────────────────────────────────────────── */
const PRINT_STYLE = `
@media screen { #rpt-print-doc { display: none !important; } }
@media print {
  body * { visibility: hidden; }
  #rpt-print-doc, #rpt-print-doc * { visibility: visible; }
  #rpt-print-doc { position: absolute; left: 0; top: 0; width: 100%; background: white; }
  @page { size: A4; margin: 12mm 14mm; }
}
.rpt { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 10pt; color: #111; width: 100%; }
.rpt table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.rpt td, .rpt th { border: 1px solid #ccc; padding: 5px 8px; font-size: 9pt; vertical-align: middle; }
.rpt .hdr { background: #1e293b !important; color: #fff !important; border-color: #1e293b !important; font-weight: bold; text-transform: uppercase; font-size: 9pt; letter-spacing: .05em; }
.rpt .sub-hdr { background: #f1f5f9 !important; font-weight: bold; font-size: 9pt; }
.rpt .total-row { background: #f0fdf4 !important; font-weight: bold; }
.rpt .critical { color: #dc2626; font-weight: bold; }
.rpt .urgent   { color: #d97706; font-weight: bold; }
.rpt .attention{ color: #2563eb; font-weight: bold; }
.rpt hr { border: none; border-top: 1.5px solid #333; margin: 6px 0; }
.rpt .kpi-grid { display: flex; gap: 8px; margin-bottom: 10px; }
.rpt .kpi { flex: 1; border: 1px solid #ccc; padding: 8px 10px; text-align: center; }
.rpt .kpi-label { font-size: 7.5pt; color: #555; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
.rpt .kpi-value { font-size: 14pt; font-weight: 900; }
`;

/* ─── helpers ───────────────────────────────────────────────────────────────── */
const fmtBR = (v: number, dec = 2) =>
  Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');

const STATUS_LABEL: Record<string, string> = {
  ABERTA: 'Aberta', EM_DIAGNOSTICO: 'Em Diagnóstico', ORCAMENTO_PRONTO: 'Orçamento Pronto',
  AGUARDANDO_APROVACAO: 'Ag. Aprovação', APROVADO: 'Aprovado', REPROVADO: 'Reprovado',
  AGUARDANDO_PECAS: 'Ag. Peças', EM_EXECUCAO: 'Em Execução', PRONTO_ENTREGA: 'Pronto Entrega',
  FATURADO: 'Faturado', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
};

type ReportType = 'os' | 'dre' | 'commissions' | 'purchase';

const REPORT_TYPES = [
  {
    id: 'os' as ReportType,
    icon: FileText,
    label: 'Ordens de Serviço',
    desc: 'Produção por período, faturamento, ticket médio e top clientes.',
    color: 'blue',
  },
  {
    id: 'dre' as ReportType,
    icon: BarChart3,
    label: 'DRE — Resultado',
    desc: 'Receita bruta, CMV, margem bruta, despesas e EBITDA do mês.',
    color: 'emerald',
  },
  {
    id: 'commissions' as ReportType,
    icon: Users,
    label: 'Comissões',
    desc: 'Desempenho individual de mecânicos, ranking e totais a pagar.',
    color: 'purple',
  },
  {
    id: 'purchase' as ReportType,
    icon: ShoppingCart,
    label: 'Pedido de Compra',
    desc: 'Projeção de reposição baseada em estoque mínimo e giro de 90 dias.',
    color: 'amber',
  },
];

const COLOR_MAP: Record<string, string> = {
  blue:    'bg-blue-50   border-blue-200   text-blue-600',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  purple:  'bg-purple-50  border-purple-200  text-purple-600',
  amber:   'bg-amber-50   border-amber-200   text-amber-600',
};
const ICON_BG: Record<string, string> = {
  blue: 'bg-blue-600', emerald: 'bg-emerald-600', purple: 'bg-purple-600', amber: 'bg-amber-600',
};

export function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const now = new Date();

  const [type, setType] = useState<ReportType>('os');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  /* OS filters */
  const [osStart, setOsStart] = useState(firstOfMonth);
  const [osEnd, setOsEnd]     = useState(today);
  const [osStatus, setOsStatus] = useState('');

  /* DRE filters */
  const [dreYear,  setDreYear]  = useState(now.getFullYear());
  const [dreMonth, setDreMonth] = useState(now.getMonth() + 1);

  /* Commissions filters */
  const [commStart, setCommStart] = useState(firstOfMonth);
  const [commEnd,   setCommEnd]   = useState(today);
  const [commArea,  setCommArea]  = useState('');

  /* ─── generate ─────────────────────────────────────────────────────────── */
  const generate = async () => {
    setLoading(true);
    setReportData(null);
    try {
      const [tenantRes, dataRes] = await Promise.all([
        tenantsApi.getMe(),
        type === 'os'
          ? reportsApi.getOSReport({ startDate: osStart, endDate: osEnd, status: osStatus || undefined })
          : type === 'dre'
          ? reportsApi.getDRE(dreYear, dreMonth)
          : type === 'commissions'
          ? reportsApi.getCommissions({ startDate: commStart, endDate: commEnd, workshopArea: commArea || undefined })
          : reportsApi.getPurchaseProjection(),
      ]);
      setTenant(tenantRes.data);
      setReportData(dataRes.data);
    } catch (e) {
      alert('Erro ao gerar relatório. Verifique sua conexão.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  /* ─── report header (shared) ─────────────────────────────────────────────── */
  const ReportHeader = ({ title }: { title: string }) => (
    <table style={{ marginBottom: '6px' }}>
      <tbody>
        <tr>
          <td style={{ border: 'none', paddingLeft: 0, verticalAlign: 'top', width: '65%' }}>
            <div style={{ fontSize: '16pt', fontWeight: 900, lineHeight: 1.1 }}>{tenant?.name}</div>
            {tenant?.document && <div style={{ fontSize: '9pt', marginTop: '3px' }}>CNPJ: {tenant.document}</div>}
            {tenant?.address && <div style={{ fontSize: '9pt' }}>{tenant.address}</div>}
            <div style={{ fontSize: '9pt' }}>
              {tenant?.phone && `Tel: ${tenant.phone}`}
              {tenant?.phone && tenant?.email && '  |  '}
              {tenant?.email}
            </div>
          </td>
          <td style={{ border: '2px solid #1e293b', padding: '8px 12px', textAlign: 'right', verticalAlign: 'top', minWidth: '170px' }}>
            <div style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#555' }}>{title}</div>
            <div style={{ fontSize: '9pt', color: '#444', marginTop: '4px' }}>Gerado em: {new Date().toLocaleString('pt-BR')}</div>
          </td>
        </tr>
      </tbody>
    </table>
  );

  /* ─── OS report print template ─────────────────────────────────────────── */
  const OSPrintDoc = () => {
    if (!reportData) return null;
    const { orders = [], summary, statusBreakdown = {}, topCustomers = [] } = reportData;
    return (
      <div className="rpt">
        <ReportHeader title="Relatório de Ordens de Serviço" />
        <hr />
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">Total de OS</div><div className="kpi-value">{summary.total}</div></div>
          <div className="kpi"><div className="kpi-label">Faturadas/Entregues</div><div className="kpi-value">{summary.delivered}</div></div>
          <div className="kpi"><div className="kpi-label">Faturamento Total</div><div className="kpi-value" style={{ color: '#16a34a' }}>R$ {fmtBR(summary.totalRevenue)}</div></div>
          <div className="kpi"><div className="kpi-label">Ticket Médio</div><div className="kpi-value">R$ {fmtBR(summary.ticketMedio)}</div></div>
        </div>
        <table style={{ marginBottom: '10px' }}>
          <thead><tr className="hdr"><td colSpan={5}>LISTA DE ORDENS DE SERVIÇO ({osStart ? fmtDate(osStart) : '—'} a {osEnd ? fmtDate(osEnd) : '—'})</td></tr>
            <tr className="sub-hdr"><td style={{ width: '80px' }}>Abertura</td><td>Cliente</td><td>Veículo</td><td style={{ width: '130px' }}>Status</td><td style={{ width: '110px', textAlign: 'right' }}>Valor</td></tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.id}>
                <td>{fmtDate(o.createdAt)}</td>
                <td>{o.customer?.name ?? '—'}</td>
                <td>{o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model} • ${o.vehicle.plate}` : '—'}</td>
                <td>{STATUS_LABEL[o.status] ?? o.status}</td>
                <td style={{ textAlign: 'right', fontWeight: ['ENTREGUE','FATURADO'].includes(o.status) ? 'bold' : 'normal', color: ['ENTREGUE','FATURADO'].includes(o.status) ? '#16a34a' : '#111' }}>
                  {['ENTREGUE','FATURADO'].includes(o.status) ? `R$ ${fmtBR(o.totalCost)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL FATURADO</td>
              <td style={{ textAlign: 'right', fontWeight: 900 }}>R$ {fmtBR(summary.totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>
        {topCustomers.length > 0 && (
          <table>
            <thead><tr className="hdr"><td colSpan={3}>TOP CLIENTES — FATURAMENTO</td></tr>
              <tr className="sub-hdr"><td>Cliente</td><td style={{ textAlign: 'center' }}>OS</td><td style={{ textAlign: 'right' }}>Total</td></tr>
            </thead>
            <tbody>{topCustomers.map((c: any, i: number) => (
              <tr key={i}><td>{c.name}</td><td style={{ textAlign: 'center' }}>{c.count}</td><td style={{ textAlign: 'right' }}>R$ {fmtBR(c.total)}</td></tr>
            ))}</tbody>
          </table>
        )}
        <PrintFooter />
      </div>
    );
  };

  /* ─── DRE print template ────────────────────────────────────────────────── */
  const DREPrintDoc = () => {
    if (!reportData) return null;
    const { dre, periodo, detalhes, historico = [] } = reportData;
    const rows = [
      { label: '(+) Receita Bruta',         value: dre.receitaBruta,         bold: true },
      { label: '(−) Deduções / Impostos',    value: -dre.deducoes,            },
      { label: '(=) Receita Líquida',        value: dre.receitaLiquida,       bold: true, bg: '#f8fafc' },
      { label: '(−) CMV — Custo de Peças',   value: -dre.cmv,                 },
      { label: '(=) Margem Bruta',           value: dre.margemBruta,          bold: true, color: dre.margemBruta >= 0 ? '#16a34a' : '#dc2626' },
      { label: `   Margem Bruta %`,          value: null, pct: dre.margemBrutaPerc },
      { label: '(−) Despesas Operacionais',  value: -dre.despesasOperacionais },
      { label: '(=) EBITDA',                 value: dre.ebitda,               bold: true, bg: '#f0fdf4', color: dre.ebitda >= 0 ? '#16a34a' : '#dc2626' },
      { label: `   EBITDA %`,                value: null, pct: dre.ebitdaPerc },
      { label: '(=) Resultado Líquido',      value: dre.resultadoLiquido,     bold: true, color: dre.resultadoLiquido >= 0 ? '#16a34a' : '#dc2626' },
    ];
    return (
      <div className="rpt">
        <ReportHeader title={`DRE — ${periodo.label}`} />
        <hr />
        <table style={{ marginBottom: '10px', maxWidth: '420px' }}>
          <thead><tr className="hdr"><td colSpan={2}>DEMONSTRATIVO DE RESULTADO — {periodo.label?.toUpperCase()}</td></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: r.bg ?? 'transparent' }}>
                <td style={{ fontWeight: r.bold ? 'bold' : 'normal', paddingLeft: r.label.startsWith('  ') ? '20px' : undefined }}>
                  {r.label.trim()}
                </td>
                <td style={{ textAlign: 'right', fontWeight: r.bold ? 'bold' : 'normal', color: r.color ?? '#111', width: '120px' }}>
                  {r.value !== null && r.value !== undefined
                    ? `R$ ${fmtBR(Math.abs(r.value!))}`
                    : `${(r.pct ?? 0).toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {Object.keys(detalhes?.despesasPorCategoria ?? {}).length > 0 && (
          <table style={{ marginBottom: '10px', maxWidth: '380px' }}>
            <thead><tr className="hdr"><td colSpan={2}>DESPESAS POR CATEGORIA</td></tr></thead>
            <tbody>{Object.entries(detalhes.despesasPorCategoria).map(([cat, val]: any) => (
              <tr key={cat}><td>{cat}</td><td style={{ textAlign: 'right' }}>R$ {fmtBR(val)}</td></tr>
            ))}</tbody>
          </table>
        )}
        {historico.length > 0 && (
          <table>
            <thead><tr className="hdr"><td colSpan={4}>HISTÓRICO MENSAL (últimos 6 meses)</td></tr>
              <tr className="sub-hdr"><td>Mês</td><td style={{ textAlign: 'right' }}>Receita</td><td style={{ textAlign: 'right' }}>Despesa</td><td style={{ textAlign: 'right' }}>Resultado</td></tr>
            </thead>
            <tbody>{historico.map((h: any, i: number) => (
              <tr key={i}>
                <td>{h.mes}</td>
                <td style={{ textAlign: 'right', color: '#16a34a' }}>R$ {fmtBR(h.receita)}</td>
                <td style={{ textAlign: 'right', color: '#dc2626' }}>R$ {fmtBR(h.despesa)}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: h.resultado >= 0 ? '#16a34a' : '#dc2626' }}>R$ {fmtBR(h.resultado)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <PrintFooter />
      </div>
    );
  };

  /* ─── Commissions print template ────────────────────────────────────────── */
  const CommissionsPrintDoc = () => {
    if (!reportData) return null;
    const { totals, leadership } = reportData;
    return (
      <div className="rpt">
        <ReportHeader title="Relatório de Comissões" />
        <hr />
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">Total Comissões</div><div className="kpi-value">R$ {fmtBR(totals.total)}</div></div>
          <div className="kpi"><div className="kpi-label">Pendente</div><div className="kpi-value" style={{ color: '#d97706' }}>R$ {fmtBR(totals.pending)}</div></div>
          <div className="kpi"><div className="kpi-label">Pago</div><div className="kpi-value" style={{ color: '#16a34a' }}>R$ {fmtBR(totals.paid)}</div></div>
        </div>
        <table>
          <thead>
            <tr className="hdr"><td colSpan={4}>RANKING DE COMISSÕES POR COLABORADOR</td></tr>
            <tr className="sub-hdr">
              <td style={{ width: '30px' }}>#</td>
              <td>Colaborador</td>
              <td style={{ textAlign: 'center', width: '80px' }}>OS Exec.</td>
              <td style={{ textAlign: 'right', width: '120px' }}>Comissão Total</td>
            </tr>
          </thead>
          <tbody>
            {(leadership?.leaderboard ?? []).map((l: any, i: number) => (
              <tr key={l.userId} style={{ background: i === 0 ? '#fefce8' : 'transparent' }}>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: i === 0 ? '#d97706' : '#333' }}>{i + 1}°</td>
                <td style={{ fontWeight: i === 0 ? 'bold' : 'normal' }}>{l.name}</td>
                <td style={{ textAlign: 'center' }}>{l.count}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>R$ {fmtBR(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PrintFooter />
      </div>
    );
  };

  /* ─── Purchase Order print template ─────────────────────────────────────── */
  const PurchasePrintDoc = () => {
    if (!reportData) return null;
    const { items = [], summary } = reportData;
    const urgencyLabel: Record<string, string> = { CRITICO: 'CRÍTICO', URGENTE: 'URGENTE', ATENCAO: 'ATENÇÃO' };
    const urgencyClass: Record<string, string> = { CRITICO: 'critical', URGENTE: 'urgent', ATENCAO: 'attention' };
    return (
      <div className="rpt">
        <ReportHeader title="Pedido de Compra — Projeção" />
        <hr />
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">Itens p/ Repor</div><div className="kpi-value">{summary.total}</div></div>
          <div className="kpi"><div className="kpi-label">Críticos (sem estoque)</div><div className="kpi-value" style={{ color: '#dc2626' }}>{summary.criticalCount}</div></div>
          <div className="kpi"><div className="kpi-label">Urgentes</div><div className="kpi-value" style={{ color: '#d97706' }}>{summary.urgentCount}</div></div>
          <div className="kpi"><div className="kpi-label">Custo Estimado</div><div className="kpi-value">R$ {fmtBR(summary.totalEstimatedCost)}</div></div>
        </div>
        <table>
          <thead>
            <tr className="hdr"><td colSpan={7}>ITENS A REPOR — ANÁLISE DE GIRO (90 DIAS)</td></tr>
            <tr className="sub-hdr">
              <td style={{ width: '70px' }}>Prioridade</td>
              <td>Peça / Código</td>
              <td style={{ textAlign: 'center', width: '70px' }}>Estoque</td>
              <td style={{ textAlign: 'center', width: '60px' }}>Mínimo</td>
              <td style={{ textAlign: 'center', width: '80px' }}>Giro/mês</td>
              <td style={{ textAlign: 'center', width: '70px' }}>Qtd Suger.</td>
              <td style={{ textAlign: 'right', width: '100px' }}>Custo Est.</td>
            </tr>
          </thead>
          <tbody>
            {items.map((p: any) => (
              <tr key={p.id}>
                <td className={urgencyClass[p.urgency] ?? ''}>{urgencyLabel[p.urgency] ?? p.urgency}</td>
                <td>
                  <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                  {p.internalCode && <div style={{ fontSize: '8pt', color: '#666' }}>Cód: {p.internalCode}</div>}
                  {p.supplier?.name && <div style={{ fontSize: '8pt', color: '#666' }}>Forn: {p.supplier.name}</div>}
                </td>
                <td style={{ textAlign: 'center', color: p.currentStock === 0 ? '#dc2626' : '#111', fontWeight: p.currentStock === 0 ? 'bold' : 'normal' }}>{p.currentStock} {p.unit}</td>
                <td style={{ textAlign: 'center' }}>{p.minStock} {p.unit}</td>
                <td style={{ textAlign: 'center' }}>{p.avgMonthlyExit > 0 ? `~${p.avgMonthlyExit} ${p.unit}` : '—'}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{p.suggestedQty} {p.unit}</td>
                <td style={{ textAlign: 'right' }}>R$ {fmtBR(p.estimatedCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>CUSTO TOTAL ESTIMADO</td>
              <td style={{ textAlign: 'right', fontWeight: 900 }}>R$ {fmtBR(summary.totalEstimatedCost)}</td>
            </tr>
          </tfoot>
        </table>
        <PrintFooter />
      </div>
    );
  };

  const PrintFooter = () => (
    <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ borderTop: '1px solid #555', display: 'inline-block', width: '200px', marginBottom: '4px' }} />
        <br /><span style={{ fontSize: '9pt' }}>Responsável</span>
        <br /><span style={{ fontSize: '8pt', color: '#666' }}>Data: _____/_____/__________</span>
      </div>
      <div style={{ fontSize: '7pt', color: '#999', textAlign: 'right', alignSelf: 'flex-end' }}>
        Sigma Auto — Sistema de Gestão<br />
        Gerado em {new Date().toLocaleString('pt-BR')}
      </div>
    </div>
  );

  /* ─── preview content (mirror of print template, screen-optimised) ─────── */
  const PreviewContent = () => {
    if (!reportData || !tenant) return null;
    if (type === 'os') return <OSPrintDoc />;
    if (type === 'dre') return <DREPrintDoc />;
    if (type === 'commissions') return <CommissionsPrintDoc />;
    return <PurchasePrintDoc />;
  };

  /* ─── screen cards for result summary ──────────────────────────────────── */
  const ScreenSummary = () => {
    if (!reportData) return null;
    if (type === 'os') {
      const { orders = [], summary, topCustomers = [] } = reportData;
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total de OS', value: summary.total, icon: FileText, color: 'blue' },
              { label: 'Faturadas', value: summary.delivered, icon: CheckCircle2, color: 'emerald' },
              { label: 'Faturamento', value: `R$ ${fmtBR(summary.totalRevenue, 0)}`, icon: DollarSign, color: 'emerald' },
              { label: 'Ticket Médio', value: `R$ ${fmtBR(summary.ticketMedio, 0)}`, icon: TrendingUp, color: 'blue' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{k.label}</p>
                <p className="text-2xl font-black text-slate-900">{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
              <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Ordens de Serviço ({orders.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4 text-left">Abertura</th>
                  <th className="px-6 py-4 text-left">Cliente</th>
                  <th className="px-6 py-4 text-left">Veículo</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.slice(0, 50).map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-600">{fmtDate(o.createdAt)}</td>
                      <td className="px-6 py-3 font-bold text-slate-900">{o.customer?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model}` : '—'}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-500">
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className={cn('px-6 py-3 text-right font-black', ['ENTREGUE','FATURADO'].includes(o.status) ? 'text-emerald-600' : 'text-slate-300')}>
                        {['ENTREGUE','FATURADO'].includes(o.status) ? `R$ ${fmtBR(o.totalCost)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <EmptyState msg="Nenhuma OS no período selecionado." />}
            </div>
          </div>
          {topCustomers.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Top Clientes</h4>
              </div>
              <div className="divide-y divide-slate-50">
                {topCustomers.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-slate-100 rounded-lg text-xs font-black text-slate-500 flex items-center justify-center">{i + 1}</span>
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <span className="text-xs text-slate-400">{c.count} OS</span>
                    </div>
                    <span className="font-black text-emerald-600">R$ {fmtBR(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === 'dre') {
      const { dre, periodo, detalhes, historico = [] } = reportData;
      const dreRows = [
        { label: 'Receita Bruta', value: dre.receitaBruta, indent: false, highlight: false },
        { label: 'Deduções / Impostos', value: -dre.deducoes, indent: true, highlight: false },
        { label: 'Receita Líquida', value: dre.receitaLiquida, indent: false, highlight: true },
        { label: 'CMV — Custo de Peças', value: -dre.cmv, indent: true, highlight: false },
        { label: 'Margem Bruta', value: dre.margemBruta, indent: false, highlight: true },
        { label: 'Despesas Operacionais', value: -dre.despesasOperacionais, indent: true, highlight: false },
        { label: 'EBITDA', value: dre.ebitda, indent: false, highlight: true },
        { label: 'Resultado Líquido', value: dre.resultadoLiquido, indent: false, highlight: true },
      ];
      return (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
              <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">DRE — {periodo.label}</h4>
            </div>
            <div className="divide-y divide-slate-50">
              {dreRows.map((r, i) => (
                <div key={i} className={cn('flex items-center justify-between px-6 py-3', r.highlight && 'bg-slate-50/60')}>
                  <span className={cn('text-sm', r.indent ? 'pl-4 text-slate-400' : 'font-bold text-slate-900')}>{r.label}</span>
                  <span className={cn('font-black text-sm', r.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {r.value >= 0 ? '+' : '−'} R$ {fmtBR(Math.abs(r.value))}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Detalhes</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">OS entregues</span><span className="font-bold">{detalhes.osEntregues}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Receita de OS</span><span className="font-bold text-emerald-600">R$ {fmtBR(detalhes.receitaBrutaOS)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Receita manual</span><span className="font-bold">R$ {fmtBR(detalhes.receitaManual)}</span></div>
              </div>
            </div>
            {historico.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Histórico 6 meses</p>
                <div className="space-y-2">
                  {historico.map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 w-14">{h.mes}</span>
                      <div className="flex-1 mx-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', h.resultado >= 0 ? 'bg-emerald-500' : 'bg-red-400')}
                          style={{ width: `${Math.min((Math.abs(h.resultado) / Math.max(historico.map((x: any) => Math.abs(x.resultado)).reduce((a: number, b: number) => Math.max(a, b), 1))) * 100, 100)}%` }} />
                      </div>
                      <span className={cn('font-bold w-24 text-right', h.resultado >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        R$ {fmtBR(h.resultado, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === 'commissions') {
      const { totals, leadership, data = [] } = reportData;
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total', value: `R$ ${fmtBR(totals.total)}`, color: 'text-slate-900' },
              { label: 'Pendente', value: `R$ ${fmtBR(totals.pending)}`, color: 'text-amber-600' },
              { label: 'Pago', value: `R$ ${fmtBR(totals.paid)}`, color: 'text-emerald-600' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
                <p className={cn('text-2xl font-black', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
              <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Ranking de Comissões</h4>
            </div>
            <div className="divide-y divide-slate-50">
              {(leadership?.leaderboard ?? []).map((l: any, i: number) => (
                <div key={l.userId} className="flex items-center gap-4 px-6 py-4">
                  <span className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black', i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500')}>{i + 1}°</span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{l.name}</p>
                    <p className="text-xs text-slate-400">{l.count} OS executadas</p>
                  </div>
                  <span className="font-black text-emerald-600">R$ {fmtBR(l.total)}</span>
                </div>
              ))}
              {(leadership?.leaderboard ?? []).length === 0 && <EmptyState msg="Nenhuma comissão no período." />}
            </div>
          </div>
        </div>
      );
    }

    if (type === 'purchase') {
      const { items = [], summary } = reportData;
      const urgencyBadge: Record<string, string> = {
        CRITICO: 'bg-red-100 text-red-700 border-red-200',
        URGENTE: 'bg-amber-100 text-amber-700 border-amber-200',
        ATENCAO: 'bg-blue-100 text-blue-700 border-blue-200',
      };
      const urgencyLabel: Record<string, string> = { CRITICO: 'Crítico', URGENTE: 'Urgente', ATENCAO: 'Atenção' };
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Itens a Repor', value: summary.total, color: 'text-slate-900' },
              { label: 'Críticos', value: summary.criticalCount, color: 'text-red-600' },
              { label: 'Urgentes', value: summary.urgentCount, color: 'text-amber-600' },
              { label: 'Custo Estimado', value: `R$ ${fmtBR(summary.totalEstimatedCost, 0)}`, color: 'text-slate-900' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{k.label}</p>
                <p className={cn('text-2xl font-black', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
              <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Peças para Reposição</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4 text-left">Prioridade</th>
                  <th className="px-6 py-4 text-left">Peça</th>
                  <th className="px-6 py-4 text-center">Atual</th>
                  <th className="px-6 py-4 text-center">Mín.</th>
                  <th className="px-6 py-4 text-center">Giro/mês</th>
                  <th className="px-6 py-4 text-center">Sugerido</th>
                  <th className="px-6 py-4 text-right">Custo Est.</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase border', urgencyBadge[p.urgency] ?? 'bg-slate-100 text-slate-500')}>
                          {urgencyLabel[p.urgency] ?? p.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        {p.internalCode && <p className="text-xs text-slate-400">Cód: {p.internalCode}</p>}
                        {p.supplier?.name && <p className="text-xs text-slate-400">Forn: {p.supplier.name}</p>}
                      </td>
                      <td className={cn('px-6 py-3 text-center font-bold', p.currentStock === 0 ? 'text-red-600' : 'text-slate-700')}>
                        {p.currentStock} {p.unit}
                      </td>
                      <td className="px-6 py-3 text-center text-slate-500">{p.minStock} {p.unit}</td>
                      <td className="px-6 py-3 text-center text-slate-500">{p.avgMonthlyExit > 0 ? `~${p.avgMonthlyExit}` : '—'}</td>
                      <td className="px-6 py-3 text-center font-black text-slate-900">{p.suggestedQty} {p.unit}</td>
                      <td className="px-6 py-3 text-right font-black text-slate-900">R$ {fmtBR(p.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && <EmptyState msg="Estoque dentro dos parâmetros. Nenhum item necessita reposição." />}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const EmptyState = ({ msg }: { msg: string }) => (
    <div className="text-center py-16">
      <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
      <p className="text-slate-400 font-bold text-sm">{msg}</p>
    </div>
  );

  const selectedReport = REPORT_TYPES.find((r) => r.id === type)!;

  /* ─── render ────────────────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      <style>{PRINT_STYLE}</style>

      {/* Hidden print document */}
      <div id="rpt-print-doc" ref={printRef}>
        {tenant && reportData && <PreviewContent />}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
            <Activity size={14} /> Inteligência Gerencial
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
            Relatórios <span className="text-primary-600">Gerenciais</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">Selecione o tipo de relatório, configure os filtros e gere o PDF.</p>
        </div>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map((r) => {
          const Icon = r.icon;
          const active = type === r.id;
          return (
            <button
              key={r.id}
              onClick={() => { setType(r.id); setReportData(null); }}
              className={cn(
                'relative text-left p-6 rounded-[2rem] border-2 transition-all group',
                active
                  ? `${COLOR_MAP[r.color]} shadow-lg`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm',
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-md', ICON_BG[r.color])}>
                <Icon size={20} />
              </div>
              <h3 className="font-black text-slate-900 text-sm leading-tight mb-1">{r.label}</h3>
              <p className="text-xs text-slate-500 leading-snug">{r.desc}</p>
              {active && <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <Calendar size={14} /> Parâmetros — {selectedReport.label}
        </h3>

        <div className="flex flex-wrap items-end gap-4">
          {type === 'os' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Inicial</label>
                <input type="date" value={osStart} onChange={(e) => setOsStart(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Final</label>
                <input type="date" value={osEnd} onChange={(e) => setOsEnd(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                <select value={osStatus} onChange={(e) => setOsStatus(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="">Todos</option>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </>
          )}

          {type === 'dre' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês</label>
                <select value={dreMonth} onChange={(e) => setDreMonth(Number(e.target.value))}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
                    .map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ano</label>
                <select value={dreYear} onChange={(e) => setDreYear(Number(e.target.value))}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {type === 'commissions' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Inicial</label>
                <input type="date" value={commStart} onChange={(e) => setCommStart(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Final</label>
                <input type="date" value={commEnd} onChange={(e) => setCommEnd(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Área</label>
                <select value={commArea} onChange={(e) => setCommArea(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
                  <option value="">Todas</option>
                  <option value="MECANICA">Mecânica</option>
                  <option value="ELETRICA">Elétrica</option>
                  <option value="FUNILARIA_PINTURA">Funilaria e Pintura</option>
                  <option value="LAVACAO">Lavação</option>
                  <option value="HIGIENIZACAO_EMBELEZAMENTO">Higienização</option>
                </select>
              </div>
            </>
          )}

          {type === 'purchase' && (
            <p className="text-sm text-slate-500 font-medium">
              Análise automática com base nos últimos <strong>90 dias</strong> de movimentação. Não requer filtro de data.
            </p>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="h-11 px-8 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all disabled:opacity-60 flex items-center gap-2 shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>

          {reportData && (
            <>
              <button
                onClick={() => setShowPreview(true)}
                className="h-11 px-6 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-2 shrink-0"
              >
                <FileText size={16} className="text-slate-400" /> Visualizar PDF
              </button>
              <button
                onClick={handlePrint}
                className="h-11 px-6 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center gap-2 shrink-0"
              >
                <Printer size={16} className="text-slate-400" /> Imprimir
              </button>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Processando Dados...</p>
          </motion.div>
        )}
        {!loading && reportData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <ScreenSummary />
          </motion.div>
        )}
        {!loading && !reportData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <selectedReport.icon size={32} className="text-slate-300" />
            </div>
            <p className="font-black text-slate-900 text-lg">Configure e gere o relatório</p>
            <p className="text-slate-500 text-sm mt-1">Defina os parâmetros acima e clique em <strong>Gerar Relatório</strong></p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {showPreview && reportData && tenant && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
              {/* Modal header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/40 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white', ICON_BG[selectedReport.color])}>
                    <selectedReport.icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Pré-visualização — {selectedReport.label}</h3>
                    <p className="text-xs text-slate-400">Confira o relatório antes de imprimir como PDF</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrint}
                    className="h-9 px-5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                    <Printer size={14} /> Imprimir / Salvar PDF
                  </button>
                  <button onClick={() => setShowPreview(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Document preview (A4-ish) */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                <div className="bg-white rounded-xl shadow-xl p-8 mx-auto" style={{ maxWidth: '760px', fontFamily: 'Arial, sans-serif', fontSize: '10pt', color: '#111', lineHeight: 1.4 }}>
                  <PreviewContent />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
