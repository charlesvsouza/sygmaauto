import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { tenantsApi } from '../api/client';
import { cn } from '../lib/utils';

type Settings = {
  warrantyDaysServices: number;
  warrantyDaysParts: number;
  budgetValidityDays: number;
  authorizationText: string;
  warrantyText: string;
  belongingsText: string;
};

const TEXTS: Array<{ key: 'authorizationText' | 'warrantyText' | 'belongingsText'; label: string; hint: string }> = [
  { key: 'authorizationText', label: 'Autorização do orçamento', hint: 'Sai no orçamento, acima da assinatura do cliente.' },
  { key: 'warrantyText', label: 'Garantia', hint: 'Sai no termo de entrega. {servicos} e {pecas} viram os prazos em dias.' },
  { key: 'belongingsText', label: 'Objetos no veículo', hint: 'Sai no documento de entrada (vistoria).' },
];

const inputClass = (enabled: boolean) => cn(
  'w-full px-4 py-2 rounded-lg border text-base font-bold transition-all',
  enabled
    ? 'border-line bg-surface-950/40 focus:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40'
    : 'border-line bg-surface-950/40 text-surface-500 cursor-not-allowed',
);

// Garantia, validade do orçamento e textos legais dos documentos do atendimento.
// Texto apagado volta ao padrão do sistema.
export function DocumentSettingsForm({ canEdit }: { canEdit: boolean }) {
  const [data, setData] = useState<Settings | null>(null);
  const [defaults, setDefaults] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const apply = (res: any) => {
    const eff: Settings = res.data.effective;
    const stored = res.data.stored ?? {};
    setDefaults(eff);
    // Textos: mostra o gravado; vazio = usando o padrão (aparece como placeholder).
    setData({
      ...eff,
      authorizationText: stored.authorizationText ?? '',
      warrantyText: stored.warrantyText ?? '',
      belongingsText: stored.belongingsText ?? '',
    });
  };

  useEffect(() => {
    tenantsApi.getDocumentSettings().then(apply).catch(() => setError('Não foi possível carregar as configurações de documentos.'));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      apply(await tenantsApi.updateDocumentSettings({
        warrantyDaysServices: Number(data.warrantyDaysServices),
        warrantyDaysParts: Number(data.warrantyDaysParts),
        budgetValidityDays: Number(data.budgetValidityDays),
        authorizationText: data.authorizationText,
        warrantyText: data.warrantyText,
        belongingsText: data.belongingsText,
      }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao salvar as configurações de documentos.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  const numberField = (key: 'warrantyDaysServices' | 'warrantyDaysParts' | 'budgetValidityDays', label: string) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-surface-500 uppercase tracking-wide ml-1">{label}</label>
      <input
        type="number"
        min={key === 'budgetValidityDays' ? 1 : 0}
        step="1"
        value={data?.[key] ?? ''}
        onChange={(e) => canEdit && data && setData({ ...data, [key]: Number(e.target.value) })}
        disabled={!canEdit}
        className={inputClass(canEdit)}
      />
    </div>
  );

  return (
    <form onSubmit={save} className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-surface-50 uppercase tracking-wide">Documentos do Atendimento</h3>
        {!canEdit && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-surface-500 bg-surface-800 px-2 py-1 rounded">
            <Lock className="w-3 h-3" /> Admin
          </div>
        )}
      </div>
      <p className="text-[11px] text-surface-500">
        Prazos e textos usados no orçamento, na entrada do veículo e no termo de entrega. O link de aprovação enviado ao cliente vale pelo prazo de validade do orçamento.
      </p>

      {!data ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-surface-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {numberField('warrantyDaysServices', 'Garantia serviços (dias)')}
            {numberField('warrantyDaysParts', 'Garantia peças (dias)')}
            {numberField('budgetValidityDays', 'Validade orçamento (dias)')}
          </div>

          {TEXTS.map((t) => (
            <div key={t.key} className="space-y-1">
              <label className="text-xs font-bold text-surface-500 uppercase tracking-wide ml-1">{t.label}</label>
              <textarea
                rows={3}
                value={data[t.key]}
                placeholder={defaults?.[t.key]}
                onChange={(e) => canEdit && setData({ ...data, [t.key]: e.target.value })}
                disabled={!canEdit}
                className={cn(inputClass(canEdit), 'font-normal text-sm resize-y')}
              />
              <p className="text-[10px] text-surface-500 ml-1">{t.hint} Deixe em branco para usar o texto padrão.</p>
            </div>
          ))}
        </>
      )}

      {canEdit && data && (
        <div className="space-y-2 pt-2">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
              ✓ Configurações de documentos salvas com sucesso!
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn btn-primary h-14 px-10 rounded-lg font-bold shadow-xl shadow-primary-500/20 active:scale-95 transition-all">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Documentos'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
