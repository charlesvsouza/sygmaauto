import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { approvalApi } from '../api/client';

// Página pública do link de aprovação (WhatsApp / QR code do orçamento em PDF).

const money = (v: number) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Summary = {
  state: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CLOSED';
  code: string;
  workshop: { name: string; logo?: string | null; phone?: string | null; email?: string | null };
  customerName: string;
  vehicle?: { brand: string; model: string; plate: string; year?: number | null } | null;
  equipment?: string | null;
  complaint?: string | null;
  diagnosis?: string | null;
  items: Array<{ description: string; type: string; quantity: number; unitPrice: number; discount: number; totalPrice: number }>;
  totals: { services: number; parts: number; discount: number; total: number };
  validUntil?: string | null;
  approvedAt?: string | null;
};

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950/40 px-4">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}

export function BudgetApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState('');
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) return;
    approvalApi.get(token)
      .then((res) => setData(res.data))
      .catch(() => setLoadError('Link inválido. Confira o endereço ou fale com a oficina.'));
  }, [token]);

  const submit = async (approved: boolean) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await approvalApi.decide(token!, { approved, notes: notes.trim() || undefined });
      setDecision(approved ? 'approved' : 'rejected');
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? 'Não foi possível registrar sua resposta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) return <Centered><p className="text-red-500 font-medium">{loadError}</p></Centered>;
  if (!data) return <Centered><Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" /></Centered>;

  const contact = [data.workshop.phone, data.workshop.email].filter(Boolean).join(' · ');

  if (decision || data.state === 'APPROVED' || data.state === 'REJECTED') {
    const approved = decision ? decision === 'approved' : data.state === 'APPROVED';
    return (
      <Centered>
        {approved
          ? <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          : <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />}
        <h1 className="text-xl font-bold text-surface-50">
          {approved ? 'Orçamento aprovado' : 'Orçamento recusado'}
        </h1>
        <p className="text-surface-400 mt-2">
          {decision
            ? approved
              ? `A ${data.workshop.name} já recebeu sua aprovação e vai dar sequência ao serviço.`
              : `A ${data.workshop.name} foi avisada. Se quiser rever algum item, fale com a oficina.`
            : 'Este orçamento já foi respondido.'}
        </p>
        {contact && <p className="text-sm text-surface-500 mt-4">{contact}</p>}
      </Centered>
    );
  }

  if (data.state !== 'PENDING') {
    return (
      <Centered>
        <h1 className="text-xl font-bold text-surface-50">
          {data.state === 'EXPIRED' ? 'Este orçamento venceu' : 'Este orçamento não está mais aguardando aprovação'}
        </h1>
        <p className="text-surface-400 mt-2">Fale com a {data.workshop.name} para receber um orçamento atualizado.</p>
        {contact && <p className="text-sm text-surface-500 mt-4">{contact}</p>}
      </Centered>
    );
  }

  const vehicleLabel = data.vehicle
    ? `${data.vehicle.brand} ${data.vehicle.model}${data.vehicle.year ? ` ${data.vehicle.year}` : ''} · ${data.vehicle.plate}`
    : data.equipment;

  return (
    <div className="min-h-screen bg-surface-950/40 flex justify-center items-start px-4 py-8">
      <div className="w-full max-w-lg bg-surface-900 rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex items-center gap-3">
          {data.workshop.logo && <img src={data.workshop.logo} alt="" className="h-12 w-auto max-w-[120px] object-contain" />}
          <div>
            <p className="font-bold text-surface-50">{data.workshop.name}</p>
            {contact && <p className="text-xs text-surface-500">{contact}</p>}
          </div>
        </div>

        <div>
          <p className="text-xs text-surface-500 uppercase tracking-wide font-bold">Orçamento nº {data.code}</p>
          <h1 className="text-xl font-bold text-surface-50 mt-1">Olá, {data.customerName.split(' ')[0]}!</h1>
          {vehicleLabel && <p className="text-sm text-surface-400">{vehicleLabel}</p>}
        </div>

        {data.complaint && (
          <div>
            <p className="text-xs font-bold text-surface-500 uppercase">Reclamação</p>
            <p className="text-sm text-surface-200 whitespace-pre-line">{data.complaint}</p>
          </div>
        )}
        {data.diagnosis && (
          <div>
            <p className="text-xs font-bold text-surface-500 uppercase">Diagnóstico</p>
            <p className="text-sm text-surface-200 whitespace-pre-line">{data.diagnosis}</p>
          </div>
        )}

        <div className="border border-line rounded-lg divide-y divide-line">
          {data.items.map((i, idx) => (
            <div key={idx} className="flex justify-between gap-3 px-3 py-2 text-sm">
              <div>
                <p className="text-surface-100">{i.description}</p>
                <p className="text-xs text-surface-500">
                  {i.type === 'part' ? 'Peça' : 'Serviço'} · {Number(i.quantity).toLocaleString('pt-BR')} × {money(i.unitPrice)}
                  {i.discount > 0 && ` · desconto ${money(i.discount)}`}
                </p>
              </div>
              <p className="font-bold text-surface-100 whitespace-nowrap">{money(i.totalPrice)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-surface-400"><span>Serviços</span><span>{money(data.totals.services)}</span></div>
          <div className="flex justify-between text-surface-400"><span>Peças</span><span>{money(data.totals.parts)}</span></div>
          {data.totals.discount > 0 && (
            <div className="flex justify-between text-surface-400"><span>Desconto</span><span>− {money(data.totals.discount)}</span></div>
          )}
          <div className="flex justify-between text-lg font-bold text-surface-50 pt-1"><span>Total</span><span>{money(data.totals.total)}</span></div>
          {data.validUntil && (
            <p className="text-xs text-surface-500">Válido até {new Date(data.validUntil).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          )}
        </div>

        {confirming ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-surface-200">
              {confirming === 'approve' ? 'Confirma a aprovação deste orçamento?' : 'Confirma a recusa deste orçamento?'}
            </p>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observação para a oficina (opcional)"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-surface-950/40"
            />
            {submitError && <p className="text-sm text-red-500">{submitError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirming(null)} disabled={submitting}
                className="flex-1 h-11 rounded-lg border border-line text-surface-300 font-bold text-sm">
                Voltar
              </button>
              <button type="button" onClick={() => submit(confirming === 'approve')} disabled={submitting}
                className={`flex-1 h-11 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 ${confirming === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirming === 'approve' ? 'Confirmar aprovação' : 'Confirmar recusa'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming('reject')}
              className="flex-1 h-12 rounded-lg border border-red-500/50 text-red-600 font-bold text-sm hover:bg-red-500/10">
              Recusar
            </button>
            <button type="button" onClick={() => setConfirming('approve')}
              className="flex-[2] h-12 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700">
              Aprovar orçamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
