import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceOrdersApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useBoardViewport } from '../hooks/useBoardViewport';
import {
  RefreshCw, Maximize2, Minimize2, Loader2,
  Car, User, Clock, AlertCircle, Tv2, AlertTriangle, Timer, ArrowLeft, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ─── Status visíveis no Kanban (exclui estados terminais) ────────────────────
const KANBAN_COLUMNS = [
  { status: 'ABERTA',               label: 'Abertas',              color: 'border-surface-600',  bg: 'bg-surface-500/10',  dot: 'bg-surface-500' },
  { status: 'EM_DIAGNOSTICO',       label: 'Diagnóstico',          color: 'border-indigo-500', bg: 'bg-indigo-500/10', dot: 'bg-indigo-400' },
  { status: 'ORCAMENTO_PRONTO',     label: 'Orçamento Pronto',     color: 'border-blue-500',   bg: 'bg-blue-500/10',   dot: 'bg-blue-400' },
  { status: 'AGUARDANDO_APROVACAO', label: 'Ag. Aprovação',        color: 'border-orange-500', bg: 'bg-orange-500/10', dot: 'bg-orange-400' },
  { status: 'APROVADO',             label: 'Aprovado',             color: 'border-emerald-500',bg: 'bg-emerald-500/10',dot: 'bg-emerald-400' },
  { status: 'AGUARDANDO_PECAS',     label: 'Ag. Peças',            color: 'border-amber-500',  bg: 'bg-amber-500/10',  dot: 'bg-amber-400' },
  { status: 'EM_EXECUCAO',          label: 'Em Execução',          color: 'border-cyan-500',   bg: 'bg-cyan-500/10',   dot: 'bg-cyan-400' },
  { status: 'PRONTO_ENTREGA',       label: 'Pronto p/ Entrega',    color: 'border-violet-500', bg: 'bg-violet-500/10', dot: 'bg-violet-400' },
];

// Próximo status disponível por coluna (para avançar com 1 clique)
const NEXT_STATUS: Record<string, string> = {
  ABERTA:               'EM_DIAGNOSTICO',
  EM_DIAGNOSTICO:       'ORCAMENTO_PRONTO',
  ORCAMENTO_PRONTO:     'AGUARDANDO_APROVACAO',
  AGUARDANDO_APROVACAO: 'APROVADO',
  APROVADO:             'EM_EXECUCAO',
  AGUARDANDO_PECAS:     'EM_EXECUCAO',
  EM_EXECUCAO:          'PRONTO_ENTREGA',
  PRONTO_ENTREGA:       'FATURADO',
};

function elapsed(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

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

function urgencyColor(date: string) {
  const h = (Date.now() - new Date(date).getTime()) / 3_600_000;
  if (h > 48) return 'text-red-600';
  if (h > 24) return 'text-amber-600';
  return 'text-surface-400';
}

// ─── Card de OS ──────────────────────────────────────────────────────────────
function KanbanCard({
  os,
  onAdvance,
  advancing,
  tvMode,
}: {
  os: any;
  onAdvance: (id: string, nextStatus: string) => void;
  advancing: string | null;
  tvMode: boolean;
}) {
  const next = NEXT_STATUS[os.status];
  const isAdv = advancing === os.id;
  const { level, reason } = getAlertLevel(os);
  const statusRefDate = os.statusChangedAt || os.updatedAt || os.createdAt;

  const alertBorder =
    level === 'danger' ? 'border-red-500/70' :
    level === 'warning' ? 'border-amber-400/70' :
    'border-line';

  const alertPulse = level === 'danger' ? 'animate-pulse' : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-panel border-2 ${alertBorder} ${alertPulse} rounded-xl p-3 space-y-2 hover:border-line transition-all ${tvMode ? 'text-sm' : 'text-xs'}`}
    >
      {level !== 'none' && (
        <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black ${
          level === 'danger' ? 'bg-red-500/20 text-red-700' : 'bg-amber-500/20 text-amber-700'
        }`}>
          {level === 'danger' ? <AlertTriangle size={11} className="shrink-0" /> : <Timer size={11} className="shrink-0" />}
          <span className="truncate">{reason}</span>
        </div>
      )}

      {/* Número da OS + tempo */}
      <div className="flex items-center justify-between">
        <span className={`font-black text-ink ${tvMode ? 'text-base' : 'text-sm'}`}>
          #{os.id.slice(-6).toUpperCase()}
        </span>
        <span className={`flex items-center gap-1 font-semibold ${urgencyColor(statusRefDate)}`}>
          <Clock size={tvMode ? 14 : 11} />
          {elapsed(statusRefDate)}
        </span>
      </div>

      {/* Veículo */}
      <div className="flex items-center gap-1.5 text-ink/80">
        <Car size={tvMode ? 14 : 11} className="shrink-0 text-surface-400" />
        <span className="truncate font-semibold">
          {os.vehicle?.brand} {os.vehicle?.model}
        </span>
        <span className="text-surface-400 shrink-0">{os.vehicle?.plate}</span>
      </div>

      {/* Cliente */}
      <div className="flex items-center gap-1.5 text-surface-400">
        <User size={tvMode ? 13 : 10} className="shrink-0" />
        <span className="truncate">{os.customer?.name}</span>
      </div>

      {/* Queixa */}
      {os.complaint && (
        <p className="text-surface-400 truncate leading-tight">{os.complaint}</p>
      )}

      {/* Botão avançar */}
      {next && (
        <button
          onClick={() => onAdvance(os.id, next)}
          disabled={isAdv}
          className="w-full mt-1 py-1.5 rounded-lg bg-ink/5 hover:bg-ink/5 text-muted hover:text-ink font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          {isAdv ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <>→ Avançar</>
          )}
        </button>
      )}
    </motion.div>
  );
}

