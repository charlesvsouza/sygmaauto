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
          <h1 className="text-2xl font-bold text-surface-50">Manutenção Preventiva</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Veículos com intervalo de manutenção vencido — lembretes enviados via WhatsApp automaticamente às 8h.
          </p>
        </div>
        <button type="button"
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-ink/5 text-surface-200 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Info card */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
        <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
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
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-3" />
          <p className="text-surface-300 font-medium">Nenhum veículo com manutenção vencida</p>
          <p className="text-surface-500 text-sm mt-1">
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
                className="bg-surface-900 border border-red-500/25 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-surface-50">
                        {v.brand} {v.model}
                      </span>
                      <span className="text-xs font-mono bg-surface-800 px-2 py-0.5 rounded text-surface-300">
                        {v.plate}
                      </span>
                      <span className="ml-auto text-xs bg-red-500/15 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        Manutenção vencida
                      </span>
                    </div>
                    <p className="text-sm text-surface-300 mb-1">
                      Cliente: <strong>{v.customer?.name}</strong>
                      {v.customer?.phone && (
                        <span className="ml-2 text-surface-500">{v.customer.phone}</span>
                      )}
                    </p>
                    <p className="text-sm text-amber-700 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" />
                      {row.reason}
                    </p>
                    {v.reminderSentAt && (
                      <p className="text-xs text-surface-500 mt-1">
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
