import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Link2, Loader2 } from 'lucide-react';
import { inventoryApi, servicesApi, suppliersApi } from '../api/client';
import { CATEGORIES, UNITS, generateInternalCode } from '../pages/InventoryPage';
import { NumberInput, CurrencyInput } from './ui';

interface OrderItemSeed {
  description: string;
  internalCode?: string | null;
  unitPrice: number;
  quantity: number;
}

interface CatalogRegisterModalProps {
  type: 'part' | 'service';
  item: OrderItemSeed;
  onClose: () => void;
  /** Chamado com o registro do cadastro (recém-criado ou já existente escolhido) */
  onSaved: (record: any) => void | Promise<void>;
}

const norm = (v: any) =>
  String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const inputCls =
  'w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm';

export function CatalogRegisterModal({ type, item, onClose, onSaved }: CatalogRegisterModalProps) {
  const isPart = type === 'part';
  const [existing, setExisting] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [part, setPart] = useState({
    name: item.description,
    internalCode: item.internalCode || '',
    sku: '',
    category: '',
    unit: 'un',
    unitPrice: Number(item.unitPrice) || 0,
    costPrice: 0,
    minStock: 0,
    currentStock: 0,
    location: '',
    supplierId: '',
    description: '',
  });
  const [service, setService] = useState({
    name: item.description,
    description: '',
    basePrice: Number(item.unitPrice) || 0,
    category: '',
    duration: 60,
    hourlyRate: 0,
    tmo: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        if (isPart) {
          const [p, s] = await Promise.all([inventoryApi.getAllParts(), suppliersApi.getAll()]);
          setExisting(p.data);
          setSuppliers(s.data);
        } else {
          const s = await servicesApi.getAll();
          setExisting(s.data);
        }
      } catch (e) {
        console.error('Erro ao carregar cadastro', e);
      }
    })();
  }, [isPart]);

  const name = isPart ? part.name : service.name;
  const code = isPart ? part.internalCode : '';

  // Já existe algo igual no cadastro? Oferece vincular em vez de duplicar.
  const duplicate = existing.find((r) =>
    (norm(r.name) === norm(name) && norm(name) !== '') ||
    (isPart && code.trim() !== '' && norm(r.internalCode) === norm(code)),
  );

  const parseError = (err: any, fallback: string) => {
    const msg = err?.response?.data?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let record: any;
      if (isPart) {
        const clean = (v?: string) => (v?.trim() ? v.trim() : undefined);
        const res = await inventoryApi.createPart({
          ...part,
          name: part.name.trim(),
          internalCode: clean(part.internalCode),
          sku: clean(part.sku),
          category: clean(part.category),
          description: clean(part.description),
          location: clean(part.location),
          supplierId: clean(part.supplierId),
        });
        record = res.data;
      } else {
        const res = await servicesApi.create({ ...service, name: service.name.trim() });
        record = res.data;
      }
      await onSaved(record);
    } catch (err: any) {
      setError(parseError(err, isPart ? 'Erro ao salvar peça.' : 'Erro ao salvar serviço.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAutoCode = () => {
    if (!part.category || !part.name.trim()) return;
    const codes = existing.map((p) => p.internalCode).filter(Boolean);
    setPart({ ...part, internalCode: generateInternalCode(part.name, part.category, codes) });
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-surface-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        <div className="px-8 py-5 border-b border-line flex items-center justify-between bg-surface-950/40 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-surface-50 uppercase">
              {isPart ? 'Incluir peça no cadastro' : 'Incluir serviço no cadastro'}
            </h2>
            <p className="text-xs text-surface-400 font-semibold">
              Dados trazidos da O.S. — complete o restante. Ao salvar, o item da O.S. fica vinculado.
            </p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="p-2 hover:bg-ink/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
          {duplicate && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
              <p className="text-sm text-amber-800 font-semibold">
                Já existe no cadastro: <strong>{duplicate.internalCode ? `${duplicate.internalCode} - ` : ''}{duplicate.name}</strong>
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try { await onSaved(duplicate); } catch (err: any) { setError(parseError(err, 'Erro ao vincular.')); } finally { setSaving(false); }
                }}
                className="shrink-0 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-amber-600 disabled:opacity-60"
              >
                <Link2 size={14} /> Vincular a este
              </button>
            </div>
          )}

          {isPart ? (
            <>
              <div className="space-y-1.5">
                <label htmlFor="cr-part-name" className="block text-sm font-semibold text-muted">Nome da Peça *</label>
                <input id="cr-part-name" required value={part.name} onChange={(e) => setPart({ ...part, name: e.target.value })} className={`${inputCls} font-bold`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="cr-part-cat" className="block text-sm font-semibold text-muted">Categoria / Área</label>
                  <select id="cr-part-cat" value={part.category} onChange={(e) => setPart({ ...part, category: e.target.value })} className={`${inputCls} font-bold`}>
                    <option value="">Selecionar...</option>
                    {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cr-part-unit" className="block text-sm font-semibold text-muted">Tipo / Unidade</label>
                  <select id="cr-part-unit" value={part.unit} onChange={(e) => setPart({ ...part, unit: e.target.value })} className={`${inputCls} font-bold`}>
                    {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="cr-part-code" className="block text-sm font-semibold text-muted">Código Interno</label>
                    <button type="button" onClick={handleAutoCode} disabled={!part.category || !part.name.trim()}
                      title={!part.category ? 'Selecione a área/categoria' : 'Gerar código'}
                      className="flex items-center gap-1 text-[11px] font-bold text-accent-ink hover:text-accent-hover disabled:text-faint disabled:cursor-not-allowed">
                      <RefreshCw className="w-3 h-3" /> Gerar
                    </button>
                  </div>
                  <input id="cr-part-code" value={part.internalCode} onChange={(e) => setPart({ ...part, internalCode: e.target.value })} className={`${inputCls} font-mono font-bold`} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cr-part-sku" className="block text-sm font-semibold text-muted">SKU / Ref. Fabricante</label>
                  <input id="cr-part-sku" value={part.sku} onChange={(e) => setPart({ ...part, sku: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="cr-part-price" className="block text-sm font-semibold text-muted">Preço de Venda (R$) *</label>
                  <CurrencyInput id="cr-part-price" required step="0.01" min="0" value={part.unitPrice}
                    onChange={(e) => setPart({ ...part, unitPrice: Number(e.target.value) })} className={`${inputCls} font-bold`} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cr-part-cost" className="block text-sm font-semibold text-muted">Custo / Preço de Compra (R$)</label>
                  <CurrencyInput id="cr-part-cost" step="0.01" min="0" value={part.costPrice}
                    onChange={(e) => setPart({ ...part, costPrice: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="cr-part-min" className="block text-sm font-semibold text-muted">Estoque Mínimo</label>
                  <NumberInput id="cr-part-min" min="0" value={part.minStock}
                    onChange={(e) => setPart({ ...part, minStock: Number(e.target.value) })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cr-part-stock" className="block text-sm font-semibold text-muted">Quantidade em Estoque</label>
                  <NumberInput id="cr-part-stock" min="0" value={part.currentStock}
                    onChange={(e) => setPart({ ...part, currentStock: Number(e.target.value) })} className={`${inputCls} font-bold`} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cr-part-loc" className="block text-sm font-semibold text-muted">Localização</label>
                  <input id="cr-part-loc" value={part.location} onChange={(e) => setPart({ ...part, location: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cr-part-sup" className="block text-sm font-semibold text-muted">Fornecedor</label>
                <select id="cr-part-sup" value={part.supplierId} onChange={(e) => setPart({ ...part, supplierId: e.target.value })} className={inputCls}>
                  <option value="">Nenhum</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cr-part-desc" className="block text-sm font-semibold text-muted">Observações / Compatibilidade</label>
                <textarea id="cr-part-desc" value={part.description} onChange={(e) => setPart({ ...part, description: e.target.value })}
                  className={`${inputCls} min-h-[70px] resize-none`} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="cr-svc-name" className="block text-sm font-semibold text-muted">Nome do Serviço *</label>
                <input id="cr-svc-name" required value={service.name} onChange={(e) => setService({ ...service, name: e.target.value })} className={`${inputCls} font-bold`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="cr-svc-vh" className="block text-sm font-semibold text-muted">Valor Hora (VH)</label>
                  <CurrencyInput id="cr-svc-vh" step="0.01" value={service.hourlyRate}
                    onChange={(e) => setService({ ...service, hourlyRate: Number(e.target.value) })} className={`${inputCls} font-bold`} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cr-svc-tmo" className="block text-sm font-semibold text-muted">Tempo (TMO, em horas)</label>
                  <NumberInput id="cr-svc-tmo" step="0.01" value={service.tmo}
                    onChange={(e) => setService({ ...service, tmo: Number(e.target.value) })} className={`${inputCls} font-bold`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="cr-svc-price" className="block text-sm font-semibold text-muted">Preço Fixo (Base)</label>
                  <CurrencyInput id="cr-svc-price" step="0.01" value={service.basePrice}
                    onChange={(e) => setService({ ...service, basePrice: Number(e.target.value) })} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cr-svc-dur" className="block text-sm font-semibold text-muted">Duração Est. (min)</label>
                  <NumberInput id="cr-svc-dur" value={service.duration}
                    onChange={(e) => setService({ ...service, duration: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cr-svc-cat" className="block text-sm font-semibold text-muted">Categoria / Grupo</label>
                <input id="cr-svc-cat" value={service.category} onChange={(e) => setService({ ...service, category: e.target.value })}
                  placeholder="Ex: Mecânica, Elétrica, Suspensão" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cr-svc-desc" className="block text-sm font-semibold text-muted">Descrição</label>
                <textarea id="cr-svc-desc" value={service.description} onChange={(e) => setService({ ...service, description: e.target.value })}
                  className={`${inputCls} min-h-[80px]`} />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-surface-400 hover:bg-ink/5 transition-all">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-8 py-2.5 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover transition-all shadow-sm active:scale-95 disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isPart ? 'Cadastrar Peça' : 'Cadastrar Serviço'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