// ─── Página Kanban ────────────────────────────────────────────────────────────
export function KanbanPage() {
  const navigate = useNavigate();
  const { tenant } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [tvMode, setTvMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isCompactViewport, boardScrollRef, getColumnWidth, getBoardFit, scrollColumns } = useBoardViewport();

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await serviceOrdersApi.getAll();
      // Filtra apenas OS ativas (não terminais)
      const active = res.data.filter((o: any) =>
        KANBAN_COLUMNS.some((c) => c.status === o.status) ||
        o.status === 'ORCAMENTO' // legado → trata como ABERTA
      );
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
    // Auto-refresh a cada 60s (ideal para TV)
    intervalRef.current = setInterval(() => load(true), 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleAdvance = async (id: string, nextStatus: string) => {
    setAdvancing(id);
    try {
      await serviceOrdersApi.updateStatus(id, { status: nextStatus });
      await load(true);
    } catch {
      setError('Erro ao avançar status');
    } finally {
      setAdvancing(null);
    }
  };

  const ordersForColumn = (status: string) =>
    orders.filter((o) =>
      o.status === status || (status === 'ABERTA' && o.status === 'ORCAMENTO')
    );

  const totalActive = orders.length;
  const activeAlerts = orders.filter((o) => getAlertLevel(o).level !== 'none').length;
  const columnWidth = getColumnWidth(tvMode);
  const boardFit = getBoardFit({
    columnCount: KANBAN_COLUMNS.length,
    columnWidth,
    tvMode,
  });

  return (
    <div className={`min-h-screen flex flex-col bg-app `}>
      {/* Header */}
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 border-b border-line ${tvMode ? 'py-3' : 'py-4'}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-0.5 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-line bg-ink/5 text-surface-200 hover:text-ink hover:bg-ink/5 transition-all shrink-0"
            aria-label="Voltar para dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <Tv2 className="text-cyan-600 w-5 h-5 mt-2 shrink-0" />
          <div>
            <h1 className={`font-black text-ink ${tvMode ? 'text-2xl' : 'text-lg'}`}>
              Kanban de Pátio
            </h1>
            <p className="text-surface-400 text-xs">
              {tenant?.name} · {totalActive} OS ativas · atualizado {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {activeAlerts > 0 && (
              <p className="text-red-700 text-[11px] font-bold mt-0.5 animate-pulse">
                {activeAlerts} alerta{activeAlerts !== 1 ? 's' : ''} de prazo ativo{activeAlerts !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isCompactViewport && !tvMode && (
            <>
              <button
                onClick={() => scrollColumns('left', columnWidth)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink/5 text-surface-200 hover:text-ink hover:bg-ink/5 transition-all text-xs font-bold"
              >
                <ChevronLeft size={14} />
                Colunas
              </button>
              <button
                onClick={() => scrollColumns('right', columnWidth)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink/5 text-surface-200 hover:text-ink hover:bg-ink/5 transition-all text-xs font-bold"
              >
                Colunas
                <ChevronRight size={14} />
              </button>
            </>
          )}
          <button
            onClick={() => load(false)}
            className="p-2 text-surface-400 hover:text-ink hover:bg-ink/5 rounded-xl transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <button
            onClick={() => setTvMode((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${tvMode ? 'bg-cyan-500/20 text-cyan-600' : 'bg-ink/5 text-surface-400 hover:text-ink'}`}
          >
            {tvMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {tvMode ? 'Sair do modo TV' : 'Modo TV'}
          </button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-6 mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-3 text-sm">
            <AlertCircle size={15} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      {loading && orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-cyan-600" size={40} />
        </div>
      ) : (
        <div
          ref={boardScrollRef}
          className={`flex-1 ${boardFit.fitEnabled ? 'overflow-hidden' : 'overflow-x-auto overflow-y-hidden'} scroll-smooth`}
          style={boardFit.wrapperStyle}
        >
          <div
            className={`flex gap-3 p-3 sm:p-4 h-full min-w-max snap-x snap-mandatory`}
            style={boardFit.fitEnabled ? boardFit.innerStyle : { minHeight: 'calc(100vh - 104px)' }}
          >
            {KANBAN_COLUMNS.map((col) => {
              const colOrders = ordersForColumn(col.status);
              return (
                <div
                  key={col.status}
                  className="flex flex-col shrink-0 snap-start"
                  style={{ width: `${columnWidth}px` }}
                >
                  {/* Column header */}
                  <div className={`flex items-center gap-2 mb-3 px-1`}>
                    <span className={`w-2 h-2 rounded-full ${col.dot} shrink-0`} />
                    <span className={`font-bold text-ink truncate ${tvMode ? 'text-base' : 'text-sm'}`}>
                      {col.label}
                    </span>
                    <span className={`ml-auto text-xs font-black px-2 py-0.5 rounded-full ${col.bg} text-ink`}>
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Column body */}
                  <div className={`flex-1 rounded-lg border ${col.color}/30 ${col.bg} p-2 space-y-2 overflow-y-auto`}
                    style={{ minHeight: 120 }}>
                    <AnimatePresence>
                      {colOrders.length === 0 ? (
                        <div className="flex items-center justify-center h-16 text-surface-500 text-xs">
                          vazio
                        </div>
                      ) : (
                        colOrders.map((os) => (
                          <KanbanCard
                            key={os.id}
                            os={os}
                            onAdvance={handleAdvance}
                            advancing={advancing}
                            tvMode={tvMode}
                          />
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
