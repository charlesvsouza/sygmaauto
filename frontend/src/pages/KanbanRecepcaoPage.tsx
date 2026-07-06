import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceOrdersApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  RefreshCw, Maximize2, Minimize2, Loader2,
  Car, User, Clock, AlertCircle, Monitor, AlertTriangle, Timer, ArrowLeft,
} from 'lucide-react';

const PROGRESS_STEPS = [
  { status: 'ABERTA',               short: 'Ab.',    label: 'Aberta' },
  { status: 'EM_DIAGNOSTICO',       short: 'Diag.', label: 'Diagnóstico' },
  { status: 'ORCAMENTO_PRONTO',     short: 'Orç.',  label: 'Orçamento' },
  { status: 'AGUARDANDO_APROVACAO', short: 'Apr.',  label: 'Aprovação' },
  { status: 'APROVADO',             short: 'Ok',    label: 'Aprovado' },
  { status: 'EM_EXECUCAO',          short: 'Exec.', label: 'Execução' },
  { status: 'PRONTO_ENTREGA',       short: 'Pronto',label: 'Pronto' },
];

const STATUS_META: Record<string, { label: string; dot: string; badge: string; text: string }> = {
  ABERTA:               { label: 'Aberta',           dot: 'bg-surface-500',   badge: 'bg-surface-800',      text: 'text-surface-200' },
  EM_DIAGNOSTICO:       { label: 'Diagnóstico',      dot: 'bg-indigo-400',  badge: 'bg-indigo-500/20',  text: 'text-indigo-300' },
  ORCAMENTO_PRONTO:     { label: 'Orçamento Pronto', dot: 'bg-blue-400',    badge: 'bg-blue-500/20',    text: 'text-blue-300' },
  AGUARDANDO_APROVACAO: { label: 'Ag. Aprovação',    dot: 'bg-orange-400',  badge: 'bg-orange-500/20',  text: 'text-orange-300' },
  APROVADO:             { label: 'Aprovado',          dot: 'bg-emerald-400', badge: 'bg-emerald-500/20', text: 'text-emerald-300' },
  AGUARDANDO_PECAS:     { label: 'Ag. Peças',        dot: 'bg-amber-400',   badge: 'bg-amber-500/20',   text: 'text-amber-300' },
  EM_EXECUCAO:          { label: 'Em Execução',       dot: 'bg-cyan-400',    badge: 'bg-cyan-500/20',    text: 'text-cyan-300' },
  PRONTO_ENTREGA:       { label: 'Pronto p/ Entrega',dot: 'bg-violet-400',  badge: 'bg-violet-500/20',  text: 'text-violet-300' },
};

const ACTIVE_STATUSES = [
  'ABERTA', 'EM_DIAGNOSTICO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO',
  'APROVADO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'PRONTO_ENTREGA',
];

const SUMMARY_GROUPS = [
  { key: 'entrada',   label: 'Entrada / Diag.', statuses: ['ABERTA', 'EM_DIAGNOSTICO'],                       color: 'text-indigo-400', activeBg: 'bg-indigo-500/20' },
  { key: 'orcamento', label: 'Orçamento',        statuses: ['ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO'],       color: 'text-orange-400', activeBg: 'bg-orange-500/20' },
  { key: 'execucao',  label: 'Em Execução',       statuses: ['APROVADO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO'],   color: 'text-cyan-400',   activeBg: 'bg-cyan-500/20' },
  { key: 'pronto',    label: 'Pronto',            statuses: ['PRONTO_ENTREGA'],                                 color: 'text-violet-400', activeBg: 'bg-violet-500/20' },
];

// ─── Lógica de alertas ────────────────────────────────────────────────────────
// Usa statusChangedAt quando disponível (Opção B), fallback para updatedAt/createdAt
function getStatusAgeHours(os: any): number {
  const ref = os.statusChangedAt || os.updatedAt || os.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 3_600_000;
}

type AlertLevel = 'none' | 'warning' | 'danger';

function getAlertLevel(os: any): { level: AlertLevel; reason: string } {
  const h = getStatusAgeHours(os);

  if (os.status === 'EM_DIAGNOSTICO') {
    if (h > 48) return { level: 'danger', reason: `Diagnóstico atrasado (${Math.floor(h)}h)` };
    if (h > 24) return { level: 'warning', reason: `Diagnóstico em atenção (${Math.floor(h)}h)` };
  }

  if (os.status === 'EM_EXECUCAO') {
    if (h > 72) return { level: 'danger', reason: `Serviço acima do SLA (${Math.floor(h)}h)` };
    if (h > 48) return { level: 'warning', reason: `Serviço em execução há ${Math.floor(h)}h` };
  }

  // Aguardando peças — vencida a data prevista ou >48h sem data
  if (os.status === 'AGUARDANDO_PECAS') {
    if (os.expectedPartsDate && new Date(os.expectedPartsDate) < new Date()) {
      const overH = (Date.now() - new Date(os.expectedPartsDate).getTime()) / 3_600_000;
      return { level: 'danger', reason: `Chegada de peças atrasada (${Math.floor(overH)}h)` };
    }
    if (!os.expectedPartsDate && h > 48) {
      return { level: 'warning', reason: `Aguardando peças há ${Math.floor(h)}h` };
    }
  }

  return { level: 'none', reason: '' };
}

