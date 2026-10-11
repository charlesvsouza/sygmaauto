import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Plus, X } from 'lucide-react';
import { customersApi, serviceOrdersApi, vehiclesApi } from '../api/client';
import { cn } from '../lib/utils';
import { orderCode } from '../lib/orderCode';
import { useAuthStore } from '../store/authStore';
import { ACCESSORIES, ACCESSORY_CONDITIONS, AREAS, CONDITIONS, type Condition } from './ChecklistModal';
import { NumberInput, useToast } from './ui';

type OrderType = 'ORCAMENTO' | 'ORDEM_SERVICO' | 'RETIFICA_MOTOR';

interface Props {
  customers: any[];
  vehicles: any[];
  orders: any[];
  canUseRetifica: boolean;
  /** Plano com checklist (ou adicional ligado): o orçamento só salva com ao menos 1 informação. */
  checklistEnabled: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: any) => void;
  onVehicleCreated: (vehicle: any) => void;
  onCreated: (order: any) => void;
}

const FUEL_STEPS = [
  { value: 0, label: 'Vazio' },
  { value: 2, label: '1/4' },
  { value: 4, label: '1/2' },
  { value: 6, label: '3/4' },
  { value: 8, label: 'Cheio' },
];

const field =
  'w-full rounded-md border border-line bg-panel px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <header className="mb-4 flex items-baseline gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-ink">{step}</span>
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-muted">{label}</label>
      {children}
    </div>
  );
}

