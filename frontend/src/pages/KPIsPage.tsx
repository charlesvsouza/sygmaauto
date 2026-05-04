import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { commissionsApi, inventoryApi, reportsApi, serviceOrdersApi } from '../api/client';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Gauge,
  Loader2,
  Package,
  RefreshCw,
  Timer,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../lib/utils';

const money = (v: number) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const pct = (v: number) => `${Number(v ?? 0).toFixed(1)}%`;

type PeriodKey = 'mesAtual' | 'trimestre' | 'semestre' | 'semestreAnterior' | 'anual';

const PERIOD_KEYS: PeriodKey[] = ['mesAtual', 'trimestre', 'semestre', 'semestreAnterior', 'anual'];

const STATUS_GROUPS = {
  entrada: ['ABERTA', 'EM_DIAGNOSTICO'],
  orcamento: ['ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO', 'REPROVADO'],
  execucao: ['APROVADO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO'],
  pronto: ['PRONTO_ENTREGA', 'FATURADO', 'ENTREGUE'],
};

const STATUS_LABEL: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_DIAGNOSTICO: 'Diagnóstico',
  ORCAMENTO_PRONTO: 'Orçamento pronto',
  AGUARDANDO_APROVACAO: 'Ag. aprovação',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  AGUARDANDO_PECAS: 'Ag. peças',
  EM_EXECUCAO: 'Em execução',
  PRONTO_ENTREGA: 'Pronto entrega',
  FATURADO: 'Faturado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const CLOSED_STATUSES = ['ENTREGUE', 'FATURADO', 'CANCELADO'];

function toDate(value: any): Date {
  return new Date(value);
}

