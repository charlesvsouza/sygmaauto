import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { asaasApi } from '../api/client';
import { todayBrInput } from '../lib/utils';
import { Modal, Button, useConfirm, useToast } from './ui';

const OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: 'PIX', label: 'PIX', hint: 'QR code e copia-e-cola, cai na hora' },
  { value: 'BOLETO', label: 'Boleto', hint: 'Compensa em até 3 dias úteis' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito', hint: 'O cliente digita o cartão no link' },
  { value: 'UNDEFINED', label: 'O cliente escolhe', hint: 'PIX, boleto ou cartão na página de pagamento' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  AWAITING_RISK_ANALYSIS: 'Em análise',
  RECEIVED: 'Pago',
  CONFIRMED: 'Pagamento confirmado',
  OVERDUE: 'Vencida',
  REFUNDED: 'Estornada',
  RECEIVED_IN_CASH: 'Recebida em dinheiro',
};

const today = () => todayBrInput();
const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

type Charge = {
  hasCharge: boolean;
  billingLabel?: string;
  status?: string;
  invoiceUrl?: string;
  dueDate?: string;
  value?: number;
  pix?: { encodedImage: string; payload: string } | null;
};

// Cobrança da O.S. pelo Asaas da oficina: emite, mostra link/QR do PIX e acompanha o status.
export function AsaasChargeModal({ orderId, orderLabel, total, onClose, onChanged }: {
  orderId: string;
  orderLabel: string;
  total: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [charge, setCharge] = useState<Charge | null>(null);
  const [billingType, setBillingType] = useState('PIX');
  const [dueDate, setDueDate] = useState(today());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const res = await asaasApi.getCharge(orderId);
      setCharge(res.data);
      if (res.data?.status && ['RECEIVED', 'CONFIRMED'].includes(res.data.status)) onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível consultar a cobrança.');
      setCharge({ hasCharge: false });
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const emit = async () => {
    setBusy(true);
    try {
      const res = await asaasApi.createCharge(orderId, { billingType, dueDate });
      setCharge(res.data);
      onChanged();
      toast.success('Cobrança emitida.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível emitir a cobrança.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!(await confirm({ title: 'Cancelar cobrança', message: 'A cobrança some do Asaas e o link deixa de funcionar. Você poderá emitir outra.', confirmLabel: 'Cancelar cobrança', cancelLabel: 'Manter', danger: true }))) return;
    setBusy(true);
    try {
      await asaasApi.cancelCharge(orderId);
      setCharge({ hasCharge: false });
      onChanged();
      toast.success('Cobrança cancelada.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível cancelar.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${what} copiado.`); }
    catch { toast.error('Não foi possível copiar. Selecione e copie manualmente.'); }
  };

  const paid = charge?.status === 'RECEIVED' || charge?.status === 'CONFIRMED';

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={`Cobrar pelo Asaas · O.S. ${orderLabel}`}
      footer={
        charge?.hasCharge ? (
          <>
            {!paid && <Button variant="ghost" onClick={cancel} disabled={busy}>Cancelar cobrança</Button>}
            <Button onClick={onClose}>Fechar</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button onClick={emit} disabled={busy || !charge}>{busy ? 'Emitindo...' : `Emitir cobrança de R$ ${fmt(total)}`}</Button>
          </>
        )
      }
    >
      {!charge ? (
        <div className="flex items-center gap-2 text-sm text-surface-500"><Loader2 size={16} className="animate-spin" /> Consultando...</div>
      ) : charge.hasCharge ? (
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-surface-500">{charge.billingLabel} · R$ {fmt(Number(charge.value || 0))}</p>
              <p className={`text-base font-bold ${paid ? 'text-accent-ink' : charge.status === 'OVERDUE' ? 'text-red-700' : 'text-surface-50'}`}>
                {STATUS_LABEL[charge.status ?? ''] ?? charge.status}
              </p>
              {charge.dueDate && <p className="text-xs text-surface-500">Vence em {new Date(charge.dueDate).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>}
            </div>
            <button type="button" onClick={load} disabled={busy} className="btn-secondary h-10 px-3 rounded-md inline-flex items-center gap-1.5 text-sm">
              <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
          {paid && <p className="rounded-lg bg-accent-soft px-3 py-2 text-accent-ink font-semibold">Pagamento recebido. A O.S. é faturada automaticamente quando está em "Pronto p/ Entrega".</p>}
          {!paid && charge.invoiceUrl && (
            <div className="flex flex-wrap gap-2">
              <a href={charge.invoiceUrl} target="_blank" rel="noreferrer" className="btn-secondary h-10 px-3 rounded-md inline-flex items-center gap-1.5"><ExternalLink size={14} /> Abrir link de pagamento</a>
              <button type="button" onClick={() => copy(charge.invoiceUrl!, 'Link')} className="btn-secondary h-10 px-3 rounded-md inline-flex items-center gap-1.5"><Copy size={14} /> Copiar link</button>
            </div>
          )}
          {!paid && charge.pix && (
            <div className="rounded-lg border border-line p-3 flex flex-col items-center gap-3">
              <img alt="QR code do PIX" className="h-44 w-44" src={`data:image/png;base64,${charge.pix.encodedImage}`} />
              <button type="button" onClick={() => copy(charge.pix!.payload, 'Código PIX')} className="btn-secondary h-10 px-3 rounded-md inline-flex items-center gap-1.5"><Copy size={14} /> Copiar PIX copia-e-cola</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-muted">Forma de pagamento</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {OPTIONS.map((o) => (
                <label key={o.value} className={`cursor-pointer rounded-lg border p-3 text-sm ${billingType === o.value ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-950'}`}>
                  <input type="radio" name="billing" className="sr-only" checked={billingType === o.value} onChange={() => setBillingType(o.value)} />
                  <span className="block font-semibold text-surface-50">{o.label}</span>
                  <span className="block text-xs text-surface-500">{o.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="asaas-due" className="block text-sm font-semibold text-muted">Vencimento</label>
            <input id="asaas-due" type="date" min={today()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input mt-1 max-w-[12rem]" />
          </div>
          <p className="text-xs text-surface-500">O cliente precisa ter CPF ou CNPJ no cadastro. Valor cobrado: o total da O.S.</p>
        </div>
      )}
    </Modal>
  );
}