function stepIndex(status: string) {
  if (status === 'AGUARDANDO_PECAS') return 4;
  const i = PROGRESS_STEPS.findIndex(s => s.status === status);
  return i >= 0 ? i : 0;
}

function elapsed(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 48) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`;
  return `${m}m`;
}

function urgencyClass(date: string) {
  const h = (Date.now() - new Date(date).getTime()) / 3_600_000;
  if (h > 48) return 'text-red-400';
  if (h > 24) return 'text-amber-400';
  return 'text-surface-400';
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function ReceptionCard({ os, tvMode }: { os: any; tvMode: boolean }) {
  const idx = stepIndex(os.status);
  const meta = STATUS_META[os.status] ?? { label: os.status, dot: 'bg-surface-500', badge: 'bg-surface-800', text: 'text-white' };
  const { level, reason } = getAlertLevel(os);
  const statusRefDate = os.statusChangedAt || os.updatedAt || os.createdAt;

  const alertBorder =
    level === 'danger'  ? 'border-red-500/70' :
    level === 'warning' ? 'border-amber-400/70' :
    'border-line';

  const alertPulse =
    level === 'danger' ? 'animate-pulse' : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-surface-800/60 border-2 ${alertBorder} ${alertPulse} rounded-lg p-4 space-y-3 hover:border-line transition-all`}
    >
      {/* Alerta */}
      {level !== 'none' && (
        <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black ${
          level === 'danger' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
        }`}>
          {level === 'danger' ? <AlertTriangle size={11} className="shrink-0" /> : <Timer size={11} className="shrink-0" />}
          {reason}
        </div>
      )}
      {/* Header: veículo + badge + tempo */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-surface-800/80 flex items-center justify-center shrink-0">
            <Car size={17} className="text-surface-400" />
          </div>
          <div className="min-w-0">
            <p className={`font-black text-white truncate leading-tight ${tvMode ? 'text-lg' : 'text-sm'}`}>
              {os.vehicle?.brand} {os.vehicle?.model}
            </p>
            <p className="text-surface-400 text-xs font-mono tracking-wide">{os.vehicle?.plate}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge} ${meta.text}`}>
            {meta.label}
          </span>
          <span className={`text-xs flex items-center gap-1 font-medium ${urgencyClass(statusRefDate)}`}>
            <Clock size={10} /> {elapsed(statusRefDate)}
          </span>
        </div>
      </div>

      {/* Cliente + número */}
      <div className="flex items-center gap-1.5">
        <User size={11} className="text-surface-400 shrink-0" />
        <span className="text-surface-200 text-xs truncate flex-1">{os.customer?.name}</span>
        <span className="text-surface-500 text-xs font-mono shrink-0">#{os.id.slice(-6).toUpperCase()}</span>
      </div>

      {/* Queixa */}
      {os.complaint && (
        <p className="text-surface-400 text-xs truncate italic">"{os.complaint}"</p>
      )}

      {/* Barra de progresso */}
      <div className="pt-0.5">
        <div className="flex items-center">
          {PROGRESS_STEPS.map((step, i) => (
            <div key={step.status} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 ${
                  i < idx ? 'bg-emerald-500' :
                  i === idx ? `${meta.dot} ring-2 ring-line ring-offset-1 ring-offset-surface-800 scale-125` :
                  'bg-surface-800'
                }`}
              />
              {i < PROGRESS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-0.5 rounded-full ${i < idx ? 'bg-emerald-500' : 'bg-surface-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Rótulos abaixo dos pontos */}
        <div className="flex items-start mt-1.5">
          {PROGRESS_STEPS.map((step, i) => (
            <div key={step.status} className="flex-1 last:flex-none min-w-0 text-center">
              <span className={`text-[8px] leading-none block truncate ${
                i === idx ? `font-bold ${meta.text}` :
                i < idx ? 'text-emerald-400' :
                'text-surface-500'
              }`}>
                {step.short}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export function KanbanRecepcaoPage() {
  const navigate = useNavigate();
  const { tenant } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tvMode, setTvMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [filterKey, setFilterKey] = useState<string>('TODOS');
  const [autoView, setAutoView] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoViewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ROTATION_KEYS = SUMMARY_GROUPS.map((g) => g.key);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await serviceOrdersApi.getAll();
      const active = res.data.filter((o: any) => ACTIVE_STATUSES.includes(o.status));
      setOrders(active);
      setLastRefresh(new Date());
      setError(null);
    } catch {
      setError('Erro ao carregar ordens de serviço');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!autoView) {
      if (autoViewIntervalRef.current) {
        clearInterval(autoViewIntervalRef.current);
        autoViewIntervalRef.current = null;
      }
      return;
    }

    // Ao ativar, começa na primeira perspectiva para manter previsibilidade visual.
    setFilterKey(ROTATION_KEYS[0]);

    autoViewIntervalRef.current = setInterval(() => {
      setFilterKey((prev) => {
        const currentIndex = ROTATION_KEYS.indexOf(prev);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % ROTATION_KEYS.length : 0;
        return ROTATION_KEYS[nextIndex];
      });
    }, 120_000);

    return () => {
      if (autoViewIntervalRef.current) {
        clearInterval(autoViewIntervalRef.current);
        autoViewIntervalRef.current = null;
      }
    };
  }, [autoView]);

  const displayed = filterKey === 'TODOS'
    ? orders
    : orders.filter(o => {
        const g = SUMMARY_GROUPS.find(g => g.key === filterKey);
        return g ? g.statuses.includes(o.status) : false;
      });

  const prontos = orders.filter(o => o.status === 'PRONTO_ENTREGA').length;

  return (
    <div data-theme="dark" className="min-h-screen flex flex-col bg-surface-950">
      {/* Header */}
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 border-b border-line ${tvMode ? 'py-4' : 'py-3'}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-0.5 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-line bg-ink/5 text-surface-200 hover:text-white hover:bg-ink/5 transition-all shrink-0"
            aria-label="Voltar para dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <Monitor className="text-purple-400 w-5 h-5 mt-2 shrink-0" />
          <div>
            <h1 className={`font-black text-white ${tvMode ? 'text-2xl' : 'text-lg'}`}>
              Painel de Recepção
            </h1>
            <p className="text-surface-400 text-xs">
              {tenant?.name} · {orders.length} veículo{orders.length !== 1 ? 's' : ''} em serviço · atualizado {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            onClick={() => load(false)}
            className="p-2 text-surface-400 hover:text-white hover:bg-ink/5 rounded-xl transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <button
            onClick={() => setAutoView((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${autoView ? 'bg-cyan-500/20 text-cyan-300' : 'bg-ink/5 text-surface-400 hover:text-white'}`}
            title="Alterna automaticamente entre as 4 perspectivas a cada 2 minutos"
          >
            <RefreshCw size={14} className={autoView ? 'animate-spin' : ''} />
            {autoView ? 'Rotação 2min: ON' : 'Rotação 2min: OFF'}
          </button>
          <button
            onClick={() => setTvMode(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${tvMode ? 'bg-purple-500/20 text-purple-400' : 'bg-ink/5 text-surface-400 hover:text-white'}`}
          >
            {tvMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {tvMode ? 'Sair do modo TV' : 'Modo TV'}
          </button>
        </div>
      </div>

      {/* Faixa de filtros / resumo */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-line overflow-x-auto">
        <button
          onClick={() => setFilterKey('TODOS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${filterKey === 'TODOS' ? 'bg-ink/5 text-white' : 'text-surface-400 hover:text-white hover:bg-ink/5'}`}
        >
          Todos
          <span className="bg-ink/5 px-1.5 py-0.5 rounded-full font-black text-white">{orders.length}</span>
        </button>

        {SUMMARY_GROUPS.map(g => {
          const count = orders.filter(o => g.statuses.includes(o.status)).length;
          const active = filterKey === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setFilterKey(active ? 'TODOS' : g.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${active ? `${g.activeBg} ${g.color}` : 'text-surface-400 hover:text-white hover:bg-ink/5'}`}
            >
              {g.label}
              <span className={`px-1.5 py-0.5 rounded-full font-black ${count > 0 ? `${g.activeBg} ${g.color}` : 'bg-ink/5 text-surface-500'}`}>
                {count}
              </span>
            </button>
          );
        })}

        {prontos > 0 && (
          <div className="ml-auto flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg shrink-0">
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <span className="text-violet-300 text-xs font-bold">
              {prontos} pronto{prontos !== 1 ? 's' : ''} p/ retirada
            </span>
          </div>
        )}

        {/* Alertas ativos */}
        {(() => {
          const alertCount = orders.filter(o => getAlertLevel(o).level !== 'none').length;
          return alertCount > 0 ? (
            <div className={`${prontos > 0 ? '' : 'ml-auto'} flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg shrink-0 animate-pulse`}>
              <AlertTriangle size={13} className="text-red-400" />
              <span className="text-red-300 text-xs font-bold">
                {alertCount} alerta{alertCount !== 1 ? 's' : ''} ativo{alertCount !== 1 ? 's' : ''}
              </span>
            </div>
          ) : null;
        })()}
      </div>

      {/* Erro */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-6 mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-sm">
            <AlertCircle size={15} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grade de cards */}
      {loading && orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-surface-500">
          <Car size={48} />
          <p className="text-sm">Nenhum veículo em serviço no momento</p>
        </div>
      ) : (
        <div className="flex-1 p-4 overflow-y-auto">
          <div className={`grid gap-3 ${
            tvMode
              ? 'grid-cols-2 xl:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            <AnimatePresence>
              {displayed.map(os => (
                <ReceptionCard key={os.id} os={os} tvMode={tvMode} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