function diffDays(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

export function KPIsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('mesAtual');
  const [kpiData, setKpiData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any>({ totals: { total: 0, pending: 0, paid: 0 }, leadership: [] });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [kpiRes, ordersRes, partsRes, commRes] = await Promise.all([
        reportsApi.getIndicadores(),
        serviceOrdersApi.getAll(),
        inventoryApi.getAllParts(),
        commissionsApi.getAll(),
      ]);
      setKpiData(kpiRes.data ?? null);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setParts(Array.isArray(partsRes.data) ? partsRes.data : []);
      setCommissions({
        totals: commRes.data?.totals || { total: 0, pending: 0, paid: 0 },
        leadership: Array.isArray(commRes.data?.leadership?.leaderboard) ? commRes.data.leadership.leaderboard : [],
      });
    } catch (e) {
      console.error(e);
      setError('Não foi possível carregar os KPI\'s. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const periodos = kpiData?.periodos ?? {};
  const atual = periodos[selectedPeriod] ?? {
    label: 'Período',
    receitaBruta: 0,
    receitaLiquida: 0,
    cmv: 0,
    margemBruta: 0,
    margemBrutaPerc: 0,
    despesas: 0,
    ebitda: 0,
    ebitdaPerc: 0,
    resultado: 0,
    osEntregues: 0,
    osAbertas: 0,
    ticketMedio: 0,
  };

  const periodChart = useMemo(
    () =>
      PERIOD_KEYS.map((key) => {
        const p = periodos[key] || {};
        return {
          name: p.label || key,
          receita: Number(p.receitaLiquida || 0),
          ebitda: Number(p.ebitda || 0),
          margem: Number(p.margemBrutaPerc || 0),
        };
      }),
    [periodos],
  );

  const financeiroEstrutura = [
    { name: 'Receita líquida', value: Number(atual.receitaLiquida || 0), color: '#0f766e' },
    { name: 'CMV', value: Number(atual.cmv || 0) * -1, color: '#ef4444' },
    { name: 'Despesas', value: Number(atual.despesas || 0) * -1, color: '#f97316' },
    { name: 'EBITDA', value: Number(atual.ebitda || 0), color: '#2563eb' },
  ];

  const statusCount = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o: any) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return map;
  }, [orders]);

  const funilData = [
    { name: 'Entrada', value: STATUS_GROUPS.entrada.reduce((s, st) => s + (statusCount[st] || 0), 0), color: '#818cf8' },
    { name: 'Orçamento', value: STATUS_GROUPS.orcamento.reduce((s, st) => s + (statusCount[st] || 0), 0), color: '#f59e0b' },
    { name: 'Execução', value: STATUS_GROUPS.execucao.reduce((s, st) => s + (statusCount[st] || 0), 0), color: '#06b6d4' },
    { name: 'Pronto/Entrega', value: STATUS_GROUPS.pronto.reduce((s, st) => s + (statusCount[st] || 0), 0), color: '#10b981' },
  ];

  const statusPieData = useMemo(
    () =>
      Object.entries(statusCount)
        .filter(([, value]) => Number(value) > 0)
        .map(([status, value], i) => ({
          name: STATUS_LABEL[status] || status,
          value,
          color: ['#6366f1', '#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#8b5cf6', '#64748b'][i % 7],
        })),
    [statusCount],
  );

  const aprovados = Number(statusCount.APROVADO || 0) + Number(statusCount.EM_EXECUCAO || 0) + Number(statusCount.PRONTO_ENTREGA || 0) + Number(statusCount.ENTREGUE || 0);
  const emAprovacao = Number(statusCount.ORCAMENTO_PRONTO || 0) + Number(statusCount.AGUARDANDO_APROVACAO || 0) + Number(statusCount.REPROVADO || 0);
  const taxaAprovacao = emAprovacao > 0 ? (aprovados / emAprovacao) * 100 : 0;

  const lowStock = useMemo(
    () => parts.filter((p: any) => Number(p.currentStock || 0) <= Number(p.minStock || 0)),
    [parts],
  );

  const estoqueValor = useMemo(
    () => parts.reduce((sum: number, p: any) => sum + Number(p.currentStock || 0) * Number(p.costPrice || 0), 0),
    [parts],
  );

  const riscoEstoque = useMemo(
    () =>
      lowStock
        .map((p: any) => ({
          name: p.name,
          atual: Number(p.currentStock || 0),
          minimo: Number(p.minStock || 0),
          falta: Math.max(Number(p.minStock || 0) - Number(p.currentStock || 0), 0),
        }))
        .sort((a: any, b: any) => b.falta - a.falta)
        .slice(0, 8),
    [lowStock],
  );

  const fase1 = useMemo(() => {
    const serviceLaborItems = orders.flatMap((o: any) =>
      (o.items || []).filter((i: any) => ['service', 'labor'].includes(String(i.type || '').toLowerCase())),
    );

    const horasVendidas = serviceLaborItems.reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0);
    const maoObraFaturada = serviceLaborItems.reduce((sum: number, i: any) => sum + Number(i.totalPrice ?? (Number(i.unitPrice || 0) * Number(i.quantity || 0))), 0);
    const elr = horasVendidas > 0 ? maoObraFaturada / horasVendidas : 0;
    const elrMeta = 180;

    const deliveredLike = orders
      .filter((o: any) => ['ENTREGUE', 'FATURADO'].includes(String(o.status || '')))
      .map((o: any) => ({ ...o, refDate: toDate(o.deliveredAt || o.updatedAt || o.createdAt) }))
      .sort((a: any, b: any) => a.refDate.getTime() - b.refDate.getTime());

    const byVehicle = new Map<string, any[]>();
    deliveredLike.forEach((o: any) => {
      const key = String(o.vehicleId || o.vehicle?.id || '');
      if (!key) return;
      const arr = byVehicle.get(key) || [];
      arr.push(o);
      byVehicle.set(key, arr);
    });

    let comebacks30d = 0;
    byVehicle.forEach((arr) => {
      for (let i = 1; i < arr.length; i++) {
        const d = diffDays(arr[i].refDate, arr[i - 1].refDate);
        if (d >= 0 && d <= 30) comebacks30d += 1;
      }
    });
    const retrabalhoRate = deliveredLike.length > 0 ? (comebacks30d / deliveredLike.length) * 100 : 0;

    const quoteUniverse = orders.filter((o: any) =>
      String(o.orderType || '') === 'ORCAMENTO'
      || ['ORCAMENTO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO', 'REPROVADO'].includes(String(o.status || ''))
      || o.approvalStatus,
    );
    const quoteApproved = quoteUniverse.filter((o: any) =>
      String(o.approvalStatus || '') === 'APPROVED'
      || ['APROVADO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'PRONTO_ENTREGA', 'FATURADO', 'ENTREGUE'].includes(String(o.status || '')),
    ).length;
    const quoteConversion = quoteUniverse.length > 0 ? (quoteApproved / quoteUniverse.length) * 100 : 0;

    const openOrders = orders.filter((o: any) => !CLOSED_STATUSES.includes(String(o.status || '')));
    const now = new Date();
    const agingBuckets = [
      { name: '0-24h', value: 0, color: '#22c55e' },
      { name: '24-48h', value: 0, color: '#f59e0b' },
      { name: '48-72h', value: 0, color: '#f97316' },
      { name: '>72h', value: 0, color: '#ef4444' },
    ];

    openOrders.forEach((o: any) => {
      const base = toDate(o.statusChangedAt || o.updatedAt || o.createdAt);
      const h = (now.getTime() - base.getTime()) / (1000 * 60 * 60);
      if (h < 24) agingBuckets[0].value += 1;
      else if (h < 48) agingBuckets[1].value += 1;
      else if (h < 72) agingBuckets[2].value += 1;
      else agingBuckets[3].value += 1;
    });

    const waitingParts = openOrders.filter((o: any) => String(o.status || '') === 'AGUARDANDO_PECAS');
    const withDate = waitingParts.filter((o: any) => o.expectedPartsDate);
    const onTime = withDate.filter((o: any) => toDate(o.expectedPartsDate) >= now).length;
    const overdue = withDate.length - onTime;
    const noForecast = waitingParts.length - withDate.length;
    const slaParts = withDate.length > 0 ? (onTime / withDate.length) * 100 : 0;

    return {
      elr,
      elrMeta,
      horasVendidas,
      maoObraFaturada,
      comebacks30d,
      retrabalhoRate,
      quoteUniverse: quoteUniverse.length,
      quoteApproved,
      quoteConversion,
      agingBuckets,
      waitingParts: waitingParts.length,
      onTime,
      overdue,
      noForecast,
      slaParts,
    };
  }, [orders]);

  const fase2 = useMemo(() => {
    const withSchedule = orders.filter((o: any) => Boolean(o.scheduledDate));
    const turns = {
      manha: 0,
      tarde: 0,
      noite: 0,
      semHora: 0,
    };

    withSchedule.forEach((o: any) => {
      const d = toDate(o.scheduledDate);
      if (Number.isNaN(d.getTime())) {
        turns.semHora += 1;
        return;
      }
      const h = d.getHours();
      if (h < 12) turns.manha += 1;
      else if (h < 18) turns.tarde += 1;
      else turns.noite += 1;
    });

    const agendaTurnoData = [
      { name: 'Manhã', value: turns.manha, color: '#0ea5e9' },
      { name: 'Tarde', value: turns.tarde, color: '#6366f1' },
      { name: 'Noite', value: turns.noite, color: '#8b5cf6' },
      { name: 'Sem horário', value: turns.semHora, color: '#94a3b8' },
    ];

    const delivered = orders.filter((o: any) => ['ENTREGUE', 'FATURADO'].includes(String(o.status || '')));
    const multiService = delivered.filter((o: any) => {
      const q = (o.items || []).filter((i: any) => ['service', 'labor'].includes(String(i.type || '').toLowerCase())).length;
      return q >= 2;
    }).length;
    const penetracaoServicos = delivered.length > 0 ? (multiService / delivered.length) * 100 : 0;

    const firstTimeFixRate = Math.max(0, 100 - Number(fase1.retrabalhoRate || 0));

    const now = new Date();
    const schedulePast = withSchedule.filter((o: any) => toDate(o.scheduledDate) < now);
    const noShowProxy = schedulePast.filter((o: any) =>
      ['CANCELADO', 'REPROVADO'].includes(String(o.status || '')),
    ).length;
    const noShowRate = schedulePast.length > 0 ? (noShowProxy / schedulePast.length) * 100 : 0;

    return {
      firstTimeFixRate,
      noShowRate,
      noShowProxy,
      schedulePast: schedulePast.length,
      agendaTurnoData,
      penetracaoServicos,
      multiService,
      delivered: delivered.length,
    };
  }, [orders, fase1.retrabalhoRate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 gap-3">
        <Loader2 className="animate-spin text-slate-400" />
        <span className="text-slate-500 font-semibold">Carregando painel de KPI\'s...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">KPI\'s de Gestão à Vista</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Indicadores organizados por tema para decisão rápida em concessionárias e grandes autocenters.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_KEYS.map((key) => {
            const active = selectedPeriod === key;
            const label = periodos[key]?.label || key;
            return (
              <button
                key={key}
                onClick={() => setSelectedPeriod(key)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-black transition-all border',
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                )}
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={load}
            className="px-3 py-2 rounded-xl text-xs font-black border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { title: 'Receita líquida', value: money(atual.receitaLiquida), icon: DollarSign, tone: 'text-emerald-600' },
          { title: 'Margem bruta', value: `${money(atual.margemBruta)} (${pct(atual.margemBrutaPerc)})`, icon: TrendingIcon, tone: atual.margemBruta >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { title: 'EBITDA', value: `${money(atual.ebitda)} (${pct(atual.ebitdaPerc)})`, icon: Activity, tone: atual.ebitda >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { title: 'OS entregues', value: String(atual.osEntregues || 0), icon: Gauge, tone: 'text-slate-900' },
          { title: 'Ticket médio', value: money(atual.ticketMedio), icon: BarChart3, tone: 'text-blue-600' },
        ].map((kpi) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3">
              <kpi.icon size={18} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.title}</p>
            <p className={cn('text-lg font-black mt-1', kpi.tone)}>{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Fase 1 · Indicadores de Performance Operacional</h3>
        <p className="text-xs text-slate-500 mb-4">Métricas mais usadas em gestão de concessionárias e autocenters para acompanhamento diário.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
          <InfoCard
            title="ELR (R$/hora)"
            value={`${money(fase1.elr)} / h`}
            hint={`Meta referência: ${money(fase1.elrMeta)} / h`}
            icon={DollarSign}
            tone={fase1.elr >= fase1.elrMeta ? 'green' : 'amber'}
          />
          <InfoCard
            title="Retrabalho 30d"
            value={`${fase1.comebacks30d} (${pct(fase1.retrabalhoRate)})`}
            hint="Retornos do mesmo veículo em até 30 dias"
            icon={RefreshCw}
            tone={fase1.retrabalhoRate <= 5 ? 'green' : 'amber'}
          />
          <InfoCard
            title="Conversão orçamento"
            value={`${fase1.quoteApproved}/${fase1.quoteUniverse} (${pct(fase1.quoteConversion)})`}
            hint="Orçamentos aprovados no funil"
            icon={CheckCircle2}
            tone={fase1.quoteConversion >= 55 ? 'green' : 'amber'}
          />
          <InfoCard
            title="SLA de peças"
            value={pct(fase1.slaParts)}
            hint={`${fase1.onTime} no prazo · ${fase1.overdue} atrasadas`}
            icon={Package}
            tone={fase1.slaParts >= 85 ? 'green' : 'amber'}
          />
          <InfoCard
            title="Aguardando peças"
            value={String(fase1.waitingParts)}
            hint={`${fase1.noForecast} sem previsão de entrega`}
            icon={Timer}
            tone={fase1.noForecast > 0 ? 'amber' : 'slate'}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Aging de OS em aberto</p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={fase1.agingBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [Number(v), 'OS']} />
                <Bar dataKey="value" radius={[7, 7, 0, 0]}>
                  {fase1.agingBuckets.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Composição financeira da hora vendida</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard
                title="Horas vendidas"
                value={Number(fase1.horasVendidas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                hint="Serviços e mão de obra lançados"
                icon={Gauge}
              />
              <InfoCard
                title="Mão de obra faturada"
                value={money(fase1.maoObraFaturada)}
                hint="Base para cálculo do ELR"
                icon={BarChart3}
                tone="blue"
              />
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 font-medium">
              Interpretação rápida:
              {fase1.elr >= fase1.elrMeta
                ? ' ELR acima da meta de referência, boa captura de valor por hora técnica.'
                : ' ELR abaixo da meta de referência, revisar precificação, descontos e mix de serviços.'}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Fase 2 · Qualidade e Agenda</h3>
        <p className="text-xs text-slate-500 mb-4">Leituras para melhorar previsibilidade operacional e qualidade de execução.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <InfoCard
            title="First Time Fix"
            value={pct(fase2.firstTimeFixRate)}
            hint="OS resolvidas sem retorno precoce"
            icon={CheckCircle2}
            tone={fase2.firstTimeFixRate >= 92 ? 'green' : 'amber'}
          />
          <InfoCard
            title="No-show (estimado)"
            value={`${pct(fase2.noShowRate)} (${fase2.noShowProxy})`}
            hint="Proxy: agendadas no passado e canceladas/reprovadas"
            icon={AlertTriangle}
            tone={fase2.noShowRate <= 8 ? 'green' : 'amber'}
          />
          <InfoCard
            title="Penetração serviços"
            value={`${pct(fase2.penetracaoServicos)} (${fase2.multiService}/${fase2.delivered})`}
            hint="OS entregues com 2+ serviços/labores"
            icon={BarChart3}
            tone={fase2.penetracaoServicos >= 45 ? 'green' : 'amber'}
          />
          <InfoCard
            title="Base agendada"
            value={String(fase2.schedulePast)}
            hint="Agendamentos com data/hora já vencida"
            icon={Timer}
            tone="blue"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Distribuição da agenda por turno</p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={fase2.agendaTurnoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [Number(v), 'Agendamentos']} />
                <Bar dataKey="value" radius={[7, 7, 0, 0]}>
                  {fase2.agendaTurnoData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Leitura de First Time Fix</p>
              <p className="text-sm text-slate-700 font-medium">
                {fase2.firstTimeFixRate >= 92
                  ? 'Excelente estabilidade de entrega. Mantenha o padrão de diagnóstico e checklist.'
                  : 'Há espaço para reduzir retornos. Priorize checklist técnico e validação final antes da entrega.'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Leitura de No-show (estimado)</p>
              <p className="text-sm text-slate-700 font-medium">
                {fase2.noShowRate <= 8
                  ? 'Taxa controlada. Continue confirmação ativa por WhatsApp antes do horário.'
                  : 'Taxa elevada. Reforce confirmações automáticas e política de reagendamento.'}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 font-medium">
              Observação: no-show está em modo proxy (estimativa), até existir status dedicado de falta no fluxo da OS.
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Tema 1 · Financeiro</h3>
          <p className="text-xs text-slate-500 mb-4">Visão de estrutura do resultado para o período selecionado.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={financeiroEstrutura} layout="vertical" margin={{ left: 18, right: 18 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tickFormatter={(v) => `R$ ${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} width={115} />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {financeiroEstrutura.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Tema 2 · Comparativo de períodos</h3>
          <p className="text-xs text-slate-500 mb-4">Receita líquida e EBITDA para leitura de tendência.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={periodChart} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis tickFormatter={(v) => `R$ ${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: any, n: any) => [money(Number(v)), n === 'receita' ? 'Receita líquida' : 'EBITDA']} />
              <Bar dataKey="receita" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="receita" />
              <Bar dataKey="ebitda" fill="#10b981" radius={[6, 6, 0, 0]} name="ebitda" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 xl:col-span-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Tema 3 · Operações de oficina</h3>
          <p className="text-xs text-slate-500 mb-4">Fluxo de OS por etapa para gestão do gargalo operacional.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funilData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v: any) => [Number(v), 'OS']} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {funilData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoCard title="Taxa de aprovação" value={pct(taxaAprovacao)} hint="Aprovadas sobre orçamentos no funil" />
            <InfoCard title="OS abertas" value={String(atual.osAbertas || 0)} hint="Total em andamento" />
            <InfoCard title="OS entregues" value={String(atual.osEntregues || 0)} hint="Concluídas no período" />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Status da fila</h3>
          <p className="text-xs text-slate-500 mb-4">Distribuição por status atual.</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {statusPieData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => [Number(v), 'OS']} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Tema 4 · Estoque e suprimentos</h3>
          <p className="text-xs text-slate-500 mb-4">Itens com risco de ruptura e impacto no caixa.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <InfoCard title="Itens abaixo do mínimo" value={String(lowStock.length)} hint="Necessitam reposição" icon={AlertTriangle} tone="amber" />
            <InfoCard title="Valor em estoque" value={money(estoqueValor)} hint="Custo total aproximado" icon={Package} tone="blue" />
            <InfoCard title="Comissões pendentes" value={money(commissions.totals.pending)} hint="Impacto no caixa" icon={Users} tone="purple" />
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riscoEstoque}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any, n: any) => [Number(v), n === 'falta' ? 'Faltante' : 'Estoque atual']} />
              <Bar dataKey="atual" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="falta" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Tema 5 · Pessoas e performance</h3>
          <p className="text-xs text-slate-500 mb-4">Comissões como leitura rápida de produtividade técnica.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <InfoCard title="Comissão total" value={money(commissions.totals.total)} hint="Período consultado" />
            <InfoCard title="Comissão paga" value={money(commissions.totals.paid)} hint="Já liquidada" tone="green" />
            <InfoCard title="Comissão pendente" value={money(commissions.totals.pending)} hint="A pagar" tone="amber" />
          </div>

          <div className="space-y-2">
            {(commissions.leadership || []).slice(0, 6).map((p: any, idx: number) => (
              <div key={p.userId} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <span className="w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.count} OS executadas</p>
                </div>
                <span className="text-sm font-black text-emerald-600">{money(p.total)}</span>
              </div>
            ))}
            {(commissions.leadership || []).length === 0 && (
              <div className="rounded-xl border border-slate-100 p-4 text-sm text-slate-400">
                Sem dados de liderança de comissões no momento.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TrendingIcon({ size = 18 }: { size?: number }) {
  return <DollarSign size={size} />;
}

function InfoCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'slate',
}: {
  title: string;
  value: string;
  hint: string;
  icon?: any;
  tone?: 'slate' | 'green' | 'amber' | 'blue' | 'purple';
}) {
  const toneClasses: Record<string, string> = {
    slate: 'text-slate-900 bg-slate-100',
    green: 'text-emerald-700 bg-emerald-100',
    amber: 'text-amber-700 bg-amber-100',
    blue: 'text-blue-700 bg-blue-100',
    purple: 'text-purple-700 bg-purple-100',
  };

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <span className={cn('w-6 h-6 rounded-md flex items-center justify-center', toneClasses[tone])}>
            <Icon size={14} />
          </span>
        )}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <p className="text-base font-black text-slate-900 leading-tight">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
    </div>
  );
}
