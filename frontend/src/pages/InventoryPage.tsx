import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { inventoryApi, suppliersApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  Package, Plus, Search, Edit, Trash2, Loader2,
  ArrowUpRight, ArrowDownLeft, AlertTriangle, Layers,
  X, ChevronDown, Building2, Tag, Hash, RefreshCw,
  Truck, CheckCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Constantes ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { code: 'FRE', label: 'Freios' },
  { code: 'MOT', label: 'Motor / Óleo' },
  { code: 'SUS', label: 'Suspensão' },
  { code: 'ELE', label: 'Elétrico' },
  { code: 'SEN', label: 'Sensores' },
  { code: 'ATU', label: 'Atuadores' },
  { code: 'EXA', label: 'Exaustão' },
  { code: 'REF', label: 'Refrigeração' },
  { code: 'REV', label: 'Revisão Geral' },
  { code: 'TRA', label: 'Transmissão' },
  { code: 'CAR', label: 'Carroceria' },
  { code: 'OUT', label: 'Outros' },
];

const UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'jg', label: 'Jogo (jg)' },
  { value: 'kt', label: 'Kit (kt)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'par', label: 'Par' },
  { value: 'm', label: 'Metro (m)' },
];

const EMPTY_FORM = {
  name: '', internalCode: '', sku: '', category: '',
  description: '', unitPrice: 0, costPrice: 0,
  unit: 'un', minStock: 0, currentStock: 0, location: '', supplierId: '',
};

