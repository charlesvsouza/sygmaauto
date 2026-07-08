import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { servicesApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import {
  Wrench,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Clock,
  X,
  Zap,
  DollarSign
} from 'lucide-react';
import { useToast } from '../components/ui';

export function ServicesPage() {
  const { user } = useAuthStore();
  const toast = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    category: '',
    duration: 60,
    hourlyRate: 0,
    tmo: 0,
  });
  const canManageServices = user?.role === 'MASTER' || user?.role === 'ADMIN';

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setErrorMessage(null);
    try {
      const response = await servicesApi.getAll();
      setServices(response.data);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Nao foi possivel carregar o catalogo de servicos.');
      console.error('Falha ao carregar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageServices) {
      toast.error('Voce nao tem permissao para cadastrar ou editar servicos.');
      return;
    }
    try {
      if (editingService) {
        await servicesApi.update(editingService.id, formData);
      } else {
        await servicesApi.create(formData);
      }
      setShowModal(false);
      resetForm();
      loadServices();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      setModalError(Array.isArray(msg) ? msg.join(', ') : msg || 'Falha ao salvar serviço.');
      console.error('Falha ao salvar serviço:', error);
    }
  };

  const handleEdit = (service: any) => {
    if (!canManageServices) {
      toast.error('Voce nao tem permissao para editar servicos.');
      return;
    }
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      basePrice: Number(service.basePrice),
      category: service.category || '',
      duration: service.duration || 60,
      hourlyRate: service.hourlyRate || 0,
      tmo: service.tmo || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!canManageServices) {
      toast.error('Voce nao tem permissao para excluir servicos.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await servicesApi.delete(id);
        loadServices();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Falha ao excluir servico.');
        console.error('Falha ao excluir serviço:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setModalError('');
    setFormData({
      name: '',
      description: '',
      basePrice: 0,
      category: '',
      duration: 60,
      hourlyRate: 0,
      tmo: 0,
    });
  };

  const filteredServices = services
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'price') {
        const priceA = Number((a.tmo > 0 && a.hourlyRate > 0) ? a.tmo * a.hourlyRate : a.basePrice || 0);
        const priceB = Number((b.tmo > 0 && b.hourlyRate > 0) ? b.tmo * b.hourlyRate : b.basePrice || 0);
        return priceB - priceA;
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });

  const priceOf = (service: any) => {
    const vh = Number(service.hourlyRate || 0);
    const tmo = Number(service.tmo || 0);
    return tmo > 0 && vh > 0 ? tmo * vh : Number(service.basePrice || 0);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-50 tracking-tight">Serviços</h1>
          <p className="text-surface-400 font-medium">{services.length} serviços cadastrados no catálogo</p>
        </div>
        <button type="button"
          onClick={() => {
            if (!canManageServices) {
              toast.error('Voce nao tem permissao para cadastrar servicos.');
              return;
            }
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Novo Serviço
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 text-sm font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Toolbar de busca — sempre visível (a lista rola por baixo) */}
      <div className="flex flex-col md:flex-row items-center gap-3 rounded-lg border border-line bg-panel p-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
          <input
            type="text"
            placeholder="Buscar por nome ou seção/categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md border border-line bg-panel text-sm text-ink placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-medium text-muted">Ordenar</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'price')}
            className="px-3 py-2.5 rounded-md border border-line bg-panel text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25"
          >
            <option value="name">Nome (A-Z)</option>
            <option value="price">Preço (maior)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-lg border border-line bg-panel">
          <Loader2 className="w-8 h-8 animate-spin text-accent-ink" />
          <p className="text-muted text-sm">Carregando catálogo de serviços...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-20 text-center rounded-lg border border-line bg-panel">
          <Wrench className="w-14 h-14 mx-auto mb-4 text-faint" />
          <h3 className="text-base font-semibold text-ink">Nenhum serviço encontrado</h3>
          <p className="text-muted text-sm mt-1">
            {search ? 'Ajuste a busca ou cadastre' : 'Comece cadastrando'} serviços no catálogo.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-panel overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-panel-2 border-b border-line text-xs text-muted">
                  <th className="px-4 py-2.5 text-left font-medium">Serviço</th>
                  <th className="px-4 py-2.5 text-left font-medium">Seção</th>
                  <th className="px-4 py-2.5 text-center font-medium">Duração</th>
                  <th className="px-4 py-2.5 text-right font-medium">VH</th>
                  <th className="px-4 py-2.5 text-center font-medium">TMO</th>
                  <th className="px-4 py-2.5 text-right font-medium">Preço Final</th>
                  <th className="px-4 py-2.5 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="group hover:bg-panel-2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-md bg-accent-soft text-accent-ink flex items-center justify-center shrink-0">
                          <Zap size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink leading-tight">{service.name}</p>
                          <p className="text-xs text-muted mt-0.5 max-w-[420px] truncate">{service.description || 'Sem descrição'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-panel-2 text-muted border border-line">
                        {service.category || 'Geral'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted">{service.duration || 0} min</td>
                    <td className="px-4 py-3 text-right text-muted">R$ {Number(service.hourlyRate || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-center text-muted">{Number(service.tmo || 0) > 0 ? `${service.tmo}h` : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">R$ {priceOf(service).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center justify-end gap-1.5 w-full">
                        <button type="button"
                          onClick={() => handleEdit(service)}
                          disabled={!canManageServices}
                          className="p-1.5 rounded-md text-muted hover:text-accent-ink hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Editar serviço"
                        >
                          <Edit size={15} />
                        </button>
                        <button type="button"
                          onClick={() => handleDelete(service.id)}
                          disabled={!canManageServices}
                          className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Excluir serviço"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-surface-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-line flex items-center justify-between bg-surface-950/40">
                <h2 className="text-xl font-bold text-surface-50 uppercase">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </h2>
                <button type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-ink/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Nome do Serviço *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm font-bold"
                    placeholder="Ex: Alinhamento e Balanceamento"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-4 bg-surface-950/40 rounded-lg border border-line">
                    <label className="text-[10px] font-bold text-primary-600 uppercase tracking-wide flex items-center gap-1">
                      <DollarSign size={10} /> Valor Hora (VH)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-bold text-surface-50"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5 p-4 bg-surface-950/40 rounded-lg border border-line">
                    <label className="text-[10px] font-bold text-primary-600 uppercase tracking-wide flex items-center gap-1">
                      <Clock size={10} /> Tempo (TMO)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tmo}
                      onChange={(e) => setFormData({ ...formData, tmo: Number(e.target.value) })}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-bold text-surface-50"
                      placeholder="1.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Preço Fixo (Base)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Duração Est. (min)</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Categoria / Grupo</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                    placeholder="Ex: Mecânica, Elétrica, Suspensão"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm min-h-[100px]"
                    placeholder="Detalhes sobre o que é executado neste serviço..."
                  />
                </div>

                {modalError && (
                  <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                    {modalError}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-6 border-t border-line">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setModalError(''); }}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-surface-400 hover:text-surface-50 hover:bg-ink/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-8 py-2.5 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover transition-all shadow-sm active:scale-95">
                    {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
