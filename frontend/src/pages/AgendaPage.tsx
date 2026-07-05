import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { serviceOrdersApi } from '../api/client';
import { Calendar, ChevronLeft, ChevronRight, Plus, RefreshCw, Loader2 } from 'lucide-react';

// Chips de status consistentes com ServiceOrdersPage (sistema de "tone")
const STATUS_CHIPS: Record<string, string> = {
  neutral: 'bg-surface-100 text-surface-700 border border-surface-200',
  golden: 'bg-surface-900 text-white border border-transparent',
  positive: 'bg-accent/10 text-accent border border-accent/40',
  negative: 'bg-danger/10 text-red-700 border border-red-200',
};

const STATUS_TONE: Record<string, keyof typeof STATUS_CHIPS> = {
  ABERTA: 'neutral',
  EM_DIAGNOSTICO: 'golden',
  ORCAMENTO_PRONTO: 'neutral',
  AGUARDANDO_APROVACAO: 'neutral',
  APROVADO: 'positive',
  EM_EXECUCAO: 'neutral',
  AGUARDANDO_PECAS: 'neutral',
  PRONTO_ENTREGA: 'golden',
  FATURADO: 'neutral',
  ENTREGUE: 'neutral',
};

const statusChip = (status: string) => STATUS_CHIPS[STATUS_TONE[status] ?? 'neutral'];

const STATUS_LABEL: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_DIAGNOSTICO: 'Diagnóstico',
  ORCAMENTO_PRONTO: 'Orçamento',
  AGUARDANDO_APROVACAO: 'Ag. Aprovação',
  APROVADO: 'Aprovado',
  EM_EXECUCAO: 'Em Execução',
  AGUARDANDO_PECAS: 'Ag. Peças',
  PRONTO_ENTREGA: 'Pronto p/ Entrega',
  FATURADO: 'Faturado',
  ENTREGUE: 'Entregue',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDays(referenceDate: Date): Date[] {
  const day = referenceDate.getDay(); // 0=dom
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - day); // começa no domingo
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function AgendaPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semana atual

  const referenceDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => getWeekDays(referenceDate), [referenceDate]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await serviceOrdersApi.getAll();
      const all: any[] = Array.isArray(res.data) ? res.data : [];
      setOrders(all.filter((o) => o.scheduledDate));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ordersForDay = (day: Date) =>
    orders
      .filter((o) => isSameDay(new Date(o.scheduledDate), day))
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const today = new Date();
  const weekLabel = `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const totalSemana = useMemo(
    () => weekDays.reduce((acc, d) => acc + ordersForDay(d).length, 0),
    [orders, weekDays],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-surface-50 tracking-tight flex items-center gap-2">
            <Calendar className="text-accent" size={22} />
            Agenda da Semana
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">{weekLabel} · {totalSemana} OS agendada{totalSemana !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(0)} className="px-3 py-2 text-xs font-bold text-surface-300 hover:bg-ink/5 rounded-xl transition-all">
            Hoje
          </button>
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 text-surface-400 hover:bg-ink/5 rounded-xl transition-all">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 text-surface-400 hover:bg-ink/5 rounded-xl transition-all">
            <ChevronRight size={16} />
          </button>
          <button onClick={load} disabled={loading} className="p-2 text-surface-400 hover:bg-ink/5 rounded-xl transition-all disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
          <button
            onClick={() => navigate('/service-orders')}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-surface-950 rounded-xl text-xs font-bold hover:bg-accent-hover transition-all shadow-lg"
          >
            <Plus size={14} />
            Nova OS
          </button>
        </div>
      </div>

      {/* Grade semanal */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          const dayOrders = ordersForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={`rounded-lg border flex flex-col min-h-[220px] ${
                isToday
                  ? 'border-accent/40 bg-accent/10'
                  : 'border-line bg-surface-900'
              }`}
            >
              {/* Cabeçalho do dia */}
              <div className={`px-3 py-2 rounded-t-2xl border-b ${isToday ? 'border-accent/40 bg-accent/10' : 'border-line bg-surface-950/40'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-accent' : 'text-surface-500'}`}>
                  {WEEKDAYS[day.getDay()]}
                </p>
                <p className={`text-xl font-black leading-tight ${isToday ? 'text-accent' : 'text-surface-100'}`}>
                  {day.getDate()}
                </p>
                {dayOrders.length > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isToday ? 'bg-accent/20 text-accent' : 'bg-surface-800 text-surface-300'}`}>
                    {dayOrders.length}
                  </span>
                )}
              </div>

              {/* Itens do dia */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {dayOrders.length === 0 && (
                  <p className="text-[10px] text-surface-600 text-center mt-4">—</p>
                )}
                {dayOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => navigate('/service-orders')}
                    className="w-full text-left rounded-xl p-2 bg-surface-900 border border-line hover:border-line hover:shadow-sm transition-all"
                  >
                    <p className="text-[10px] font-black text-surface-400 mb-0.5">{fmtTime(o.scheduledDate)}</p>
                    <p className="text-[11px] font-bold text-surface-100 leading-tight truncate">{o.customer?.name || 'Cliente'}</p>
                    <p className="text-[10px] text-surface-500 truncate">
                      {o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model}` : (o.equipmentBrand || 'Sem veículo')}
                    </p>
                    <span className={`mt-1 inline-block text-[8px] font-black px-1.5 py-0.5 rounded-full ${statusChip(o.status)}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista consolidada */}
      {totalSemana > 0 && (
        <div className="bg-surface-900 rounded-xl border border-line shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-line">
            <h3 className="text-sm font-black text-surface-50 uppercase tracking-widest">Lista da Semana</h3>
          </div>
          <div className="divide-y divide-line">
            {weekDays.flatMap((day) =>
              ordersForDay(day).map((o) => (
                <div
                  key={o.id}
                  onClick={() => navigate('/service-orders')}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-ink/5 cursor-pointer transition-colors"
                >
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-xs font-black text-surface-200">
                      {WEEKDAYS[day.getDay()]}, {day.getDate()}/{day.getMonth() + 1}
                    </p>
                    <p className="text-[11px] text-accent font-bold">{fmtTime(o.scheduledDate)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-surface-100 truncate">{o.customer?.name || 'Cliente'}</p>
                    <p className="text-xs text-surface-500 truncate">
                      {o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model} — ${o.vehicle.plate}` : (o.equipmentBrand || 'Sem veículo')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${statusChip(o.status)}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                    <span className="text-[10px] font-mono font-black text-surface-500">#{o.id.slice(-5).toUpperCase()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {!loading && totalSemana === 0 && (
        <div className="text-center py-16 text-surface-500">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Nenhum agendamento nesta semana</p>
          <p className="text-sm mt-1">Crie uma OS e defina uma data/hora de agendamento</p>
        </div>
      )}
    </motion.div>
  );
}
