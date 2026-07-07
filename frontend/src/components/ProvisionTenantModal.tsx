import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Building, CheckCircle2, Copy, Loader2, Mail, Package2, X } from 'lucide-react';
import { superAdminApi } from '../api/client';
import { getPlanLabel } from '../lib/planAccess';

export function ProvisionTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [tenantName, setTenantName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [document, setDocument] = useState('');
  const [planName, setPlanName] = useState('START');
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ activationLink: string; inviteEmail: string; emailSent: boolean; expiresAt: string } | null>(null);

  useEffect(() => {
    superAdminApi.getPlans()
      .then((res) => setPlans(res.data || []))
      .catch(() => setError('Não foi possível carregar os planos.'))
      .finally(() => setLoadingPlans(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await superAdminApi.provisionTenant({ tenantName, inviteEmail, document: document || undefined, planName });
      setResult(response.data);
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao provisionar tenant.');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!result?.activationLink) return;
    await navigator.clipboard.writeText(result.activationLink);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-2xl bg-surface-900 border border-line rounded-xl shadow-2xl overflow-hidden">
        <div className="px-8 py-6 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Provisionar Novo Tenant</h2>
            <p className="text-sm text-faint">Cria um tenant pendente e gera o link de ativação do primeiro MASTER.</p>
          </div>
          <button onClick={onClose} className="text-faint hover:text-ink"><X size={18} /></button>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl p-4 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl p-4 text-sm">
                <CheckCircle2 size={18} />
                Tenant provisionado com sucesso.
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-ink/5 rounded-lg p-4">
                  <p className="text-faint mb-1">Email de ativação</p>
                  <p className="text-ink font-semibold break-all">{result.inviteEmail}</p>
                </div>
                <div className="bg-ink/5 rounded-lg p-4">
                  <p className="text-faint mb-1">Expira em</p>
                  <p className="text-ink font-semibold">{new Date(result.expiresAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="bg-surface-950/60 border border-line rounded-lg p-4">
                <p className="text-faint text-sm mb-2">Link de ativação</p>
                <p className="text-blue-700 text-sm break-all">{result.activationLink}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={copyLink} className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm">
                  <Copy size={16} /> Copiar link
                </button>
                <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${result.emailSent ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                  {result.emailSent ? 'Email de ativação enviado' : 'SMTP não configurado: envie o link manualmente'}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-surface-200 uppercase tracking-wide">Nome do Tenant</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} required className="w-full bg-surface-950/60 border border-line rounded-xl py-3 pl-10 pr-4 text-ink text-sm outline-none focus:ring-2 focus:ring-blue-500/40" placeholder="Oficina Exemplo" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-surface-200 uppercase tracking-wide">Email de Ativação</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required className="w-full bg-surface-950/60 border border-line rounded-xl py-3 pl-10 pr-4 text-ink text-sm outline-none focus:ring-2 focus:ring-blue-500/40" placeholder="cliente@email.com" />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-surface-200 uppercase tracking-wide">Plano</label>
                  <div className="relative">
                    <Package2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <select value={planName} onChange={(e) => setPlanName(e.target.value)} disabled={loadingPlans} className="w-full bg-surface-950/60 border border-line rounded-xl py-3 pl-10 pr-4 text-ink text-sm outline-none focus:ring-2 focus:ring-blue-500/40">
                      {plans.map((plan) => <option key={plan.id} value={plan.name}>{getPlanLabel(plan.name)} · R$ {Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>)}
                      {!plans.length && <option value="START">START</option>}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-surface-200 uppercase tracking-wide">Documento Inicial</label>
                  <input value={document} onChange={(e) => setDocument(e.target.value)} className="w-full bg-surface-950/60 border border-line rounded-xl py-3 px-4 text-ink text-sm outline-none focus:ring-2 focus:ring-blue-500/40" placeholder="Opcional" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-3 bg-ink/5 hover:bg-ink/10 text-ink rounded-xl font-bold text-sm">Cancelar</button>
                <button type="submit" disabled={saving || loadingPlans} className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Provisionar tenant
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
