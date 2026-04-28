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
  Tag,
  X,
  Zap,
  DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';

export function ServicesPage() {
  const { user } = useAuthStore();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
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
      alert('Voce nao tem permissao para cadastrar ou editar servicos.');
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
      alert(error?.response?.data?.message || 'Falha ao salvar servico.');
      console.error('Falha ao salvar serviço:', error);
    }
  };

  const handleEdit = (service: any) => {
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
      alert('Voce nao tem permissao para excluir servicos.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await servicesApi.delete(id);
        loadServices();
      } catch (error: any) {
        alert(error?.response?.data?.message || 'Falha ao excluir servico.');
        console.error('Falha ao excluir serviço:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingService(null);
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

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Serviços</h1>
          <p className="text-slate-500 font-medium">{services.length} serviços cadastrados no catálogo</p>
        </div>
        <button
          onClick={() => {
            if (!canManageServices) {
              alert('Voce nao tem permissao para cadastrar servicos.');
              return;
            }
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Novo Serviço
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm font-semibold">
          {errorMessage}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
            <p className="text-slate-500 font-medium animate-pulse">Carregando catálogo de serviços...</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <motion.div
                key={service.id}
                layout
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-xl transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => handleEdit(service)} className="p-2 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl transition-all">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(service.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="relative z-10">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 mb-4 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mb-2 uppercase">{service.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-medium h-10">{service.description || 'Sem descrição detalhada'}</p>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                      <Clock size={12} /> {service.duration} min
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                      <Tag size={12} /> {service.category || 'Geral'}
                    </span>
                    {service.tmo > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-wider">
                        <Clock size={12} /> {service.tmo}h TMO
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {service.tmo > 0 ? 'Total TMO' : 'Preço Base'}
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    R$ {Number(service.tmo > 0 ? (service.tmo * service.hourlyRate) : service.basePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredServices.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <Wrench className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <h3 className="text-lg font-bold text-slate-900">Nenhum serviço encontrado</h3>
                <p className="text-slate-500">Comece cadastrando seus serviços no catálogo.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome do Serviço *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold"
                    placeholder="Ex: Alinhamento e Balanceamento"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest flex items-center gap-1">
                      <DollarSign size={10} /> Valor Hora (VH)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-black text-slate-900"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={10} /> Tempo (TMO)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tmo}
                      onChange={(e) => setFormData({ ...formData, tmo: Number(e.target.value) })}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-black text-slate-900"
                      placeholder="1.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Preço Fixo (Base)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Duração Est. (min)</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Categoria / Grupo</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    placeholder="Ex: Mecânica, Elétrica, Suspensão"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm min-h-[100px]"
                    placeholder="Detalhes sobre o que é executado neste serviço..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95">
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
