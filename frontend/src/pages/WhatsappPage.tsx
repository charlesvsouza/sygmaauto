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
    unknown: 'text-slate-400',
  };

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  const providerName = status?.provider || 'META_CLOUD';

  if (!status?.configured) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center">
            <MessageCircle size={22} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">WhatsApp Automático</h1>
            <p className="text-xs text-slate-500">Notificações automáticas por WhatsApp</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-700 font-bold">
            <WifiOff size={18} /> Provider WhatsApp não configurado
          </div>
          <p className="text-sm text-amber-700">
            Para ativar o WhatsApp automático, o administrador precisa configurar o provider
            <strong> {providerName}</strong> no servidor e definir as variáveis de ambiente.
          </p>
          <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Variáveis de ambiente (Railway)</p>
            <code className="block text-xs bg-slate-50 rounded-lg p-3 text-slate-700 font-mono">
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
        <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center">
          <MessageCircle size={22} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">WhatsApp Automático</h1>
          <p className="text-xs text-slate-500">Notificações automáticas por WhatsApp</p>
        </div>
        <button
          onClick={fetchStatus}
          className="ml-auto p-2 hover:bg-slate-100 rounded-xl transition"
          title="Atualizar status"
        >
          <RefreshCw size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Status card */}
      <div className={cn(
        'rounded-2xl border p-6 flex items-center gap-4',
        status?.connected
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-slate-50 border-slate-200',
      )}>
        {status?.connected ? (
          <Wifi size={28} className="text-emerald-500 shrink-0" />
        ) : (
          <WifiOff size={28} className="text-slate-400 shrink-0" />
        )}
        <div className="flex-1">
          <p className="font-bold text-slate-900">
            {status?.connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
          </p>
          <p className={cn('text-sm font-semibold', stateColor[status?.state ?? 'unknown'])}>
            {STATE_LABEL[(status?.state as ConnectionState) ?? 'unknown'] || String(status?.state || 'Desconhecido')}
            {` — provider: ${providerName}`}
          </p>
          {!!status?.message && <p className="text-xs text-slate-500 mt-1">{status.message}</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <AlertCircle size={18} className="text-slate-500" /> Integração Oficial (Meta Cloud)
        </div>
        <p className="text-sm text-slate-600">
          Este ambiente opera somente com a API oficial da Meta. Não há conexão por QR Code.
        </p>
      </div>

      {/* Gatilhos configurados */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <p className="font-bold text-slate-800 text-sm">Mensagens automáticas ativas</p>
        {[
          { status: 'Orçamento pronto (Aguardando Aprovação)', active: true, desc: 'Envia link de aprovação ao cliente' },
          { status: 'Serviço aprovado', active: true, desc: 'Confirma aprovação e início dos trabalhos' },
          { status: 'Pronto para entrega', active: true, desc: 'Avisa que o veículo está pronto' },
          { status: 'Entregue', active: true, desc: 'Mensagem de agradecimento pós-serviço' },
          { status: 'Cancelado', active: true, desc: 'Informa cancelamento da OS' },
        ].map((item) => (
          <div key={item.status} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-700">{item.status}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center">
        As mensagens são enviadas automaticamente quando o status da OS é atualizado.
        O cliente precisa ter um telefone cadastrado para receber.
      </p>
    </div>
  );
}
