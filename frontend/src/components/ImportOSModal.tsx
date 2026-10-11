import { useState } from 'react';
import { X, FileUp, Loader2, CheckCircle2, AlertCircle, Car, User, Trash2, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { serviceOrdersApi, customersApi, vehiclesApi } from '../api/client';
import { cn } from '../lib/utils';

import { NumberInput } from './ui';
interface ImportOSModalProps {
  onClose: () => void;
  onSuccess: () => void;
  targetOrderId?: string;
}

export function ImportOSModal({ onClose, onSuccess, targetOrderId }: ImportOSModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const isAppendMode = Boolean(targetOrderId);

  const parseApiError = (err: any, fallback: string) => {
    const message = err?.response?.data?.message;
    if (Array.isArray(message)) return message.join(' • ');
    if (typeof message === 'string') return message;
    return fallback;
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await serviceOrdersApi.importPdf(file);
      setData(res.data);
      setStep('review');
    } catch (err: any) {
      setError(parseApiError(err, 'Erro ao processar PDF. Verifique se a chave da API do Google está configurada corretamente no .env do backend.'));
    } finally {
      setLoading(false);
    }
  };

  const updateCustomerField = (field: string, value: string) => {
    setData({ ...data, customer: { ...data.customer, [field]: value } });
  };

  const updateVehicleField = (field: string, value: string) => {
    setData({ ...data, vehicle: { ...data.vehicle, [field]: value } });
  };

  const updateItemField = (idx: number, field: string, value: any) => {
    const newItems = [...(data?.items || [])];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setData({ ...data, items: newItems });
  };

  const removeItem = (idx: number) => {
    const newItems = data.items.filter((_: any, i: number) => i !== idx);
    setData({ ...data, items: newItems });
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAppendMode && targetOrderId) {
        const currentOrder = await serviceOrdersApi.getById(targetOrderId);
        const currentComplaint = String(currentOrder.data?.complaint || '').trim();
        const currentObservations = String(currentOrder.data?.observations || '').trim();
        const importedObservations = String(data?.observations || '').trim();
        const importedComplaint = String(data?.complaint || '').trim();
        const importedNotes = String(data?.notes || '').trim();
        const importedDiagnosis = String(data?.diagnosis || '').trim();
        const currentNotes = String(currentOrder.data?.notes || '').trim();
        const currentDiagnosis = String(currentOrder.data?.diagnosis || '').trim();

        for (const item of data?.items || []) {
          await serviceOrdersApi.addItem(targetOrderId, {
            type: item.type === 'service' ? 'service' : 'part',
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            discount: Number(item.discount) || 0,
            internalCode: item.internalCode,
          });
        }

        if (importedObservations || importedNotes || importedDiagnosis || (!currentComplaint && importedComplaint)) {
          const mergedObservations = currentObservations
            ? `${currentObservations}\n\n${importedObservations}`
            : importedObservations;

          await serviceOrdersApi.update(targetOrderId, {
            observations: mergedObservations,
            ...(importedNotes ? { notes: currentNotes ? `${currentNotes}

${importedNotes}` : importedNotes } : {}),
            ...(importedDiagnosis && !currentDiagnosis ? { diagnosis: importedDiagnosis } : {}),
            ...(currentComplaint ? {} : { complaint: importedComplaint || importedObservations }),
          });
        }

        onSuccess();
        onClose();
        return;
      }

      // 1. Garantir Cliente
      const clean = (v: any) => {
        const t = typeof v === 'string' ? v.trim() : v;
        return t ? t : undefined;
      };
      const customerName = clean(data.customer?.name) || 'Cliente importado';
      const customerDocument = clean(data.customer?.document);
      let customerId = '';
      try {
        const cRes = await customersApi.getAll();
        const existingCustomer = cRes.data.find((c: any) =>
          (customerDocument && c.document === customerDocument) ||
          String(c.name || '').toLowerCase() === customerName.toLowerCase()
        );

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const email = clean(data.customer?.email);
          const newC = await customersApi.create({
            name: customerName,
            document: customerDocument,
            phone: clean(data.customer?.phone),
            email: email && /^\S+@\S+\.\S+$/.test(email) ? email : undefined,
            address: clean(data.customer?.address),
            rg: clean(data.customer?.rg),
            cep: clean(data.customer?.cep),
            cidade: clean(data.customer?.cidade),
            estado: clean(data.customer?.estado),
          });
          customerId = newC.data.id;
        }
      } catch (e) {
        console.error('Erro ao processar cliente', e);
        throw new Error(parseApiError(e, 'Não foi possível cadastrar o cliente da importação.'));
      }

      // 2. Garantir Veículo
      let vehicleId = '';
      try {
        const vSearch = await vehiclesApi.searchByPlate(data.vehicle.plate);
        if (vSearch.data) {
          vehicleId = vSearch.data.id;
        } else {
          const newV = await vehiclesApi.create({
            customerId,
            brand: data.vehicle.brand || 'Importado',
            model: data.vehicle.model,
            plate: data.vehicle.plate.toUpperCase(),
            year: data.vehicle.year ? parseInt(data.vehicle.year) : null,
            km: data.vehicle.km ? parseInt(data.vehicle.km) : null,
            vin: data.vehicle.vin,
            color: data.vehicle.color,
          });
          vehicleId = newV.data.id;
        }
      } catch (e) {
        // Se a busca falhar (404), tentamos criar
        const newV = await vehiclesApi.create({
          customerId,
          brand: data.vehicle.brand || 'Importado',
          model: data.vehicle.model,
          plate: data.vehicle.plate.toUpperCase(),
          year: data.vehicle.year ? parseInt(data.vehicle.year) : null,
          km: data.vehicle.km ? parseInt(data.vehicle.km) : null,
          vin: data.vehicle.vin,
          color: data.vehicle.color,
        });
        vehicleId = newV.data.id;
      }

      // 3. Criar OS
      const created = await serviceOrdersApi.create({
        customerId,
        vehicleId,
        orderType: 'ORCAMENTO',
        complaint: clean(data.complaint) || clean(data.observations) || 'Orçamento importado de terceiros',
        observations: clean(data.observations) || '',
        notes: clean(data.notes),
        equipmentBrand: clean(data.equipment?.brand),
        equipmentModel: clean(data.equipment?.model),
        serialNumber: clean(data.equipment?.serialNumber),
        scheduledDate: clean(data.scheduledDate),
        kmEntrada: data.vehicle.km ? parseInt(data.vehicle.km) : 0,
        items: data.items.map((it: any) => ({
          type: it.type,
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discount: Number(it.discount) || 0,
          internalCode: it.internalCode,
        })),
      });

      // Campos que o cadastro inicial não aceita: diagnóstico, laudo e forma de pagamento
      const extras: Record<string, string> = {};
      if (clean(data.diagnosis)) extras.diagnosis = clean(data.diagnosis);
      if (clean(data.technicalReport)) extras.technicalReport = clean(data.technicalReport);
      if (clean(data.paymentMethod)) extras.paymentMethod = clean(data.paymentMethod);
      if (Object.keys(extras).length > 0 && created?.data?.id) {
        try {
          await serviceOrdersApi.update(created.data.id, extras);
        } catch (e) {
          console.error('Erro ao complementar OS importada', e);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(parseApiError(err, 'Erro ao criar Ordem de Serviço. Verifique os dados informados.'));
    } finally {
      setLoading(false);
    }
  };

  const totalCalculated = (data?.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface-900 rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-line flex items-center justify-between bg-surface-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-white shadow-lg shadow-md">
              <FileUp size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-50 uppercase tracking-tight">
                {isAppendMode ? 'Importar Orçamento Externo na O.S.' : 'Importar Orçamento PDF'}
              </h2>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wide">IA Assistida · Verifique os dados abaixo</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-ink/5 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {step === 'upload' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-24 h-24 bg-surface-800 rounded-[32px] flex items-center justify-center text-surface-500 mb-6 border-2 border-dashed border-line">
                <FileUp size={40} />
              </div>
              <h3 className="text-xl font-bold text-surface-50 mb-2">Selecione o arquivo PDF</h3>
              <p className="text-sm text-surface-400 mb-8 text-center max-w-md">
                Nossa IA irá ler o orçamento e extrair automaticamente os dados do cliente, veículo, peças e serviços.
              </p>

              <input
                type="file"
                id="pdf-upload"
                className="hidden"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="pdf-upload"
                className={cn(
                  "cursor-pointer px-8 py-4 rounded-lg font-bold text-sm uppercase tracking-wide transition-all shadow-xl flex items-center gap-3",
                  file ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200" : "bg-accent text-white hover:bg-accent-hover shadow-black/40"
                )}
              >
                {file ? <CheckCircle2 size={20} /> : <FileUp size={20} />}
                {file ? file.name : "Escolher Arquivo"}
              </label>

              {error && (
                <div className="mt-8 p-4 bg-red-500/10 text-red-700 rounded-lg flex items-center gap-3 text-sm font-bold border border-red-500/25">
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}

              <div className="mt-12 w-full max-w-md">
                <button type="button"
                  disabled={!file || loading}
                  onClick={handleUpload}
                  className="w-full py-4 bg-accent text-white rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-md flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : "Processar Orçamento"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {!isAppendMode && <div className="grid grid-cols-2 gap-8">
                {/* Cliente */}
                <div className="p-6 bg-surface-950/40 rounded-xl border border-line">
                  <div className="flex items-center gap-2 mb-6 text-accent-ink border-b border-line pb-3">
                    <User size={18} />
                    <h4 className="text-xs font-semibold uppercase tracking-wide">Dados do Cliente</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label htmlFor="fld-importosmodal-1" className="block text-sm font-semibold text-muted mb-1">Nome Completo</label>
                      <input id="fld-importosmodal-1" 
                        className="w-full bg-surface-900 border border-line rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-accent transition-all"
                        value={data.customer.name}
                        onChange={(e) => updateCustomerField('name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="fld-importosmodal-2" className="block text-sm font-semibold text-muted mb-1">CPF / CNPJ</label>
                      <input id="fld-importosmodal-2" 
                        className="w-full bg-surface-900 border border-line rounded-xl px-3 py-2 text-sm font-bold"
                        value={data.customer.document}
                        onChange={(e) => updateCustomerField('document', e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="fld-importosmodal-3" className="block text-sm font-semibold text-muted mb-1">Telefone</label>
                      <input id="fld-importosmodal-3" 
                        className="w-full bg-surface-900 border border-line rounded-xl px-3 py-2 text-sm font-bold"
                        value={data.customer.phone}
                        onChange={(e) => updateCustomerField('phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Veículo */}
                <div className="p-6 bg-surface-950/40 rounded-xl border border-line">
                  <div className="flex items-center gap-2 mb-6 text-emerald-600 border-b border-line pb-3">
                    <Car size={18} />
                    <h4 className="text-xs font-semibold uppercase tracking-wide">Dados do Veículo</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label htmlFor="fld-importosmodal-b305" className="block text-sm font-semibold text-muted mb-1">Marca / Modelo</label>
                      <div className="flex gap-2">
                        <input id="fld-importosmodal-b305" 
                          className="w-1/3 bg-surface-900 border border-line rounded-xl px-3 py-2 text-sm font-bold"
                          placeholder="Marca"
                          value={data.vehicle.brand}
                          onChange={(e) => updateVehicleField('brand', e.target.value)}
                        />
                        <input aria-label="Modelo" 
                          className="w-2/3 bg-surface-900 border border-line rounded-xl px-3 py-2 text-sm font-bold"
                          placeholder="Modelo"
                          value={data.vehicle.model}
                          onChange={(e) => updateVehicleField('model', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="fld-importosmodal-4" className="block text-sm font-semibold text-muted mb-1">Placa</label>
                      <input id="fld-importosmodal-4" 
                        className="w-full bg-surface-900 border border-line rounded-xl px-3 py-2 text-sm font-bold uppercase font-mono"
                        value={data.vehicle.plate}
                        onChange={(e) => updateVehicleField('plate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="fld-importosmodal-5" className="block text-sm font-semibold text-muted mb-1">KM Atual</label>
                      <NumberInput id="fld-importosmodal-5" 
                        className="w-full bg-surface-900 border border-line rounded-xl px-3 py-2 text-sm font-bold"
                        value={data.vehicle.km}
                        onChange={(e) => updateVehicleField('km', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>}

              {isAppendMode && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-700 font-semibold">
                  Os dados de cliente e veículo da O.S. serão mantidos. A importação irá adicionar os itens do PDF e anexar as observações extraídas.
                </div>
              )}

              {/* Observações do PDF */}
              {(data.complaint || data.diagnosis || data.observations || data.notes || data.paymentMethod || data._warnings) && (
                <div className="p-5 bg-amber-500/10 rounded-xl border border-amber-500/30 space-y-4">
                  <div>
                    <label htmlFor="fld-importosmodal-complaint" className="text-[11px] font-bold text-amber-600 uppercase mb-2 block">Defeito / reclamação extraído do PDF</label>
                    <textarea id="fld-importosmodal-complaint"
                      className="w-full bg-surface-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-amber-400 transition-all resize-none"
                      rows={2}
                      value={data.complaint || ''}
                      onChange={(e) => setData({ ...data, complaint: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="fld-importosmodal-diagnosis" className="text-[11px] font-bold text-amber-600 uppercase mb-2 block">Diagnóstico / laudo constatado</label>
                    <textarea id="fld-importosmodal-diagnosis"
                      className="w-full bg-surface-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-amber-400 transition-all resize-none"
                      rows={2}
                      value={data.diagnosis || ''}
                      onChange={(e) => setData({ ...data, diagnosis: e.target.value })}
                    />
                  </div>
                  <div>
                  <label htmlFor="fld-importosmodal-6" className="text-[11px] font-bold text-amber-600 uppercase mb-2 block">Sugestões e observações extraídas do PDF</label>
                  <textarea id="fld-importosmodal-6"
                    className="w-full bg-surface-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-amber-400 transition-all resize-none"
                    rows={3}
                    value={data.observations || ''}
                    onChange={(e) => setData({ ...data, observations: e.target.value })}
                  />
                  </div>
                  <div>
                    <label htmlFor="fld-importosmodal-notes" className="text-[11px] font-bold text-amber-600 uppercase mb-2 block">Garantia, prazos e condições</label>
                    <textarea id="fld-importosmodal-notes"
                      className="w-full bg-surface-900 border border-amber-500/30 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-amber-400 transition-all resize-none"
                      rows={2}
                      value={data.notes || ''}
                      onChange={(e) => setData({ ...data, notes: e.target.value })}
                    />
                  </div>
                  {data.paymentMethod && (
                    <p className="text-[11px] text-amber-700 font-bold">Forma de pagamento identificada: {data.paymentMethod}</p>
                  )}
                  {data._warnings && (
                    <p className="text-[11px] text-amber-600 font-bold mt-1">{data._warnings.join(' ')}</p>
                  )}
                </div>
              )}

              {/* Itens */}
              <div className="border border-line rounded-xl overflow-hidden bg-surface-900 shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-accent text-white">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-surface-500">Tipo</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-surface-500">Código / Descrição</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-surface-500 text-center w-24">Qtd</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-surface-500 text-right w-32">Unitário</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-surface-500 text-right w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.items.map((item: any, idx: number) => (
                      <tr key={idx} className="group hover:bg-ink/5 transition-colors">
                        <td className="px-6 py-4">
                          <select aria-label="Tipo do item" 
                            className={cn(
                              "text-[11px] font-bold uppercase px-2 py-1 rounded border-none focus:ring-0 cursor-pointer",
                              item.type === 'part' ? "bg-amber-500/15 text-amber-700" : "bg-blue-500/15 text-blue-700"
                            )}
                            value={item.type}
                            onChange={(e) => updateItemField(idx, 'type', e.target.value)}
                          >
                            <option value="part">Peça</option>
                            <option value="service">Serviço</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <input aria-label="Código de fábrica" 
                              className="text-[11px] font-bold text-surface-500 uppercase bg-transparent border-none p-0 focus:ring-0 placeholder:text-surface-600"
                              placeholder="Código de fábrica"
                              value={item.internalCode || ''}
                              onChange={(e) => updateItemField(idx, 'internalCode', e.target.value)}
                            />
                            <input aria-label="Descrição do item" 
                              className="text-sm font-bold text-surface-200 bg-transparent border-none p-0 focus:ring-0 w-full"
                              value={item.description}
                              onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <NumberInput aria-label="Quantidade"
                            className="w-full bg-surface-800 border-none rounded-lg px-2 py-1 text-sm font-bold text-center focus:ring-2 focus:ring-accent"
                            value={item.quantity}
                            onChange={(e) => updateItemField(idx, 'quantity', e.target.value)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-surface-500">R$</span>
                            <NumberInput aria-label="Valor unitário"
                              className="w-full bg-surface-800 border-none rounded-lg pl-7 pr-2 py-1 text-sm font-bold text-right focus:ring-2 focus:ring-accent"
                              value={item.unitPrice}
                              onChange={(e) => updateItemField(idx, 'unitPrice', e.target.value)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button type="button" 
                            onClick={() => removeItem(idx)}
                            className="p-2 text-surface-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-surface-950/40 border-t border-line">
                    <tr>
                      <td colSpan={3} className="px-6 py-6 font-semibold uppercase tracking-wide text-xs text-surface-400 text-right">Valor Total da O.S.</td>
                      <td className="px-6 py-6 text-right font-bold text-2xl text-surface-50">
                        R$ {totalCalculated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 text-red-700 rounded-lg flex items-center gap-3 text-sm font-bold border border-red-500/25 shadow-sm">
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line bg-surface-950/40 flex justify-end gap-3">
          <button type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wide text-surface-400 hover:bg-ink/5 transition-all"
          >
            Cancelar
          </button>
          {step === 'review' && (
            <button type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="px-8 py-3 bg-accent text-white rounded-lg font-bold text-xs uppercase tracking-wide hover:bg-accent-hover transition-all shadow-xl shadow-black/40 flex items-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {isAppendMode ? 'Importar na O.S. Aberta' : 'Confirmar e Abrir O.S.'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