// ─── Helper: gera código interno ──────────────────────────────────────────────
function generateInternalCode(category: string, existingCodes: string[]): string {
  const catCode = category || 'OUT';
  const prefix = catCode;
  const existing = existingCodes.filter((c) => c?.startsWith(prefix + '-'));
  const nums = existing.map((c) => parseInt(c.split('-')[1] || '0', 10)).filter(Boolean);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

// ─── Combobox de Fornecedor ───────────────────────────────────────────────────
function SupplierCombobox({ suppliers, value, onChange }: {
  suppliers: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = suppliers.find((s) => s.id === value);
  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold text-left flex items-center justify-between"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? selected.name : 'Selecionar fornecedor...'}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar fornecedor..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setQ(''); }}
                className="w-full px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 text-left transition-colors"
              >
                Nenhum (sem fornecedor)
              </button>
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400 text-center">Nenhum fornecedor encontrado</p>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onChange(s.id); setOpen(false); setQ(''); }}
                    className={cn(
                      'w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-slate-50 transition-colors',
                      value === s.id && 'bg-primary-50 text-primary-700 font-bold'
                    )}
                  >
                    <span>{s.name}</span>
                    {value === s.id && <CheckCircle className="w-4 h-4 text-primary-500" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Modal de Fornecedor ──────────────────────────────────────────────────────
function SupplierModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', document: '', phone: '', email: '', contactName: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await suppliersApi.create(form);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 uppercase">Novo Fornecedor</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Razão Social / Nome *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CNPJ / CPF</label>
              <input value={form.document} onChange={e => setForm({...form, document: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</label>
              <input value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
            <button type="submit" disabled={saving} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export function InventoryPage() {
  const { user } = useAuthStore();
  const [parts, setParts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState<any>(null);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [movQty, setMovQty] = useState(1);
  const [movType, setMovType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [movNote, setMovNote] = useState('');
  const canManageParts = user?.role === 'MASTER' || user?.role === 'ADMIN';

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setErrorMessage(null);
    try {
      const [partsRes, suppRes] = await Promise.all([inventoryApi.getAllParts(), suppliersApi.getAll()]);
      setParts(Array.isArray(partsRes.data) ? partsRes.data : []);
      setSuppliers(Array.isArray(suppRes.data) ? suppRes.data : []);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Nao foi possivel carregar o estoque de pecas.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => { setEditingPart(null); setFormData({ ...EMPTY_FORM }); setShowModal(true); };

  const openEdit = (part: any) => {
    setEditingPart(part);
    setFormData({
      name: part.name, internalCode: part.internalCode || '',
      sku: part.sku || '', category: part.category || '',
      description: part.description || '', unitPrice: Number(part.unitPrice),
      costPrice: Number(part.costPrice || 0), unit: part.unit || 'un',
      minStock: part.minStock || 0, currentStock: Number(part.currentStock || 0), location: part.location || '',
      supplierId: part.supplierId || '',
    });
    setShowModal(true);
  };

  const handleAutoCode = () => {
    if (!formData.category) return;
    const existing = parts.map((p) => p.internalCode).filter(Boolean);
    setFormData({ ...formData, internalCode: generateInternalCode(formData.category, existing) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageParts) {
      alert('Voce nao tem permissao para cadastrar ou editar pecas.');
      return;
    }
    try {
      const clean = (value?: string) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed : undefined;
      };

      const payload = {
        ...formData,
        internalCode: clean(formData.internalCode),
        sku: clean(formData.sku),
        category: clean(formData.category),
        description: clean(formData.description),
        location: clean(formData.location),
        supplierId: clean(formData.supplierId),
      };
      if (editingPart) {
        await inventoryApi.updatePart(editingPart.id, payload);
      } else {
        await inventoryApi.createPart(payload);
      }
      setShowModal(false);
      loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao salvar peca.');
      console.error(err);
    }
  };

  const handleMovement = async () => {
    if (!showMovModal) return;
    if (!canManageParts) {
      alert('Voce nao tem permissao para movimentar estoque. Use MASTER ou ADMIN.');
      return;
    }
    try {
      await inventoryApi.createMovement({ partId: showMovModal.id, type: movType, quantity: movQty, note: movNote });
      setShowMovModal(null);
      setMovQty(1); setMovNote('');
      loadAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao registrar movimentação');
    }
  };

  const filtered = useMemo(() => parts.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
      || (p.internalCode || '').toLowerCase().includes(search.toLowerCase())
      || (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCat;
  }), [parts, search, categoryFilter]);

  const totalValue = parts.reduce((s, p) => s + Number(p.unitPrice) * (p.currentStock || 0), 0);
  const lowStock = parts.filter((p) => (p.currentStock || 0) <= (p.minStock || 0)).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Estoque de Peças</h1>
          <p className="text-slate-500 font-medium">{parts.length} itens • {suppliers.length} fornecedores</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:border-slate-400 hover:bg-slate-50 transition-all text-sm">
            <Truck className="w-4 h-4" /> Fornecedor
          </button>
          <button onClick={openNew}
            disabled={!canManageParts}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black shadow-lg hover:bg-slate-800 transition-all active:scale-95">
            <Plus className="w-5 h-5" /> Nova Peça
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm font-semibold">
          {errorMessage}
        </div>
      )}

      {!canManageParts && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900 text-sm font-semibold">
          Seu usuario nao tem permissao para cadastrar ou editar pecas. Use MASTER ou ADMIN.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Itens', value: parts.length, icon: Layers, color: 'bg-blue-500' },
          { label: 'Abaixo do Mínimo', value: lowStock, icon: AlertTriangle, color: lowStock > 0 ? 'bg-red-500' : 'bg-slate-400' },
          { label: 'Valor em Estoque', value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Package, color: 'bg-emerald-500' },
        ].map((kpi) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] border border-slate-200 p-6 flex items-center gap-5 shadow-sm">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md', kpi.color)}>
              <kpi.icon size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xl font-black text-slate-900">{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Filtros */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar por nome, código interno ou SKU..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-medium" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white">
            <option value="">Todas as categorias</option>
            {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mb-3" />
            <p className="font-bold text-slate-400">Nenhuma peça encontrada</p>
            <p className="text-sm text-slate-300 mt-1">Cadastre peças ou ajuste os filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Código / Peça</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Unit.</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((part) => {
                  const stock = part.currentStock || 0;
                  const low = stock <= (part.minStock || 0);
                  return (
                    <tr key={part.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{part.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {part.internalCode && (
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{part.internalCode}</span>
                            )}
                            {part.sku && (
                              <span className="text-[10px] text-slate-400 font-medium">{part.sku}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {part.category ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg">
                            {CATEGORIES.find(c => c.code === part.category)?.label || part.category}
                          </span>
                        ) : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 font-medium">
                          {part.supplier?.name || <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black',
                          low ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                        )}>
                          {low && <AlertTriangle className="w-3 h-3" />}
                          {stock} {part.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-slate-900">
                          R$ {Number(part.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setShowMovModal(part); setMovType('ENTRY'); }}
                            title="Entrada"
                            disabled={!canManageParts}
                            className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors">
                            <ArrowDownLeft className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setShowMovModal(part); setMovType('EXIT'); }}
                            title="Saída"
                            disabled={!canManageParts}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(part)}
                            disabled={!canManageParts}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Peça */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  {editingPart ? 'Editar Peça' : 'Cadastrar Peça'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Peça *</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Pastilha de Freio Dianteira"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Categoria */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria / Área</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold">
                      <option value="">Selecionar...</option>
                      {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>

                  {/* Unidade */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo / Unidade</label>
                    <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold">
                      {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Código interno + SKU */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Código Interno</label>
                      <button type="button" onClick={handleAutoCode}
                        disabled={!formData.category}
                        className="flex items-center gap-1 text-[10px] font-bold text-primary-600 hover:text-primary-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors">
                        <RefreshCw className="w-3 h-3" /> Gerar
                      </button>
                    </div>
                    <input value={formData.internalCode} onChange={e => setFormData({...formData, internalCode: e.target.value})}
                      placeholder="Ex: FRE-001"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-mono font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SKU / Ref. Fabricante</label>
                    <input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})}
                      placeholder="Ex: TRW-GDB1535"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm" />
                  </div>
                </div>

                {/* Preços */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preço de Venda (R$) *</label>
                    <input required type="number" step="0.01" min="0" value={formData.unitPrice}
                      onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custo / Preço de Compra (R$)</label>
                    <input type="number" step="0.01" min="0" value={formData.costPrice}
                      onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm" />
                  </div>
                </div>

                {/* Estoque mínimo + localização */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estoque Mínimo</label>
                    <input type="number" min="0" value={formData.minStock}
                      onChange={e => setFormData({...formData, minStock: Number(e.target.value)})}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantidade em Estoque</label>
                    <input type="number" min="0" value={formData.currentStock}
                      onChange={e => setFormData({...formData, currentStock: Number(e.target.value)})}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Localização</label>
                    <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                      placeholder="Ex: Prateleira A2"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm" />
                  </div>
                </div>

                {/* Fornecedor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fornecedor</label>
                    <button type="button" onClick={() => setShowSupplierModal(true)}
                      className="flex items-center gap-1 text-[10px] font-bold text-primary-600 hover:text-primary-800 transition-colors">
                      <Plus className="w-3 h-3" /> Novo Fornecedor
                    </button>
                  </div>
                  <SupplierCombobox suppliers={suppliers} value={formData.supplierId}
                    onChange={(id) => setFormData({...formData, supplierId: id})} />
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações / Compatibilidade</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Veículos compatíveis, especificações técnicas, etc."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm min-h-[70px] resize-none" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">Cancelar</button>
                  <button type="submit"
                    className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95">
                    {editingPart ? 'Salvar Alterações' : 'Cadastrar Peça'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Movimentação */}
      <AnimatePresence>
        {showMovModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMovModal(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase">Movimentação</h2>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">{showMovModal.name}</p>
                </div>
                <button onClick={() => setShowMovModal(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={18} /></button>
              </div>
              <div className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {(['ENTRY', 'EXIT'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setMovType(t)}
                      className={cn(
                        'py-3 rounded-2xl font-black text-sm border-2 flex items-center justify-center gap-2 transition-all',
                        movType === t
                          ? t === 'ENTRY' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-600'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      )}>
                      {t === 'ENTRY' ? <><ArrowDownLeft className="w-4 h-4" /> Entrada</> : <><ArrowUpRight className="w-4 h-4" /> Saída</>}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantidade</label>
                  <input type="number" min="1" value={movQty} onChange={e => setMovQty(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xl font-black text-center focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all" />
                  <p className="text-xs text-slate-400 text-center">
                    Estoque atual: <strong>{showMovModal.currentStock || 0} {showMovModal.unit}</strong>
                    {movType === 'EXIT' && ` → ${Math.max(0, (showMovModal.currentStock || 0) - movQty)} após saída`}
                    {movType === 'ENTRY' && ` → ${(showMovModal.currentStock || 0) + movQty} após entrada`}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observação</label>
                  <input value={movNote} onChange={e => setMovNote(e.target.value)} placeholder="Nota fiscal, motivo, etc."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowMovModal(null)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                  <button onClick={handleMovement}
                    className={cn('px-8 py-2.5 text-white rounded-xl font-bold transition-all active:scale-95 shadow-sm',
                      movType === 'ENTRY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600')}>
                    Confirmar {movType === 'ENTRY' ? 'Entrada' : 'Saída'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Fornecedor */}
      <AnimatePresence>
        {showSupplierModal && (
          <SupplierModal onClose={() => setShowSupplierModal(false)} onSaved={loadAll} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