// Orçamento em branco: nada é gravado e não existe número até "Salvar orçamento".
export function NewOrderSheet({ customers, vehicles, orders, canUseRetifica, checklistEnabled, onClose, onCustomerCreated, onVehicleCreated, onCreated }: Props) {
  const toast = useToast();
  const { user } = useAuthStore();

  const [orderType, setOrderType] = useState<OrderType>('ORCAMENTO');
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [kmEntrada, setKmEntrada] = useState(0);
  const [complaint, setComplaint] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [reserveStock, setReserveStock] = useState(false);
  const [engine, setEngine] = useState({ brand: '', model: '', serial: '' });

  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', document: '', phone: '', email: '' });
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plate: '', brand: '', model: '', year: '', color: '', vin: '' });

  const [fuel, setFuel] = useState(0);
  const [conditions, setConditions] = useState<Record<string, Condition>>({});
  const [observations, setObservations] = useState('');
  const [completedBy, setCompletedBy] = useState(user?.name ?? '');
  const [ownerType, setOwnerType] = useState<'PROPRIETARIO' | 'DELEGADO'>('PROPRIETARIO');
  const [ownerName, setOwnerName] = useState('');

  const [busy, setBusy] = useState(false);

  const isRetifica = orderType === 'RETIFICA_MOTOR';
  const needsChecklist = checklistEnabled && !isRetifica;
  const customerVehicles = useMemo(() => vehicles.filter((v) => v.customerId === customerId), [vehicles, customerId]);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const openForVehicle = useMemo(() => {
    const closed = ['FATURADO', 'ENTREGUE', 'CANCELADO', 'REPROVADO'];
    return vehicleId ? orders.filter((o) => o.vehicleId === vehicleId && !closed.includes(o.status)) : [];
  }, [orders, vehicleId]);

  const checklistInfoCount = Object.values(conditions).filter(Boolean).length + (fuel > 0 ? 1 : 0) + (observations.trim() ? 1 : 0);
  const checklistOk = !needsChecklist || checklistInfoCount > 0;
  const vehicleOk = isRetifica || Boolean(vehicleId);
  const canSave = Boolean(customerId) && vehicleOk && checklistOk && !busy;

  const missing: string[] = [];
  if (!customerId) missing.push('o cliente');
  if (!vehicleOk) missing.push('o veículo');
  if (!checklistOk) missing.push('ao menos uma informação do checklist');

  const setCondition = (key: string, value: Condition) =>
    setConditions((prev) => ({ ...prev, [key]: prev[key] === value ? '' : value }));

  const saveCustomer = async () => {
    if (!newCustomer.name.trim()) { toast.warning('Informe o nome do cliente.'); return; }
    setBusy(true);
    try {
      const res = await customersApi.create({
        name: newCustomer.name.trim(),
        document: newCustomer.document.trim() || undefined,
        phone: newCustomer.phone.trim() || undefined,
        email: newCustomer.email.trim() || undefined,
      });
      onCustomerCreated(res.data);
      setCustomerId(res.data.id);
      setVehicleId('');
      setNewCustomerOpen(false);
      setNewCustomer({ name: '', document: '', phone: '', email: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Não foi possível cadastrar o cliente.');
    } finally { setBusy(false); }
  };

  const saveVehicle = async () => {
    const plate = newVehicle.plate.trim().toUpperCase();
    if (!customerId) { toast.warning('Escolha o cliente antes de cadastrar o veículo.'); return; }
    if (!plate || !newVehicle.brand.trim() || !newVehicle.model.trim()) { toast.warning('Preencha placa, marca e modelo.'); return; }
    setBusy(true);
    try {
      const year = Number(newVehicle.year);
      const res = await vehiclesApi.create({
        customerId,
        plate,
        brand: newVehicle.brand.trim(),
        model: newVehicle.model.trim(),
        color: newVehicle.color.trim() || undefined,
        vin: newVehicle.vin.trim().toUpperCase() || undefined,
        year: newVehicle.year && Number.isFinite(year) ? year : undefined,
      });
      onVehicleCreated(res.data);
      setVehicleId(res.data.id);
      setNewVehicleOpen(false);
      setNewVehicle({ plate: '', brand: '', model: '', year: '', color: '', vin: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Não foi possível cadastrar o veículo.');
    } finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const items = [...AREAS, ...ACCESSORIES]
        .filter((a) => conditions[a.key])
        .map((a) => ({ area: a.key, condition: conditions[a.key] }));
      const payload: any = {
        orderType,
        customerId,
        vehicleId: vehicleId || undefined,
        kmEntrada: vehicleId ? kmEntrada : undefined,
        complaint: complaint.trim() || undefined,
        scheduledDate: scheduledDate || undefined,
        reserveStock,
        equipmentBrand: isRetifica ? engine.brand || undefined : undefined,
        equipmentModel: isRetifica ? engine.model || undefined : undefined,
        serialNumber: isRetifica ? engine.serial || undefined : undefined,
        checklist: needsChecklist
          ? {
              fuelLevel: fuel,
              observations: observations.trim() || undefined,
              completedBy: completedBy.trim() || undefined,
              ownerType,
              ownerName: ownerName.trim() || undefined,
              items,
            }
          : undefined,
      };
      const res = await serviceOrdersApi.create(payload);
      toast.success(`Orçamento salvo com o número ${orderCode(res.data)}.`);
      onCreated(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Não foi possível salvar. Confira os dados.');
    } finally { setBusy(false); }
  };

  const typeOptions: { value: OrderType; label: string; desc: string }[] = [
    { value: 'ORCAMENTO', label: 'Orçamento', desc: 'Aguarda a aprovação do cliente' },
    { value: 'ORDEM_SERVICO', label: 'Ordem de Serviço', desc: 'Serviço já autorizado' },
    ...(canUseRetifica ? [{ value: 'RETIFICA_MOTOR' as OrderType, label: 'Retífica', desc: 'Motor avulso ou fluxo técnico' }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/50" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Novo orçamento"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex w-full max-w-4xl flex-col overflow-hidden bg-app shadow-2xl sm:rounded-xl"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-ink">Novo {orderType === 'ORCAMENTO' ? 'orçamento' : orderType === 'ORDEM_SERVICO' ? 'ordem de serviço' : 'atendimento de retífica'}</h2>
            <span className="rounded-full bg-panel-2 px-3 py-1 text-xs font-semibold text-muted">Rascunho · o número é gerado ao salvar</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Descartar e fechar" className="rounded-md p-2 text-muted hover:bg-panel-2"><X size={20} /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div role="radiogroup" aria-label="Tipo de documento" className="grid gap-2 sm:grid-cols-3">
            {typeOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={orderType === o.value}
                onClick={() => setOrderType(o.value)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  orderType === o.value ? 'border-accent bg-accent-soft' : 'border-line bg-panel hover:bg-panel-2',
                )}
              >
                <span className="block text-sm font-bold text-ink">{o.label}</span>
                <span className="block text-xs text-muted">{o.desc}</span>
              </button>
            ))}
          </div>

          <Section step={1} title="Cliente">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[16rem] flex-1">
                <Field label="Cliente *" htmlFor="ns-customer">
                  <select
                    id="ns-customer"
                    className={field}
                    value={customerId}
                    onChange={(e) => { setCustomerId(e.target.value); setVehicleId(''); setNewVehicleOpen(false); }}
                  >
                    <option value="">Selecione um cliente...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <button type="button" onClick={() => setNewCustomerOpen((v) => !v)} className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line px-4 text-sm font-semibold text-accent-ink hover:bg-accent-soft">
                <Plus size={14} /> {newCustomerOpen ? 'Fechar cadastro' : 'Novo cliente'}
              </button>
            </div>
            {newCustomerOpen && (
              <div className="mt-4 grid gap-3 rounded-lg bg-panel-2 p-4 sm:grid-cols-2">
                <Field label="Nome *" htmlFor="nc-name"><input id="nc-name" className={field} value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} /></Field>
                <Field label="CPF ou CNPJ" htmlFor="nc-doc"><input id="nc-doc" className={field} value={newCustomer.document} onChange={(e) => setNewCustomer({ ...newCustomer, document: e.target.value })} /></Field>
                <Field label="Telefone" htmlFor="nc-phone"><input id="nc-phone" className={field} value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} /></Field>
                <Field label="E-mail" htmlFor="nc-mail"><input id="nc-mail" type="email" className={field} value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} /></Field>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="button" onClick={saveCustomer} disabled={busy} className="h-10 rounded-md bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50">Salvar cliente</button>
                </div>
              </div>
            )}
          </Section>

          <Section step={2} title={isRetifica ? 'Motor e veículo' : 'Veículo'} hint="Todos os dados do veículo ficam aqui: placa, modelo, quilometragem de entrada.">
            {!customerId ? (
              <p className="text-sm text-muted">Escolha o cliente para ver os veículos dele.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[16rem] flex-1">
                    <Field label={`Veículo ${isRetifica ? '(opcional)' : '*'}`} htmlFor="ns-vehicle">
                      <select id="ns-vehicle" className={field} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                        <option value="">{isRetifica ? 'Motor avulso / sem veículo' : 'Selecione um veículo...'}</option>
                        {customerVehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} · {v.brand} {v.model}</option>)}
                      </select>
                    </Field>
                  </div>
                  <button type="button" onClick={() => setNewVehicleOpen((v) => !v)} className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line px-4 text-sm font-semibold text-accent-ink hover:bg-accent-soft">
                    <Plus size={14} /> {newVehicleOpen ? 'Fechar cadastro' : 'Novo veículo'}
                  </button>
                </div>

                {newVehicleOpen && (
                  <div className="grid gap-3 rounded-lg bg-panel-2 p-4 sm:grid-cols-3">
                    <Field label="Placa *" htmlFor="nv-plate"><input id="nv-plate" className={cn(field, 'uppercase')} value={newVehicle.plate} onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })} /></Field>
                    <Field label="Marca *" htmlFor="nv-brand"><input id="nv-brand" className={field} value={newVehicle.brand} onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })} /></Field>
                    <Field label="Modelo *" htmlFor="nv-model"><input id="nv-model" className={field} value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} /></Field>
                    <Field label="Ano" htmlFor="nv-year"><NumberInput id="nv-year" className={field} value={newVehicle.year} onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })} /></Field>
                    <Field label="Cor" htmlFor="nv-color"><input id="nv-color" className={field} value={newVehicle.color} onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })} /></Field>
                    <Field label="Chassi / VIN" htmlFor="nv-vin"><input id="nv-vin" maxLength={17} className={cn(field, 'uppercase')} value={newVehicle.vin} onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })} /></Field>
                    <div className="sm:col-span-3 flex justify-end">
                      <button type="button" onClick={saveVehicle} disabled={busy} className="h-10 rounded-md bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50">Salvar veículo</button>
                    </div>
                  </div>
                )}

                {selectedVehicle && (
                  <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-panel-2 p-4 text-sm sm:grid-cols-4">
                    <div><dt className="text-xs text-muted">Placa</dt><dd className="font-semibold text-ink">{selectedVehicle.plate}</dd></div>
                    <div><dt className="text-xs text-muted">Veículo</dt><dd className="font-semibold text-ink">{selectedVehicle.brand} {selectedVehicle.model}</dd></div>
                    <div><dt className="text-xs text-muted">Ano / cor</dt><dd className="font-semibold text-ink">{selectedVehicle.year || '—'} / {selectedVehicle.color || '—'}</dd></div>
                    <div><dt className="text-xs text-muted">Chassi</dt><dd className="font-semibold text-ink">{selectedVehicle.vin || '—'}</dd></div>
                  </dl>
                )}

                {openForVehicle.length > 0 && (
                  <p className="flex items-start gap-2 rounded-lg bg-panel-2 p-3 text-xs text-muted">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                    Este veículo já tem {openForVehicle.length} atendimento(s) em aberto: {openForVehicle.map((o) => `#${orderCode(o)}`).join(', ')}. Confira se não é duplicado.
                  </p>
                )}

                {isRetifica && !vehicleId && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Marca do motor" htmlFor="ns-eb"><input id="ns-eb" className={field} placeholder="Ex.: VW" value={engine.brand} onChange={(e) => setEngine({ ...engine, brand: e.target.value })} /></Field>
                    <Field label="Modelo / família" htmlFor="ns-em"><input id="ns-em" className={field} placeholder="Ex.: AP 1.8" value={engine.model} onChange={(e) => setEngine({ ...engine, model: e.target.value })} /></Field>
                    <Field label="Número de série" htmlFor="ns-es"><input id="ns-es" className={field} value={engine.serial} onChange={(e) => setEngine({ ...engine, serial: e.target.value })} /></Field>
                  </div>
                )}

                {vehicleId && (
                  <div className="max-w-[14rem]">
                    <Field label="KM de entrada" htmlFor="ns-km">
                      <NumberInput id="ns-km" className={field} value={kmEntrada} onChange={(e) => setKmEntrada(Number(e.target.value))} />
                    </Field>
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section step={3} title="Atendimento">
            <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
              <Field label="Reclamação do cliente" htmlFor="ns-complaint">
                <textarea id="ns-complaint" rows={3} className={cn(field, 'resize-none')} placeholder="O que o cliente relatou?" value={complaint} onChange={(e) => setComplaint(e.target.value)} />
              </Field>
              <div className="space-y-3">
                <Field label="Agendamento (opcional)" htmlFor="ns-schedule">
                  <input id="ns-schedule" type="datetime-local" className={field} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                </Field>
                <label className="flex items-start gap-2 text-xs text-muted">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={reserveStock} onChange={(e) => setReserveStock(e.target.checked)} />
                  Reservar peças e debitar do estoque na aprovação
                </label>
              </div>
            </div>
          </Section>

          {needsChecklist && (
            <Section step={4} title="Checklist de entrada" hint="Obrigatório: basta uma informação para salvar. O restante é responsabilidade de quem faz a vistoria.">
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">Combustível</p>
                  <div role="radiogroup" aria-label="Nível de combustível" className="flex flex-wrap gap-2">
                    {FUEL_STEPS.map((f) => (
                      <button key={f.value} type="button" role="radio" aria-checked={fuel === f.value && fuel > 0}
                        onClick={() => setFuel(fuel === f.value ? 0 : f.value)}
                        className={cn('h-10 min-w-[4rem] rounded-md border px-3 text-sm font-semibold transition-colors',
                          fuel === f.value && fuel > 0 ? 'border-accent bg-accent text-white' : 'border-line bg-panel text-ink hover:bg-panel-2')}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">Estado da lataria e do interior</p>
                  <div className="grid gap-2">
                    {AREAS.map((a) => (
                      <div key={a.key} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
                        <span className="text-sm text-ink">{a.label}</span>
                        <div className="flex flex-wrap justify-end gap-1">
                          {CONDITIONS.map((c) => (
                            <button key={c.key} type="button" aria-pressed={conditions[a.key] === c.key}
                              onClick={() => setCondition(a.key, c.key)}
                              className={cn('rounded-md border px-2 py-1 text-xs font-semibold transition-colors',
                                conditions[a.key] === c.key ? c.color : 'border-line bg-panel text-muted hover:bg-panel-2')}>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">Acessórios e objetos no veículo</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {ACCESSORIES.map((a) => (
                      <div key={a.key} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
                        <span className="text-sm text-ink">{a.label}</span>
                        <div className="flex gap-1">
                          {ACCESSORY_CONDITIONS.map((c) => (
                            <button key={c.key} type="button" aria-pressed={conditions[a.key] === c.key}
                              onClick={() => setCondition(a.key, c.key)}
                              className={cn('rounded-md border px-2 py-1 text-xs font-semibold transition-colors',
                                conditions[a.key] === c.key ? c.color : 'border-line bg-panel text-muted hover:bg-panel-2')}>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Vistoria feita por" htmlFor="ns-by"><input id="ns-by" className={field} value={completedBy} onChange={(e) => setCompletedBy(e.target.value)} /></Field>
                  <Field label="Quem entregou o veículo" htmlFor="ns-owner">
                    <select id="ns-owner" className={field} value={ownerType} onChange={(e) => setOwnerType(e.target.value as 'PROPRIETARIO' | 'DELEGADO')}>
                      <option value="PROPRIETARIO">O proprietário</option>
                      <option value="DELEGADO">Outra pessoa</option>
                    </select>
                  </Field>
                  {ownerType === 'DELEGADO' && (
                    <Field label="Nome de quem entregou" htmlFor="ns-owner-name"><input id="ns-owner-name" className={field} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></Field>
                  )}
                </div>
                <Field label="Observações da vistoria" htmlFor="ns-obs">
                  <textarea id="ns-obs" rows={2} className={cn(field, 'resize-none')} value={observations} onChange={(e) => setObservations(e.target.value)} />
                </Field>
                <p className="fotos-hint text-xs text-muted">Fotos de cada item podem ser adicionadas depois de salvar, no botão Entrada da O.S.</p>
              </div>
            </Section>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel px-6 py-4">
          <p className={cn('flex items-center gap-2 text-sm', canSave ? 'text-accent-ink' : 'text-muted')} role="status">
            {canSave ? <><CheckCircle2 size={16} /> Pronto para salvar</> : <>Falta preencher: {missing.join(', ')}.</>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-11 rounded-md px-5 text-sm font-semibold text-muted hover:bg-panel-2">Descartar</button>
            <button type="button" onClick={save} disabled={!canSave} className="h-11 rounded-md bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? 'Salvando...' : 'Salvar e gerar número'}
            </button>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
