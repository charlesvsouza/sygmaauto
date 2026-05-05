import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { serviceOrdersApi } from '../api/client';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Percent,
  RefreshCw,
  Timer,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const FLOW_STATUSES = [
  'ABERTA',
  'DESMONTAGEM',
  'METROLOGIA',
  'ORCAMENTO_RETIFICA',
  'AGUARDANDO_APROVACAO_RETIFICA',
  'APROVADO',
  'EM_RETIFICA',
  'MONTAGEM',
  'TESTE_FINAL',
  'PRONTO_ENTREGA',
] as const;

const RETIFICA_RELEVANT_STATUSES = [
  ...FLOW_STATUSES,
  'ENTREGUE',
  'FATURADO',
  'CANCELADO',
  'REPROVADO',
] as const;

const PHASE_LABEL: Record<string, string> = {
  ABERTA: 'Recebido',
  DESMONTAGEM: 'Desmontagem',
  METROLOGIA: 'Metrologia',
  ORCAMENTO_RETIFICA: 'Orc. Tecnico',
  AGUARDANDO_APROVACAO_RETIFICA: 'Ag. Aprovacao',
  APROVADO: 'Aprovado',
  EM_RETIFICA: 'Em Retifica',
  MONTAGEM: 'Montagem',
  TESTE_FINAL: 'Teste Final',
  PRONTO_ENTREGA: 'Pronto Entrega',
  ENTREGUE: 'Entregue',
  FATURADO: 'Faturado',
  CANCELADO: 'Cancelado',
  REPROVADO: 'Reprovado',
};

const PHASE_COLOR: Record<string, string> = {
  ABERTA: '#64748b',
  DESMONTAGEM: '#f97316',
  METROLOGIA: '#3b82f6',
  ORCAMENTO_RETIFICA: '#6366f1',
  AGUARDANDO_APROVACAO_RETIFICA: '#f59e0b',
  APROVADO: '#10b981',
  EM_RETIFICA: '#06b6d4',
  MONTAGEM: '#8b5cf6',
  TESTE_FINAL: '#ec4899',
  PRONTO_ENTREGA: '#22c55e',
  ENTREGUE: '#16a34a',
  FATURADO: '#0f766e',
  CANCELADO: '#dc2626',
  REPROVADO: '#b91c1c',
};

const PHASE_SLA_HOURS: Record<string, { warn: number; danger: number }> = {
  ABERTA: { warn: 4, danger: 8 },
  DESMONTAGEM: { warn: 8, danger: 24 },
  METROLOGIA: { warn: 12, danger: 48 },
  ORCAMENTO_RETIFICA: { warn: 24, danger: 72 },
  AGUARDANDO_APROVACAO_RETIFICA: { warn: 48, danger: 120 },
  APROVADO: { warn: 2, danger: 6 },
  EM_RETIFICA: { warn: 48, danger: 120 },
  MONTAGEM: { warn: 12, danger: 36 },
  TESTE_FINAL: { warn: 4, danger: 12 },
  PRONTO_ENTREGA: { warn: 24, danger: 72 },
};

const PERIODS = [
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: '90d', label: '90 dias', days: 90 },
] as const;

type PeriodKey = (typeof PERIODS)[number]['key'];

function hoursSince(dateLike: string | undefined) {
  if (!dateLike) return 0;
  const ms = Date.now() - new Date(dateLike).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

function fmtHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return '0h';
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const rem = Math.round(hours % 24);
    return `${days}d ${rem}h`;
  }
  return `${hours.toFixed(1)}h`;
}

function dateRef(os: any) {
  return new Date(os.deliveredAt || os.updatedAt || os.createdAt);
}

