import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, PackageCheck } from 'lucide-react';

interface DeliveryModalProps {
  /** 'confirm' = marcando como entregue agora; 'edit' = corrigindo O.S. já entregue */
  mode: 'confirm' | 'edit';
  initialDate?: string | null;
  initialName?: string | null;
  initialAuthorizedBy?: string | null;
  /** O.S. sob a regra do checklist: quem autorizou a retirada é obrigatório */
  requireAuthorizedBy?: boolean;
  /** Alerta de que o veículo sai sem quitação (só informativo) */
  unpaid?: boolean;
  onClose: () => void;
  onSubmit: (data: { deliveredAt: string; deliveredTo: string; authorizedBy?: string }) => Promise<void>;
}

const toInputDate = (iso?: string | null) => {
  const d = iso ? new Date(iso) : new Date();
  // Data local de Brasília (YYYY-MM-DD)
  return new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
};

export function DeliveryModal({ mode, initialDate, initialName, initialAuthorizedBy, requireAuthorizedBy, unpaid, onClose, onSubmit }: DeliveryModalProps) {
  const [date, setDate] = useState(toInputDate(initialDate));
  const [name, setName] = useState(initialName || '');
  const [authorizedBy, setAuthorizedBy] = useState(initialAuthorizedBy || '');
  const [saving, setSaving] = useState(false);
  const today = toInputDate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (requireAuthorizedBy && !authorizedBy.trim())) return;
    setSaving(true);
    try {
      await onSubmit({ deliveredAt: date, deliveredTo: name.trim(), authorizedBy: authorizedBy.trim() || undefined });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm font-bold';

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-surface-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-surface-950/40">
          <h2 className="text-lg font-bold text-surface-50 flex items-center gap-2">
            <PackageCheck size={18} /> {mode === 'confirm' ? 'Registrar entrega do veículo' : 'Dados da entrega'}
          </h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="p-2 hover:bg-ink/5 rounded-full"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {unpaid && (
            <p className="text-xs font-semibold text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              Esta O.S. ainda não foi quitada. A entrega será registrada mesmo assim e o saldo continua em aberto.
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="dlv-date" className="block text-sm font-semibold text-muted">Data da entrega *</label>
            <input id="dlv-date" type="date" required value={date} max={today} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dlv-name" className="block text-sm font-semibold text-muted">Quem retirou o veículo *</label>
            <input id="dlv-name" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nome de quem retirou" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dlv-auth" className="block text-sm font-semibold text-muted">Autorizado por {requireAuthorizedBy ? '*' : '(opcional)'}</label>
            <input id="dlv-auth" required={requireAuthorizedBy} value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)}
              placeholder="Quem autorizou a retirada (cliente, gerente...)" className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-surface-400 hover:bg-ink/5">Cancelar</button>
            <button type="submit" disabled={saving || !name.trim() || !date || (requireAuthorizedBy && !authorizedBy.trim())}
              className="px-6 py-2.5 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {mode === 'confirm' ? 'Confirmar entrega' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
