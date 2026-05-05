import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { serviceOrdersApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  RefreshCw, Maximize2, Minimize2, Loader2,
  Cog, User, Clock, AlertCircle, Tv2, AlertTriangle, Timer, Package, Ruler, FileText,
} from 'lucide-react';
import { MetrologiaModal, type MetrologiaData, type SuggestedItem } from '../components/MetrologiaModal';
import { LaudoRetificaModal } from '../components/LaudoRetificaModal';
import { PHASE_SLA_HOURS } from '../lib/retificaConstants';

// ─── Colunas do fluxo de retífica ─────────────────────────────────────────────
const KANBAN_COLUMNS = [
  { status: 'ABERTA',                        label: 'Recebido',             color: 'border-slate-500',   bg: 'bg-slate-500/10',   dot: 'bg-slate-400' },
  { status: 'DESMONTAGEM',                   label: 'Desmontagem',          color: 'border-orange-500',  bg: 'bg-orange-500/10',  dot: 'bg-orange-400' },
  { status: 'METROLOGIA',                    label: 'Metrologia',           color: 'border-blue-500',    bg: 'bg-blue-500/10',    dot: 'bg-blue-400' },
  { status: 'ORCAMENTO_RETIFICA',            label: 'Orç. Técnico',         color: 'border-indigo-500',  bg: 'bg-indigo-500/10',  dot: 'bg-indigo-400' },
  { status: 'AGUARDANDO_APROVACAO_RETIFICA', label: 'Ag. Aprovação',        color: 'border-amber-500',   bg: 'bg-amber-500/10',   dot: 'bg-amber-400' },
  { status: 'APROVADO',                      label: 'Aprovado',             color: 'border-emerald-500', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  { status: 'EM_RETIFICA',                   label: 'Em Retífica',          color: 'border-cyan-500',    bg: 'bg-cyan-500/10',    dot: 'bg-cyan-400' },
  { status: 'MONTAGEM',                      label: 'Montagem',             color: 'border-violet-500',  bg: 'bg-violet-500/10',  dot: 'bg-violet-400' },
  { status: 'TESTE_FINAL',                   label: 'Teste Final',          color: 'border-pink-500',    bg: 'bg-pink-500/10',    dot: 'bg-pink-400' },
  { status: 'PRONTO_ENTREGA',                label: 'Pronto p/ Entrega',    color: 'border-green-500',   bg: 'bg-green-500/10',   dot: 'bg-green-400' },
];

// Avanço rápido de 1 passo
const NEXT_STATUS: Record<string, string> = {
  ABERTA:                        'DESMONTAGEM',
  DESMONTAGEM:                   'METROLOGIA',
  METROLOGIA:                    'ORCAMENTO_RETIFICA',
  ORCAMENTO_RETIFICA:            'AGUARDANDO_APROVACAO_RETIFICA',
  AGUARDANDO_APROVACAO_RETIFICA: 'APROVADO',
  APROVADO:                      'EM_RETIFICA',
  EM_RETIFICA:                   'MONTAGEM',
  MONTAGEM:                      'TESTE_FINAL',
  TESTE_FINAL:                   'PRONTO_ENTREGA',
};

const PREV_STATUS: Record<string, string> = {
  DESMONTAGEM:                   'ABERTA',
  METROLOGIA:                    'DESMONTAGEM',
  ORCAMENTO_RETIFICA:            'METROLOGIA',
  AGUARDANDO_APROVACAO_RETIFICA: 'ORCAMENTO_RETIFICA',
  APROVADO:                      'AGUARDANDO_APROVACAO_RETIFICA',
  EM_RETIFICA:                   'APROVADO',
  MONTAGEM:                      'EM_RETIFICA',
  TESTE_FINAL:                   'MONTAGEM',
  PRONTO_ENTREGA:                'TESTE_FINAL',
};



function elapsed(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

type AlertLevel = 'none' | 'warning' | 'danger';

function getAlertLevel(os: any): { level: AlertLevel; reason: string } {
  const sla = PHASE_SLA_HOURS[os.status];
  if (!sla) return { level: 'none', reason: '' };
  const h = (Date.now() - new Date(os.statusChangedAt || os.updatedAt || os.createdAt).getTime()) / 3_600_000;
  if (h >= sla.danger) return { level: 'danger', reason: `SLA crítico (${Math.floor(h)}h na fase)` };
  if (h >= sla.warn)   return { level: 'warning', reason: `Atenção: ${Math.floor(h)}h na fase` };
  return { level: 'none', reason: '' };
}

function urgencyColor(os: any) {
  const { level } = getAlertLevel(os);
  if (level === 'danger') return 'text-red-400';
  if (level === 'warning') return 'text-amber-400';
  return 'text-slate-400';
}

// ─── Card especializado para retífica ─────────────────────────────────────────
function RetificaCard({
  os,
  onAdvance,
  onRollback,
  canRollback,
  advancing,
  tvMode,
  onLaudo,
  focused,
}: {
  os: any;
  onAdvance: (id: string, nextStatus: string) => void;
  onRollback: (id: string, prevStatus: string) => void;
  advancing: string | null;
  tvMode: boolean;
  onLaudo: (os: any) => void;
  focused?: boolean;
  canRollback?: boolean;
}) {
  const next = NEXT_STATUS[os.status];
  const prev = PREV_STATUS[os.status];
  const isAdv = advancing === os.id;
  const { level, reason } = getAlertLevel(os);
  const statusRefDate = os.statusChangedAt || os.updatedAt || os.createdAt;

  // Verifica se já possui ficha de metrologia salva
  let hasMetrologia = false;
  try {
    const parsed = os.notes ? JSON.parse(os.notes) : null;
    hasMetrologia = !!parsed?.metrologia;
  } catch { /* notes não é JSON */ }

  const alertBorder =
    level === 'danger'  ? 'border-red-500/70' :
    level === 'warning' ? 'border-amber-400/70' :
    'border-white/10';

  // Determina como exibir o objeto (veículo ou motor avulso)
  const isMotorAvulso = !os.vehicleId && !os.vehicle;
  const objectLabel = isMotorAvulso
    ? (os.equipmentBrand && os.equipmentModel ? `${os.equipmentBrand} ${os.equipmentModel}` : 'Motor avulso')
    : `${os.vehicle?.brand ?? ''} ${os.vehicle?.model ?? ''}`.trim();
  const subLabel = isMotorAvulso
    ? (os.serialNumber ?? '')
    : (os.vehicle?.plate ?? '');

  return (
    <motion.div
      id={`retifica-os-${os.id}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-slate-800/60 border-2 ${focused ? 'border-cyan-300 shadow-[0_0_0_3px_rgba(34,211,238,0.25)]' : alertBorder} rounded-xl p-3 space-y-2 hover:border-white/20 transition-all ${tvMode ? 'text-sm' : 'text-xs'} ${level === 'danger' ? 'animate-pulse' : ''}`}
    >
      {focused && (
        <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black bg-cyan-500/15 text-cyan-300">
          <Timer size={11} className="shrink-0" />
          Foco vindo do Dashboard
        </div>
      )}

      {/* Alerta */}
      {level !== 'none' && (
        <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black ${
          level === 'danger' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
        }`}>
          {level === 'danger' ? <AlertTriangle size={11} className="shrink-0" /> : <Timer size={11} className="shrink-0" />}
          <span className="truncate">{reason}</span>
        </div>
      )}

      {/* Número + tempo na fase */}
      <div className="flex items-center justify-between">
        <span className={`font-black text-white ${tvMode ? 'text-base' : 'text-sm'}`}>
          #{os.id.slice(-6).toUpperCase()}
        </span>
        <span className={`flex items-center gap-1 font-semibold ${urgencyColor(os)}`}>
          <Clock size={tvMode ? 14 : 11} />
          {elapsed(statusRefDate)}
        </span>
      </div>

      {/* Motor / Veículo */}
      <div className="flex items-center gap-1.5 text-white/80">
        {isMotorAvulso
          ? <Package size={tvMode ? 14 : 11} className="shrink-0 text-amber-400" />
          : <Cog     size={tvMode ? 14 : 11} className="shrink-0 text-slate-400" />
        }
        <span className="truncate font-semibold">{objectLabel}</span>
        {subLabel && <span className="text-slate-500 shrink-0">{subLabel}</span>}
      </div>

      {/* Cliente */}
      <div className="flex items-center gap-1.5 text-slate-400">
        <User size={tvMode ? 13 : 10} className="shrink-0" />
        <span className="truncate">{os.customer?.name ?? '—'}</span>
      </div>

      {/* Queixa / Descrição */}
      {os.complaint && (
        <p className="text-slate-500 truncate leading-tight">{os.complaint}</p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1">
        {isMotorAvulso && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            <Package size={9} /> Motor avulso
          </span>
        )}
        {hasMetrologia && (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
            <Ruler size={9} /> Metrologia OK
          </span>
        )}
      </div>

      {/* Avançar + Voltar */}
      <div className={`flex gap-1.5 mt-1 ${prev && canRollback ? 'grid grid-cols-[auto_1fr]' : ''}`}>
        {prev && canRollback && (
          <button
            onClick={() => {
              if (!confirm('Retroceder para a fase anterior? Use apenas para corrigir o fluxo.')) return;
              onRollback(os.id, prev);
            }}
            disabled={isAdv}
            title="Retroceder fase"
            className="px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 font-black transition-all flex items-center justify-center gap-1 disabled:opacity-40 text-[10px]"
          >
            ←
          </button>
        )}
        {next && (
          <button
            onClick={() => onAdvance(os.id, next)}
            disabled={isAdv}
            className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {isAdv ? <Loader2 size={11} className="animate-spin" /> : <>→ Avançar</>}
          </button>
        )}
      </div>

      {/* Laudo — disponível a partir da Metrologia */}
      {hasMetrologia && (
        <button
          onClick={() => onLaudo(os)}
          className="w-full py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 font-semibold transition-all flex items-center justify-center gap-1.5 text-[10px]"
        >
          <FileText size={10} /> Laudo PDF
        </button>
      )}
    </motion.div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export function KanbanRetificaPage() {
  const { tenant, user } = useAuthStore();
  const canRollback = ['MASTER', 'ADMIN'].includes(user?.role ?? '');
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [tvMode, setTvMode]   = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [focusedOsId, setFocusedOsId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Modal de metrologia
  const [metrologiaTarget, setMetrologiaTarget] = useState<{ id: string; number: string; notes: string | null; existingDescriptions: Set<string> } | null>(null);
  // Modal de laudo
  const [laudoTarget, setLaudoTarget] = useState<any | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await serviceOrdersApi.getAll();
      // Filtra apenas OS do tipo RETIFICA_MOTOR que ainda estão em fluxo ativo
      const active = res.data.filter((o: any) =>
        o.orderType === 'RETIFICA_MOTOR' &&
        KANBAN_COLUMNS.some((c) => c.status === o.status)
      );
      setOrders(active);
      setLastRefresh(new Date());
      setError(null);
    } catch {
      setError('Erro ao carregar ordens de retífica');
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
    const osParam = searchParams.get('os');
    if (!osParam || orders.length === 0) return;

    const exists = orders.some((o) => o.id === osParam);
    if (!exists) return;

    setFocusedOsId(osParam);

    const timer = setTimeout(() => {
      const el = document.getElementById(`retifica-os-${osParam}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 120);

    const clearFocus = setTimeout(() => {
      setFocusedOsId((current) => (current === osParam ? null : current));
      const next = new URLSearchParams(searchParams);
      next.delete('os');
      setSearchParams(next, { replace: true });
    }, 12000);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearFocus);
    };
  }, [orders, searchParams, setSearchParams]);

  const handleAdvance = async (id: string, nextStatus: string) => {
    // Intercepta avanço para METROLOGIA — abre modal antes
    if (nextStatus === 'METROLOGIA') {
      const os = orders.find((o) => o.id === id);
      const existingDescriptions = new Set<string>(
        (os?.items ?? []).map((i: any) => String(i.description || i.name || '').toLowerCase())
      );
      setMetrologiaTarget({ id, number: id.slice(-6).toUpperCase(), notes: os?.notes ?? null, existingDescriptions });
      return;
    }
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

  const handleRollback = async (id: string, prevStatus: string) => {
    setAdvancing(id);
    try {
      await serviceOrdersApi.updateStatus(id, { status: prevStatus, adminOverride: true } as any);
      await load(true);
    } catch {
      setError('Erro ao retroceder status');
    } finally {
      setAdvancing(null);
    }
  };

  const handleMetrologiaSave = async (data: MetrologiaData, items: SuggestedItem[]) => {
    if (!metrologiaTarget) return;
    const { id, notes } = metrologiaTarget;
    // Mescla com notes existente (se já for JSON) ou cria novo
    let existing: Record<string, unknown> = {};
    try { if (notes) existing = JSON.parse(notes); } catch { /* ignore */ }
    const merged = JSON.stringify({ ...existing, metrologia: data });
    await serviceOrdersApi.update(id, { notes: merged });
    await serviceOrdersApi.updateStatus(id, { status: 'METROLOGIA' });
    // Adiciona itens sugeridos selecionados à OS (evita duplicação se modal for reaberto)
    const existingDescriptions = metrologiaTarget.existingDescriptions;
    for (const item of items.filter((i) => i.selected)) {
      if (existingDescriptions.has(item.description.toLowerCase())) continue;
      try {
        await serviceOrdersApi.addItem(id, {
          description: item.description,
          type: item.type === 'service' ? 'service' : 'part',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      } catch { /* ignora falha individual de item */ }
    }
    // Recarrega OS atualizada e abre laudo para impressão
    const res = await serviceOrdersApi.getById(id);
    setMetrologiaTarget(null);
    setLaudoTarget(res.data);
    await load(true);
  };

  const totalActive = orders.length;
  const activeAlerts = orders.filter((o) => getAlertLevel(o).level !== 'none').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <div className={`flex items-center justify-between px-6 border-b border-white/10 ${tvMode ? 'py-3' : 'py-4'}`}>
        <div className="flex items-center gap-3">
          <Cog className="text-amber-400 w-5 h-5" />
          <div>
            <h1 className={`font-black text-white ${tvMode ? 'text-2xl' : 'text-lg'}`}>
              Kanban — Retífica de Motores
            </h1>
            <p className="text-slate-500 text-xs">
              {tenant?.name} · {totalActive} motor{totalActive !== 1 ? 'es' : ''} em fluxo · atualizado {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {activeAlerts > 0 && (
              <p className="text-red-300 text-[11px] font-bold mt-0.5 animate-pulse">
                {activeAlerts} alerta{activeAlerts !== 1 ? 's' : ''} de SLA ativo{activeAlerts !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => load(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <button
            onClick={() => setTvMode((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${tvMode ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-slate-400 hover:text-white'}`}
          >
            {tvMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {tvMode ? 'Sair do modo TV' : 'Modo TV'}
          </button>
        </div>
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

      {/* Board */}
      {loading && orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-amber-400" size={40} />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 min-w-max" style={{ minHeight: 'calc(100vh - 80px)' }}>
            {KANBAN_COLUMNS.map((col) => {
              const colOrders = orders.filter((o) => o.status === col.status);
              return (
                <div
                  key={col.status}
                  className={`flex flex-col ${tvMode ? 'w-72' : 'w-64'} shrink-0`}
                >
                  {/* Cabeçalho */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-2 h-2 rounded-full ${col.dot} shrink-0`} />
                    <span className={`font-bold text-white truncate ${tvMode ? 'text-base' : 'text-sm'}`}>
                      {col.label}
                    </span>
                    <span className={`ml-auto text-xs font-black px-2 py-0.5 rounded-full ${col.bg} ${col.dot.replace('bg-', 'text-')}`}>
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div
                    className={`flex-1 rounded-2xl border ${col.color}/30 ${col.bg} p-2 space-y-2 overflow-y-auto`}
                    style={{ minHeight: 120 }}
                  >
                    <AnimatePresence>
                      {colOrders.length === 0 ? (
                        <div className="flex items-center justify-center h-16 text-slate-600 text-xs">
                          vazio
                        </div>
                      ) : (
                        colOrders.map((os) => (
                          <RetificaCard
                            key={os.id}
                            os={os}
                            onAdvance={handleAdvance}
                            onRollback={handleRollback}
                            canRollback={canRollback}
                            advancing={advancing}
                            tvMode={tvMode}
                            onLaudo={setLaudoTarget}
                            focused={focusedOsId === os.id}
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

      {/* Empty state global */}
      {!loading && orders.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600">
          <Cog size={40} className="opacity-30" />
          <p className="text-sm">Nenhum motor em fluxo de retífica no momento.</p>
        </div>
      )}

      {/* Modal de Laudo PDF */}
      {laudoTarget && (
        <LaudoRetificaModal
          os={laudoTarget}
          tenant={tenant}
          onClose={() => setLaudoTarget(null)}
        />
      )}

      {/* Modal de Metrologia */}
      {metrologiaTarget && (
        <MetrologiaModal
          osId={metrologiaTarget.id}
          osNumber={metrologiaTarget.number}
          onSave={handleMetrologiaSave}
          onCancel={() => setMetrologiaTarget(null)}
          initialData={(() => {
            try { return metrologiaTarget.notes ? JSON.parse(metrologiaTarget.notes)?.metrologia ?? null : null; }
            catch { return null; }
          })()}
        />
      )}
    </div>
  );
}
