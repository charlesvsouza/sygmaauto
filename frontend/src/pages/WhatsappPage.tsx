import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  MessageCircle, Loader2, CheckCircle2, RefreshCw, Wifi,
  WifiOff, AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

type ConnectionState = 'open' | 'connecting' | 'close' | 'unknown';

interface WaStatus {
  connected: boolean;
  state: ConnectionState | 'not_found' | 'not_applicable' | 'not_configured' | string;
  instanceName?: string;
  configured: boolean;
  provider?: string;
  qrAvailable?: boolean;
  message?: string;
}

const STATE_LABEL: Record<ConnectionState, string> = {
  open: 'Conectado',
  connecting: 'Conectando…',
  close: 'Desconectado',
  unknown: 'Desconhecido',
};

function toConnectionState(value: unknown): ConnectionState {
  if (value === 'open' || value === 'connecting' || value === 'close' || value === 'unknown') {
    return value;
  }
  return 'unknown';
}

export function WhatsappPage() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  async function fetchStatus() {
    try {
      const res = await api.get('/whatsapp/status');
      setStatus(res.data);
    } catch {
      setStatus({ connected: false, state: 'unknown', instanceName: '', configured: false });
    } finally {
      setLoadingStatus(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  const stateColor: Record<ConnectionState, string> = {
    open: 'text-emerald-600',
    connecting: 'text-amber-500',
    close: 'text-red-500',
    unknown: 'text-surface-500',
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-surface-500" size={32} />
      </div>
    );
  }

  const providerName = status?.provider || 'META_CLOUD';
  const uiState = toConnectionState(status?.state);

  if (!status?.configured) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
            <MessageCircle size={22} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-50">WhatsApp Automático</h1>
            <p className="text-xs text-surface-400">Notificações automáticas por WhatsApp</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-700 font-bold">
            <WifiOff size={18} /> Provider WhatsApp não configurado
          </div>
          <p className="text-sm text-amber-700">
            Para ativar o WhatsApp automático, o administrador precisa configurar o provider
            <strong> {providerName}</strong> no servidor e definir as variáveis de ambiente.
          </p>
          <div className="bg-surface-900 rounded-xl border border-amber-500/30 p-4 space-y-2">
            <p className="text-xs font-bold text-surface-200 uppercase tracking-wide">Variáveis de ambiente (Railway)</p>
            <code className="block text-xs bg-surface-950/40 rounded-lg p-3 text-surface-200 font-mono">
              WHATSAPP_PROVIDER=META_CLOUD<br />
              META_WHATSAPP_TOKEN=seu-token-meta<br />
              META_WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id<br />
              META_WHATSAPP_VERIFY_TOKEN=token-do-webhook<br />
              META_WHATSAPP_APP_SECRET=app-secret-meta
            </code>
          </div>
          {status?.message && <p className="text-xs text-amber-700">{status.message}</p>}
          <p className="text-xs text-amber-600">
            Consulte o manual de implantação ou entre em contato com o suporte técnico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
          <MessageCircle size={22} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-surface-50">WhatsApp Automático</h1>
          <p className="text-xs text-surface-400">Notificações automáticas por WhatsApp</p>
        </div>
        <button
          onClick={fetchStatus}
          className="ml-auto p-2 hover:bg-ink/5 rounded-xl transition"
          title="Atualizar status"
        >
          <RefreshCw size={16} className="text-surface-500" />
        </button>
      </div>

      {/* Status card */}
      <div className={cn(
        'rounded-lg border p-6 flex items-center gap-4',
        status?.connected
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-surface-950/40 border-line',
      )}>
        {status?.connected ? (
          <Wifi size={28} className="text-emerald-500 shrink-0" />
        ) : (
          <WifiOff size={28} className="text-surface-500 shrink-0" />
        )}
        <div className="flex-1">
          <p className="font-bold text-surface-50">
            {status?.connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
          </p>
          <p className={cn('text-sm font-semibold', stateColor[uiState])}>
            {STATE_LABEL[uiState] || String(status?.state || 'Desconhecido')}
            {` — provider: ${providerName}`}
          </p>
          {!!status?.message && <p className="text-xs text-surface-400 mt-1">{status.message}</p>}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface-900 p-6 space-y-3">
        <div className="flex items-center gap-2 font-bold text-surface-100">
          <AlertCircle size={18} className="text-surface-400" /> Integração Oficial (Meta Cloud)
        </div>
        <p className="text-sm text-surface-300">
          Este ambiente opera somente com a API oficial da Meta. Não há conexão por QR Code.
        </p>
      </div>

      {/* Gatilhos configurados */}
      <div className="rounded-lg border border-line bg-surface-900 p-6 space-y-3">
        <p className="font-bold text-surface-100 text-sm">Mensagens automáticas ativas</p>
        {[
          { status: 'Orçamento pronto (Aguardando Aprovação)', active: true, desc: 'Envia link de aprovação ao cliente' },
          { status: 'Serviço aprovado', active: true, desc: 'Confirma aprovação e início dos trabalhos' },
          { status: 'Pronto para entrega', active: true, desc: 'Avisa que o veículo está pronto' },
          { status: 'Entregue', active: true, desc: 'Mensagem de agradecimento pós-serviço' },
          { status: 'Cancelado', active: true, desc: 'Informa cancelamento da OS' },
        ].map((item) => (
          <div key={item.status} className="flex items-start gap-3 py-2 border-b border-line last:border-0">
            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-surface-200">{item.status}</p>
              <p className="text-xs text-surface-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-surface-500 text-center">
        As mensagens são enviadas automaticamente quando o status da OS é atualizado.
        O cliente precisa ter um telefone cadastrado para receber.
      </p>
    </div>
  );
}
