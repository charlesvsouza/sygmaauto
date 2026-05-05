import { useEffect, useState } from 'react';
import { maintenanceApi } from '../api/client';
import { Bell, Car, CheckCircle2, Loader2, RefreshCw, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

export function MaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [dueVehicles, setDueVehicles] = useState<any[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await maintenanceApi.getDue();
      setDueVehicles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Não foi possível carregar os veículos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manutenção Preventiva</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Veículos com intervalo de manutenção vencido — lembretes enviados via WhatsApp automaticamente às 8h.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Info card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Lembrete automático ativo:</strong> todo dia às 8h o sistema verifica veículos com
          manutenção vencida (por KM ou por data) e envia mensagem WhatsApp ao cliente. Configure o
          intervalo de manutenção em cada veículo para ativar este recurso.
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">{error}</div>
      ) : dueVehicles.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Nenhum veículo com manutenção vencida</p>
          <p className="text-slate-400 text-sm mt-1">
            Todos os veículos cadastrados estão dentro do intervalo configurado.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {dueVehicles.map((row: any, i: number) => {
            const v = row.vehicle;
            return (
              <motion.div
                key={v.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-red-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900">
                        {v.brand} {v.model}
                      </span>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {v.plate}
                      </span>
                      <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        Manutenção vencida
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">
                      Cliente: <strong>{v.customer?.name}</strong>
                      {v.customer?.phone && (
                        <span className="ml-2 text-slate-400">{v.customer.phone}</span>
                      )}
                    </p>
                    <p className="text-sm text-amber-700 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" />
                      {row.reason}
                    </p>
                    {v.reminderSentAt && (
                      <p className="text-xs text-slate-400 mt-1">
                        Último lembrete enviado:{' '}
                        {new Date(v.reminderSentAt).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
