import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import {
  MessageCircle, Loader2, CheckCircle2, XCircle, RefreshCw, Wifi,
  WifiOff, QrCode, Power, PowerOff,
} from 'lucide-react';
import { cn } from '../lib/utils';

type ConnectionState = 'open' | 'connecting' | 'close' | 'unknown';

interface WaStatus {
  connected: boolean;
  state: ConnectionState;
  instanceName: string;
  configured: boolean;
}

const STATE_LABEL: Record<ConnectionState, string> = {
  open: 'Conectado',
  connecting: 'Conectando…',
  close: 'Desconectado',
  unknown: 'Desconhecido',
};

export function WhatsappPage() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingQr, setLoadingQr] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchStatus() {
    try {
      const res = await api.get('/whatsapp/status');
      setStatus(res.data);
      if (res.data.connected) {
        setQrCode(null);
        stopPolling();
      }
    } catch {
      setStatus({ connected: false, state: 'unknown', instanceName: '', configured: false });
    } finally {
      setLoadingStatus(false);
    }
  }

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(fetchStatus, 5000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    fetchStatus();
    return () => stopPolling();
  }, []);

  async function handleGetQr() {
    setLoadingQr(true);
    setQrCode(null);
    try {
      const res = await api.get('/whatsapp/qrcode');
      if (res.data.qrCode) {
        setQrCode(res.data.qrCode);
        startPolling();
      } else {
        const msg = res.data.error ?? 'QR Code não disponível. Verifique os logs do servidor.';
        alert(msg);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro ao gerar QR Code. Verifique se a Evolution API está configurada no servidor.');
    } finally {
      setLoadingQr(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar o WhatsApp? As mensagens automáticas serão desativadas.')) return;
    setDisconnecting(true);
    try {
      await api.post('/whatsapp/disconnect');
      await fetchStatus();
    } catch {
      alert('Erro ao desconectar.');
    } finally {
      setDisconnecting(false);
    }
  }

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
            <WifiOff size={18} /> Evolution API não configurada
          </div>
          <p className="text-sm text-amber-700">
            Para ativar o WhatsApp automático, o administrador do sistema precisa configurar a
            <strong> Evolution API</strong> no servidor e definir as variáveis de ambiente.
          </p>
          <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Variáveis de ambiente (Railway)</p>
            <code className="block text-xs bg-slate-50 rounded-lg p-3 text-slate-700 font-mono">
              EVOLUTION_API_URL=https://sua-evolution.railway.app<br />
              EVOLUTION_API_KEY=sua-chave-api<br />
              EVOLUTION_INSTANCE=sygmaauto
            </code>
          </div>
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
            {STATE_LABEL[status?.state ?? 'unknown']}
            {status?.instanceName ? ` — instância: ${status.instanceName}` : ''}
          </p>
        </div>
        {status?.connected && (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-red-200 bg-white text-red-600 hover:bg-red-50 transition disabled:opacity-50"
          >
            {disconnecting
              ? <><Loader2 size={13} className="animate-spin" /> Desconectando…</>
              : <><PowerOff size={13} /> Desconectar</>}
          </button>
        )}
      </div>

      {/* QR Code area */}
      {!status?.connected && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <QrCode size={18} /> Conectar via QR Code
          </div>
          <p className="text-sm text-slate-500">
            Clique em "Gerar QR Code", depois abra o WhatsApp no celular →{' '}
            <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> →
            escaneie o código abaixo.
          </p>
          {qrCode ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                className="w-56 h-56 rounded-xl border border-slate-200"
              />
              <p className="text-xs text-slate-400 animate-pulse">
                Aguardando leitura… (atualiza automaticamente)
              </p>
              <button
                onClick={handleGetQr}
                disabled={loadingQr}
                className="text-xs text-indigo-600 hover:underline"
              >
                Gerar novo QR Code
              </button>
            </div>
          ) : (
            <button
              onClick={handleGetQr}
              disabled={loadingQr}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition disabled:opacity-60"
            >
              {loadingQr
                ? <><Loader2 size={15} className="animate-spin" /> Gerando…</>
                : <><Power size={15} /> Gerar QR Code</>}
            </button>
          )}
        </div>
      )}

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
