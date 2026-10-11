import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Loader2, Unplug } from 'lucide-react';
import { asaasApi } from '../api/client';
import { useConfirm, useToast } from './ui';

type Status = {
  connected: boolean;
  environment?: 'production' | 'sandbox';
  webhookConfigured?: boolean;
  webhookUrl?: string | null;
  webhookToken?: string;
  notifyCustomers?: boolean;
  connectedAt?: string;
};

// Conexão da oficina com o Asaas: a oficina cobra o cliente final por PIX, boleto ou cartão
// direto na conta dela. A chave é guardada cifrada no servidor e nunca volta para a tela.
export function AsaasSettingsForm({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => asaasApi.status().then((r) => setStatus(r.data)).catch(() => setStatus({ connected: false }));
  useEffect(() => { load(); }, []);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copiado.`);
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.');
    }
  };

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await asaasApi.connect({ apiKey });
      setStatus(res.data);
      setApiKey('');
      toast.success('Asaas conectado.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível conectar o Asaas.');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!(await confirm({
      title: 'Desconectar o Asaas',
      message: 'As cobranças já emitidas continuam no Asaas, mas o SigmaAuto deixa de receber os pagamentos e não emite novas.',
      confirmLabel: 'Desconectar',
      danger: true,
    }))) return;
    try {
      await asaasApi.disconnect();
      setStatus({ connected: false });
      toast.success('Asaas desconectado.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível desconectar.');
    }
  };

  if (!status) {
    return <div className="p-6 text-sm text-surface-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Carregando pagamentos...</div>;
  }

  return (
    <section className="p-6 space-y-5" aria-labelledby="asaas-title">
      <div>
        <h3 id="asaas-title" className="text-lg font-bold text-surface-50">Pagamentos pelo Asaas</h3>
        <p className="text-sm text-surface-500 mt-1">
          Cobre o cliente por PIX, boleto ou cartão direto da O.S. O dinheiro cai na sua conta Asaas e a O.S. é faturada sozinha quando o pagamento é confirmado.
        </p>
      </div>

      {status.connected ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-950/40 px-4 py-3">
            <CheckCircle2 size={18} className="text-accent-ink" />
            <span className="text-sm font-semibold text-surface-50">
              Conectado ({status.environment === 'sandbox' ? 'ambiente de testes' : 'produção'})
            </span>
            {canEdit && (
              <button type="button" onClick={disconnect} className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 hover:underline">
                <Unplug size={14} /> Desconectar
              </button>
            )}
          </div>

          {canEdit && (
            <label className="flex items-start gap-2 text-sm text-surface-200">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={Boolean(status.notifyCustomers)}
                onChange={async (e) => {
                  try {
                    const res = await asaasApi.setNotify(e.target.checked);
                    setStatus(res.data);
                  } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Não foi possível salvar.');
                  }
                }}
              />
              <span>
                Deixar o Asaas avisar o cliente por e-mail e SMS
                <span className="block text-xs text-surface-500">Vale para clientes novos no Asaas. No ambiente de testes os envios são reais: use contatos seus.</span>
              </span>
            </label>
          )}

          {canEdit && (
            status.webhookConfigured ? (
              <p className="text-sm text-surface-500">Aviso de pagamento (webhook) cadastrado no Asaas automaticamente.</p>
            ) : (
              <div className="rounded-lg border border-line p-4 space-y-3 text-sm text-surface-300">
                <p className="font-semibold text-surface-50">Falta cadastrar o aviso de pagamento no Asaas</p>
                <p>No Asaas, abra Integrações → Webhooks e crie um webhook com estes dados, marcando os eventos de cobrança paga e vencida:</p>
                {status.webhookUrl ? (
                  <div className="flex items-center gap-2">
                    <input aria-label="URL do webhook" readOnly value={status.webhookUrl} className="input flex-1 font-mono text-xs" />
                    <button type="button" onClick={() => copy(status.webhookUrl!, 'URL')} className="btn-secondary h-10 px-3 rounded-md inline-flex items-center gap-1.5"><Copy size={14} /> Copiar</button>
                  </div>
                ) : (
                  <p className="text-red-700">O servidor não sabe o próprio endereço público (defina API_PUBLIC_URL). Sem isso o aviso automático não funciona.</p>
                )}
                {status.webhookToken && (
                  <div className="flex items-center gap-2">
                    <input aria-label="Token de autenticação do webhook" readOnly value={status.webhookToken} className="input flex-1 font-mono text-xs" />
                    <button type="button" onClick={() => copy(status.webhookToken!, 'Token')} className="btn-secondary h-10 px-3 rounded-md inline-flex items-center gap-1.5"><Copy size={14} /> Copiar</button>
                  </div>
                )}
                <p className="text-xs text-surface-500">Cole o token no campo "Token de autenticação" do webhook.</p>
              </div>
            )
          )}
        </div>
      ) : canEdit ? (
        <form onSubmit={connect} className="space-y-4 max-w-xl">
          <div>
            <label htmlFor="asaas-key" className="block text-sm font-semibold text-muted">Chave de API do Asaas</label>
            <input
              id="asaas-key"
              type="password"
              autoComplete="off"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="$aact_..."
              className="input mt-1 font-mono"
            />
            <p className="text-xs text-surface-500 mt-1">No Asaas: Integrações → Chave de API. O ambiente é detectado pela chave ($aact_hmlg_ = testes, $aact_prod_ = produção). A chave fica guardada cifrada e não aparece de novo.</p>
          </div>
          <button type="submit" disabled={saving || !apiKey.trim()} className="btn btn-primary h-11 px-6 rounded-lg font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conectar Asaas'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-surface-500">O Asaas ainda não foi conectado. Peça ao Master ou Admin da oficina.</p>
      )}
    </section>
  );
}
