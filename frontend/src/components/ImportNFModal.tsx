import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Loader2, X, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { inventoryApi } from '../api/client';

type ImportNFModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

type NFItem = {
  originalCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  type?: string;
  ncm?: string;
  origin?: string;
};

type NFPreview = {
  sourceType: 'XML' | 'PDF';
  invoice?: {
    number?: string;
    issueDate?: string;
    accessKey?: string;
  };
  supplier?: {
    name?: string;
    document?: string;
    phone?: string;
    email?: string;
  };
  items: NFItem[];
  warnings?: string[];
};

export function ImportNFModal({ onClose, onSuccess }: ImportNFModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [data, setData] = useState<NFPreview | null>(null);

  const totalAmount = useMemo(() => {
    if (!data?.items) return 0;
    return data.items.reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  }, [data]);

  const handleProcessFile = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const response = await inventoryApi.previewImportNF(file);
      setData(response.data);
      setStep('review');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao processar arquivo de NF.');
    } finally {
      setLoading(false);
    }
  };

  const updateSupplierField = (field: string, value: string) => {
    if (!data) return;
    setData({
      ...data,
      supplier: {
        ...(data.supplier || {}),
        [field]: value,
      },
    });
  };

  const updateInvoiceField = (field: string, value: string) => {
    if (!data) return;
    setData({
      ...data,
      invoice: {
        ...(data.invoice || {}),
        [field]: value,
      },
    });
  };

  const updateItemField = (index: number, field: keyof NFItem, value: any) => {
    if (!data) return;
    const nextItems = [...data.items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    setData({ ...data, items: nextItems });
  };

  const removeItem = (index: number) => {
    if (!data) return;
    const nextItems = data.items.filter((_, idx) => idx !== index);
    setData({ ...data, items: nextItems });
  };

  const handleConfirm = async () => {
    if (!data) return;

    setLoading(true);
    setError(null);
    try {
      const payload = {
        supplier: data.supplier || {},
        invoice: data.invoice || {},
        items: data.items.map((item) => ({
          originalCode: item.originalCode || undefined,
          description: item.description,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          unit: item.unit || 'un',
          type: item.type || undefined,
          ncm: item.ncm || undefined,
          origin: item.origin || undefined,
        })),
      };

      await inventoryApi.confirmImportNF(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao confirmar importação de NF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-line flex items-center justify-between bg-surface-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-surface-50 uppercase tracking-tight">Importar Nota Fiscal de Entrada</h2>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">XML/PDF com revisão antes da carga</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ink/5 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-700 text-sm font-semibold">
              {error}
            </div>
          )}

          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-line bg-surface-800 text-surface-500 flex items-center justify-center mb-5">
                <FileUp size={40} />
              </div>

              <h3 className="text-xl font-black text-surface-50">Selecione o arquivo da nota fiscal</h3>
              <p className="text-sm text-surface-400 mt-2 max-w-md">
                Aceita XML de NF-e e PDF. O sistema irá mapear código, fornecedor/origem, quantidade e valor unitário.
              </p>

              <input
                id="nf-upload"
                type="file"
                className="hidden"
                accept=".xml,.pdf,application/pdf,text/xml,application/xml"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              <label
                htmlFor="nf-upload"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-black text-sm cursor-pointer hover:bg-accent-hover transition-colors"
              >
                <FileUp size={16} /> Selecionar Arquivo
              </label>

              {file && (
                <p className="mt-3 text-sm font-bold text-surface-200">{file.name}</p>
              )}

              <button
                onClick={handleProcessFile}
                disabled={!file || loading}
                className="mt-5 inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-indigo-600 text-white font-black text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Processar Nota
              </button>
            </div>
          )}

          {step === 'review' && data && (
            <div className="space-y-6">
              {Array.isArray(data.warnings) && data.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 text-sm font-semibold space-y-1">
                  <div className="flex items-center gap-2"><AlertTriangle size={14} /> Atenção</div>
                  {data.warnings.map((w, idx) => (
                    <div key={idx}>{w}</div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-surface-500 uppercase tracking-widest">Fornecedor</label>
                  <input
                    value={data.supplier?.name || ''}
                    onChange={(e) => updateSupplierField('name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-line text-sm font-bold"
                    placeholder="Nome fornecedor"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-surface-500 uppercase tracking-widest">Documento</label>
                  <input
                    value={data.supplier?.document || ''}
                    onChange={(e) => updateSupplierField('document', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-line text-sm"
                    placeholder="CNPJ/CPF"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-surface-500 uppercase tracking-widest">Numero NF</label>
                  <input
                    value={data.invoice?.number || ''}
                    onChange={(e) => updateInvoiceField('number', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-line text-sm"
                    placeholder="Numero"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-surface-500 uppercase tracking-widest">Data Emissao</label>
                  <input
                    value={data.invoice?.issueDate || ''}
                    onChange={(e) => updateInvoiceField('issueDate', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-line text-sm"
                    placeholder="AAAA-MM-DD"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-line rounded-lg">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-surface-950/40 border-b border-line">
                    <tr>
                      <th className="px-3 py-3 text-left text-[10px] font-black text-surface-500 uppercase tracking-widest">Codigo Original</th>
                      <th className="px-3 py-3 text-left text-[10px] font-black text-surface-500 uppercase tracking-widest">Descricao</th>
                      <th className="px-3 py-3 text-left text-[10px] font-black text-surface-500 uppercase tracking-widest">Origem</th>
                      <th className="px-3 py-3 text-left text-[10px] font-black text-surface-500 uppercase tracking-widest">Tipo</th>
                      <th className="px-3 py-3 text-left text-[10px] font-black text-surface-500 uppercase tracking-widest">NCM</th>
                      <th className="px-3 py-3 text-right text-[10px] font-black text-surface-500 uppercase tracking-widest">Qtd</th>
                      <th className="px-3 py-3 text-right text-[10px] font-black text-surface-500 uppercase tracking-widest">Vlr Unit.</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black text-surface-500 uppercase tracking-widest">Un.</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black text-surface-500 uppercase tracking-widest">Acao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">
                          <input
                            value={item.originalCode || ''}
                            onChange={(e) => updateItemField(idx, 'originalCode', e.target.value)}
                            className="w-full px-2 py-2 rounded-lg border border-line text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.description}
                            onChange={(e) => updateItemField(idx, 'description', e.target.value)}
                            className="w-full px-2 py-2 rounded-lg border border-line text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.origin || ''}
                            onChange={(e) => updateItemField(idx, 'origin', e.target.value)}
                            className="w-full px-2 py-2 rounded-lg border border-line text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.type || ''}
                            onChange={(e) => updateItemField(idx, 'type', e.target.value)}
                            className="w-full px-2 py-2 rounded-lg border border-line text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.ncm || ''}
                            onChange={(e) => updateItemField(idx, 'ncm', e.target.value)}
                            className="w-full px-2 py-2 rounded-lg border border-line text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))}
                            className="w-full px-2 py-2 rounded-lg border border-line text-xs text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItemField(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full px-2 py-2 rounded-lg border border-line text-xs text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={item.unit || 'un'}
                            onChange={(e) => updateItemField(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-2 rounded-lg border border-line text-xs text-center"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-500/10 rounded-lg"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-950/40 border border-line rounded-lg p-4">
                <div className="text-sm text-surface-200 font-semibold">
                  Itens: <strong>{data.items.length}</strong> | Valor total: <strong>R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('upload')}
                    className="px-5 py-2.5 rounded-xl border border-line text-surface-200 font-bold text-sm"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={loading || data.items.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-sm disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Confirmar Entrada
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