export function DashboardRetificaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState<PeriodKey>('30d');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await serviceOrdersApi.getAll();
      const allOrders = Array.isArray(res.data) ? res.data : [];
      const relevant = allOrders.filter(
        (o: any) =>
          o.orderType === 'RETIFICA_MOTOR' &&
          RETIFICA_RELEVANT_STATUSES.includes(o.status),
      );
      setOrders(relevant);
    } catch (e) {
      console.error(e);
      setError('Nao foi possivel carregar o dashboard da retifica.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedDays = useMemo(
    () => PERIODS.find((p) => p.key === period)?.days ?? 30,
    [period],
  );

  const periodCutoff = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (selectedDays - 1));
    return d;
  }, [selectedDays]);

  const statusCount = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o: any) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const flowOrders = useMemo(
    () => orders.filter((o: any) => FLOW_STATUSES.includes(o.status)),
    [orders],
  );

  const motoresEmFluxo = flowOrders.length;

  const phaseAvgHours = useMemo(() => {
    const acc: Record<string, { sum: number; count: number }> = {};
    FLOW_STATUSES.forEach((st) => {
      acc[st] = { sum: 0, count: 0 };
    });

    flowOrders.forEach((o: any) => {
      const h = hoursSince(o.statusChangedAt || o.updatedAt || o.createdAt);
      const bucket = acc[o.status];
      if (!bucket) return;
      bucket.sum += h;
      bucket.count += 1;
    });

    return FLOW_STATUSES.map((status) => {
      const b = acc[status];
      const avg = b.count > 0 ? b.sum / b.count : 0;
      return {
        status,
        name: PHASE_LABEL[status],
        avgHours: avg,
      };
    });
  }, [flowOrders]);

  const tempoMedioGeralHoras = useMemo(() => {
    if (!flowOrders.length) return 0;
    const total = flowOrders.reduce(
      (sum: number, o: any) => sum + hoursSince(o.statusChangedAt || o.updatedAt || o.createdAt),
      0,
    );
    return total / flowOrders.length;
  }, [flowOrders]);

  const taxaAprovacao = useMemo(() => {
    const approvedStatuses = [
      'APROVADO',
      'EM_RETIFICA',
      'MONTAGEM',
      'TESTE_FINAL',
      'PRONTO_ENTREGA',
      'ENTREGUE',
      'FATURADO',
    ];
    const rejectedStatuses = ['REPROVADO'];

    const aprovados = orders.filter((o: any) => approvedStatuses.includes(o.status)).length;
    const reprovados = orders.filter((o: any) => rejectedStatuses.includes(o.status)).length;
    const decisoes = aprovados + reprovados;

    return {
      value: decisoes > 0 ? (aprovados / decisoes) * 100 : 0,
      aprovados,
      reprovados,
      pendentes: Number(statusCount.AGUARDANDO_APROVACAO_RETIFICA || 0),
    };
  }, [orders, statusCount]);

  const motoresEntreguesPeriodo = useMemo(() => {
    return orders.filter((o: any) => {
      if (!['ENTREGUE', 'FATURADO'].includes(o.status)) return false;
      return dateRef(o) >= periodCutoff;
    }).length;
  }, [orders, periodCutoff]);

  const fluxoPorFaseChart = useMemo(
    () =>
      FLOW_STATUSES.map((status) => ({
        status,
        name: PHASE_LABEL[status],
        total: Number(statusCount[status] || 0),
        color: PHASE_COLOR[status],
      })),
    [statusCount],
  );

  const tempoPorFaseChart = useMemo(
    () =>
      phaseAvgHours.map((row) => ({
        ...row,
        color: PHASE_COLOR[row.status],
      })),
    [phaseAvgHours],
  );

  const acoesCriticas = useMemo(() => {
    const rows = flowOrders
      .map((o: any) => {
        const h = hoursSince(o.statusChangedAt || o.updatedAt || o.createdAt);
        const sla = PHASE_SLA_HOURS[o.status];
        const level = !sla ? 'none' : h >= sla.danger ? 'danger' : h >= sla.warn ? 'warning' : 'none';
        const motorLabel = !o.vehicleId && !o.vehicle
          ? `${o.motorBrand || 'Motor'} ${o.motorModel || ''}`.trim()
          : `${o.vehicle?.brand || ''} ${o.vehicle?.model || ''}`.trim() || 'Veiculo sem identificacao';

        return {
          id: o.id,
          shortId: String(o.id).slice(-6).toUpperCase(),
          customer: o.customer?.name || 'Cliente nao informado',
          status: o.status,
          statusLabel: PHASE_LABEL[o.status] || o.status,
          elapsedHours: h,
          elapsedText: fmtHours(h),
          level,
          reason:
            level === 'danger'
              ? `SLA critico: ${Math.floor(h)}h na fase`
              : level === 'warning'
                ? `Atencao: ${Math.floor(h)}h na fase`
                : '',
          motorLabel,
        };
      })
      .filter((r) => r.level !== 'none')
      .sort((a, b) => b.elapsedHours - a.elapsedHours);

    return rows.slice(0, 8);
  }, [flowOrders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="animate-spin" size={20} />
          Carregando dashboard de retifica...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 p-5"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Dashboard Retifica</h1>
              <p className="text-slate-400 text-sm mt-1">
                Monitoramento operacional completo: fluxo, tempo por fase, aprovacao tecnica e entregas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    period === p.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={load}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-bold"
              >
                <RefreshCw size={13} /> Atualizar
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <MetricCard
            title="Motores em fluxo"
            value={String(motoresEmFluxo)}
            subtitle="Total nas fases ativas de retifica"
            icon={<Activity size={16} />}
            tone="blue"
          />
          <MetricCard
            title="Tempo medio por fase"
            value={fmtHours(tempoMedioGeralHoras)}
            subtitle="Media atual considerando statusChangedAt"
            icon={<Clock3 size={16} />}
            tone="amber"
          />
          <MetricCard
            title="Taxa aprovacao tecnica"
            value={`${taxaAprovacao.value.toFixed(1)}%`}
            subtitle={`${taxaAprovacao.aprovados} aprovados · ${taxaAprovacao.reprovados} reprovados · ${taxaAprovacao.pendentes} pendentes`}
            icon={<Percent size={16} />}
            tone="emerald"
          />
          <MetricCard
            title="Motores entregues"
            value={String(motoresEntreguesPeriodo)}
            subtitle={`Ultimos ${selectedDays} dias (ENTREGUE/FATURADO)`}
            icon={<CheckCircle2 size={16} />}
            tone="violet"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartShell title="Motores em fluxo por fase" hint="Volume atual por etapa do Kanban Retifica">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fluxoPorFaseChart} margin={{ top: 8, right: 10, left: 0, bottom: 26 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  angle={-20}
                  textAnchor="end"
                  height={58}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {fluxoPorFaseChart.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell title="Tempo medio atual por fase" hint="Media em horas de permanencia por etapa">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tempoPorFaseChart} margin={{ top: 8, right: 10, left: 0, bottom: 26 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  angle={-20}
                  textAnchor="end"
                  height={58}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `${Number(v).toFixed(0)}h`} />
                <Tooltip
                  formatter={(value) => `${Number(value ?? 0).toFixed(1)}h`}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                />
                <Bar dataKey="avgHours" radius={[6, 6, 0, 0]}>
                  {tempoPorFaseChart.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-black text-white">Acoes Prioritarias</h3>
              <p className="text-xs text-slate-400">Motores com tempo acima do SLA da fase atual.</p>
            </div>
            <button
              onClick={() => navigate('/kanban-retifica')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-xs font-black text-white"
            >
              Ir para Kanban Retifica
            </button>
          </div>

          {!acoesCriticas.length ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200 text-sm">
              Nenhum motor em estado de atencao critica no momento.
            </div>
          ) : (
            <div className="space-y-2">
              {acoesCriticas.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 ${
                    item.level === 'danger'
                      ? 'border-red-500/40 bg-red-500/10'
                      : 'border-amber-500/40 bg-amber-500/10'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-black text-white">
                      <span>#{item.shortId}</span>
                      <span className="text-slate-300">{item.statusLabel}</span>
                      <span className="text-slate-400">{item.elapsedText}</span>
                    </div>
                    <p className="text-xs text-slate-300 truncate">{item.customer} • {item.motorLabel}</p>
                    <p
                      className={`text-xs mt-1 inline-flex items-center gap-1 ${
                        item.level === 'danger' ? 'text-red-300' : 'text-amber-300'
                      }`}
                    >
                      {item.level === 'danger' ? <AlertTriangle size={12} /> : <Timer size={12} />}
                      {item.reason}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/kanban-retifica')}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                  >
                    Tratar no Kanban
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-slate-300 text-sm font-bold mb-2">
            <Wrench size={14} className="text-cyan-400" />
            Leitura operacional
          </div>
          <p className="text-slate-400 text-sm">
            O painel usa ordens do tipo RETIFICA_MOTOR com status do fluxo da retifica. O tempo medio por fase
            considera o campo statusChangedAt (fallback para updatedAt/criatedAt), permitindo detectar gargalos no
            processo tecnico antes do prazo estourar.
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'blue' | 'amber' | 'emerald' | 'violet';
}) {
  const toneClass: Record<typeof tone, string> = {
    blue: 'from-blue-500/20 to-blue-700/5 border-blue-500/30 text-blue-300',
    amber: 'from-amber-500/20 to-amber-700/5 border-amber-500/30 text-amber-300',
    emerald: 'from-emerald-500/20 to-emerald-700/5 border-emerald-500/30 text-emerald-300',
    violet: 'from-violet-500/20 to-violet-700/5 border-violet-500/30 text-violet-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-gradient-to-br p-4 ${toneClass[tone]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-black uppercase tracking-widest opacity-80">{title}</p>
        <span>{icon}</span>
      </div>
      <p className="text-2xl font-black leading-none text-white">{value}</p>
      <p className="text-xs mt-2 opacity-80">{subtitle}</p>
    </motion.div>
  );
}

function ChartShell({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-black text-white">{title}</h3>
      <p className="text-xs text-slate-400 mb-3">{hint}</p>
      {children}
    </div>
  );
}
