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
  /** Valor efectivamente cobrado nesta emissão (adiantamento pode ser menor que o total). */
  chargeValue?: number;
  chargePercent?: number;
  /** Quanto já foi recebido nesta O.S. e quanto falta. */
  paidValue?: number;
  balance?: number;
  pix?: { encodedImage: string; payload: string } | null;
};

// Cobrança da O.S. pelo Asaas da oficina: emite, mostra link/QR do PIX e acompanha o status.
export function AsaasChargeModal({ orderId, orderLabel, total, customerName, customerPhone, approvalUrl, salonName, vehicleLabel, onClose, onChanged }: {
  orderId: string;
  orderLabel: string;
  total: number;
  /** Nome e telefone do cliente, para montar a mensagem do WhatsApp. */
  customerName?: string | null;
  customerPhone?: string | null;
  /** Link público de aprovação do orçamento (quando a O.S. tem token). */
  approvalUrl?: string | null;
  salonName?: string | null;
  vehicleLabel?: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [charge, setCharge] = useState<Charge | null>(null);
  const [billingType, setBillingType] = useState('PIX');
  const [dueDate, setDueDate] = useState(today());
  const [busy, setBusy] = useState(false);
  /** Adiantamento: percentual do saldo que será cobrado agora (10 a 100). */
  const [percent, setPercent] = useState(100);

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
      const res = await asaasApi.createCharge(orderId, { billingType, dueDate, percent });
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

  // Saldo que ainda falta receber (o total, quando não há nada pago).
  const saldo = Number(charge?.balance ?? total);
  const valorCobrado = Math.round((saldo * percent) / 100 * 100) / 100;

  /** Monta a mensagem e abre o WhatsApp do cliente (wa.me) com o texto pronto. */
  const whatsapp = (comCobranca: boolean) => {
    const linhas: string[] = [];
    linhas.push(`Olá${customerName ? `, ${customerName}` : ''}! Aqui é da ${salonName ?? 'oficina'} sobre o serviço${vehicleLabel ? ` do veículo ${vehicleLabel}` : ''}.`);
    linhas.push('');
    linhas.push(`O.S. ${orderLabel} — total R$ ${fmt(total)}`);
    if (comCobranca && charge?.hasCharge) {
      const pago = Number(charge.paidValue ?? 0);
      if (pago > 0) linhas.push(`Já recebido: R$ ${fmt(pago)} · saldo R$ ${fmt(saldo)}`);
      if (percent < 100) linhas.push(`Para iniciar o serviço, pedimos um adiantamento de ${percent}%: R$ ${fmt(valorCobrado)}.`);
      if (charge.pix?.payload) {
        linhas.push('');
        linhas.push('Pix copia e cola:');
        linhas.push(charge.pix.payload);
      }
      if (charge.invoiceUrl) {
        linhas.push('');
        linhas.push(`Ou pague pelo link: ${charge.invoiceUrl}`);
      }
    }
    if (approvalUrl) {
      linhas.push('');
      linhas.push(`Confira e aprove o orçamento por aqui: ${approvalUrl}`);
    }
    const texto = encodeURIComponent(linhas.join(String.fromCharCode(10)));
    const numero = (customerPhone ?? '').replace(/\D/g, '');
    const destino = numero.length >= 10 ? `55${numero.replace(/^55/, '')}` : '';
    const url = destino ? `https://wa.me/${destino}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={`Cobrar pelo Asaas · O.S. ${orderLabel}`}
      footer={
        charge?.hasCharge ? (
          <>
            {!paid && <Button variant="ghost" onClick={() => whatsapp(true)} disabled={busy}>Enviar por WhatsApp</Button>}
            {!paid && <Button variant="ghost" onClick={cancel} disabled={busy}>Cancelar cobrança</Button>}
            <Button onClick={onClose}>Fechar</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => whatsapp(false)}>{approvalUrl ? 'Enviar orçamento por WhatsApp' : 'Enviar por WhatsApp'}</Button>
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button onClick={emit} disabled={busy || !charge}>{busy ? 'Emitindo...' : `Cobrar R$ ${fmt(valorCobrado)}`}</Button>
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
          <div>
            <label htmlFor="asaas-percent" className="block text-sm font-semibold text-muted">Adiantamento (% do saldo)</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {[10, 25, 50, 100].map((p) => (
                <button key={p} type="button" onClick={() => setPercent(p)}
                  className={`h-9 rounded-md border px-3 text-sm font-semibold ${percent === p ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-surface-300 hover:bg-surface-950'}`}>
                  {p === 100 ? 'Total' : `${p}%`}
                </button>
              ))}
              <input id="asaas-percent" type="number" min={10} max={100} step={5} value={percent}
                onChange={(e) => setPercent(Math.min(100, Math.max(10, Number(e.target.value) || 10)))}
                className="input h-9 w-24" aria-label="Percentual do adiantamento" />
            </div>
            <p className="mt-2 text-xs text-surface-500">
              Cobra <strong>R$ {fmt(valorCobrado)}</strong> agora de um saldo de R$ {fmt(saldo)}.
              {percent < 100 ? ` Ficam R$ ${fmt(Math.round((saldo - valorCobrado) * 100) / 100)} para depois.` : ''}
            </p>
          </div>
          <p className="text-xs text-surface-500">O cliente precisa ter CPF ou CNPJ no cadastro.</p>
        </div>
      )}
    </Modal>
  );
}
