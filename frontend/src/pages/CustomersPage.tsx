import { useEffect, useState, useMemo } from 'react';
import { customersApi } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  Loader2,
  X,
  Save,
  User,
  Briefcase,
  Home,
  RefreshCw,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatCpfCnpj, formatCep, formatPhone, onlyDigits } from '../lib/masks';

export function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    document: '',
    rg: '',
    nacionalidade: 'Brasileira',
    estado_civil: '',
    profissao: '',
    email: '',
    phone: '',
    cep: '',
    address: '',
    cidade: '',
    estado: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersApi.getAll();
      setCustomers(response.data);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Falha ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleLookupCep = async () => {
    const cepDigits = onlyDigits(formData.cep);
    if (cepDigits.length !== 8) return;

    setLoadingCep(true);
    setError(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await response.json();
      if (data.erro) throw new Error('CEP não encontrado');

      setFormData(prev => ({
        ...prev,
        address: data.logradouro || prev.address,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
    } catch (err) {
      setError('CEP não encontrado');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, formData);
      } else {
        await customersApi.create(formData);
      }
      setShowModal(false);
      resetForm();
      loadCustomers();
    } catch (err) {
      console.error('Failed to save customer:', err);
      setError('Erro ao salvar cliente. Verifique os dados.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      document: customer.document || '',
      rg: customer.rg || '',
      nacionalidade: customer.nacionalidade || 'Brasileira',
      estado_civil: customer.estado_civil || '',
      profissao: customer.profissao || '',
      email: customer.email || '',
      phone: customer.phone || '',
      cep: customer.cep || '',
      address: customer.address || '',
      cidade: customer.cidade || '',
      estado: customer.estado || '',
      notes: customer.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await customersApi.delete(id);
        loadCustomers();
      } catch (err) {
        console.error('Failed to delete customer:', err);
      }
    }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      document: '',
      rg: '',
      nacionalidade: 'Brasileira',
      estado_civil: '',
      profissao: '',
      email: '',
      phone: '',
      cep: '',
      address: '',
      cidade: '',
      estado: '',
      notes: '',
    });
    setError(null);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.document?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [customers, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-50 tracking-tight">Clientes</h1>
          <p className="text-surface-400 font-medium">Gestão e cadastro de clientes da oficina</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-surface-950 rounded-xl font-semibold hover:bg-gold-400 transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-surface-900 rounded-3xl border border-white/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center gap-4 bg-surface-950/40">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="text"
              placeholder="Buscar por nome, documento ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm bg-surface-900"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-surface-400 whitespace-nowrap px-2">
            <Users size={16} />
            <span className="font-semibold text-surface-50">{filteredCustomers.length}</span> clientes
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-surface-50" />
            <p className="text-surface-400 font-medium animate-pulse">Carregando sua base de clientes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-950/40 text-surface-400 border-b border-white/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Documento</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Veículos</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-800 rounded-full flex items-center justify-center text-surface-50 font-bold border border-white/10">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-surface-50">{customer.name}</p>
                          {customer.profissao && <p className="text-xs text-surface-400">{customer.profissao}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-medium text-surface-200">{customer.document || '-'}</div>
                      {customer.rg && <div className="text-xs text-surface-500">RG: {customer.rg}</div>}
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-surface-300">
                            <Phone className="w-3.5 h-3.5 text-surface-500" />
                            {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-surface-300">
                            <Mail className="w-3.5 h-3.5 text-surface-500" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-surface-800 text-surface-100 border border-white/10">
                        {customer._count?.vehicles || 0} veículo(s)
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 hover:bg-white/10 rounded-lg text-surface-300 hover:text-surface-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 hover:bg-danger/10 rounded-lg text-surface-500 hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCustomers.length === 0 && (
              <div className="text-center py-20">
                <Users className="w-16 h-16 mx-auto mb-4 text-surface-700" />
                <h3 className="text-lg font-bold text-surface-50">Nenhum cliente encontrado</h3>
                <p className="text-surface-400">Tente buscar por outro nome ou documento.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-surface-900 rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-surface-950/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-900 border border-white/10 shadow-sm flex items-center justify-center text-surface-50">
                    {editingCustomer ? <Edit2 size={24} /> : <Plus size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-surface-50">
                      {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                    </h2>
                    <p className="text-sm text-surface-400 font-medium">Preencha as informações detalhadas abaixo</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-surface-950/40">
                {error && (
                  <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-center gap-3 text-red-300 text-sm font-medium">
                    <AlertTriangle size={18} />
                    {error}
                  </div>
                )}

                <form id="customer-form" onSubmit={handleSubmit} className="space-y-8">
                  {/* Dados Básicos */}
                  <div className="bg-surface-900 rounded-3xl border border-white/10 p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-surface-50 border-b border-white/5 pb-3">
                      <User size={16} className="text-surface-500" /> Informações Pessoais
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="lg:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-950/40 focus:bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">CPF/CNPJ</label>
                        <input
                          type="text"
                          value={formData.document}
                          onChange={(e) => setFormData({ ...formData, document: formatCpfCnpj(e.target.value) })}
                          placeholder="000.000.000-00 ou 00.000.000/0000-00"
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">RG</label>
                        <input
                          type="text"
                          value={formData.rg}
                          onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@exemplo.com"
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Telefone</label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Nacionalidade</label>
                        <input
                          type="text"
                          value={formData.nacionalidade}
                          onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Estado Civil</label>
                        <select
                          value={formData.estado_civil}
                          onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        >
                          <option value="">Selecione...</option>
                          <option value="Solteiro(a)">Solteiro(a)</option>
                          <option value="Casado(a)">Casado(a)</option>
                          <option value="Divorciado(a)">Divorciado(a)</option>
                          <option value="Viúvo(a)">Viúvo(a)</option>
                          <option value="União Estável">União Estável</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Profissão</label>
                        <input
                          type="text"
                          value={formData.profissao}
                          onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="bg-surface-900 rounded-3xl border border-white/10 p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-surface-50 border-b border-white/5 pb-3">
                      <Home size={16} className="text-surface-500" /> Endereço
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-5 items-end">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">CEP</label>
                        <input
                          type="text"
                          value={formData.cep}
                          onChange={(e) => setFormData({ ...formData, cep: formatCep(e.target.value) })}
                          placeholder="00000-000"
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleLookupCep}
                        disabled={loadingCep || formData.cep.replace(/\D/g, '').length !== 8}
                        className="h-[46px] px-6 rounded-2xl border border-white/10 text-sm font-bold hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 bg-surface-900"
                      >
                        {loadingCep ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Buscar CEP
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Logradouro / Endereço</label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Cidade</label>
                        <input
                          type="text"
                          value={formData.cidade}
                          onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Estado (UF)</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={formData.estado}
                          onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                          className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="bg-surface-900 rounded-3xl border border-white/10 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-surface-50 border-b border-white/5 pb-3">
                      <FileText size={16} className="text-surface-500" /> Observações Internas
                    </div>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Alguma nota importante sobre este cliente?"
                      className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-surface-900 focus:outline-none focus:ring-4 focus:ring-gold-500/20 focus:border-gold-500/40 transition-all text-sm min-h-[100px]"
                    />
                  </div>
                </form>
              </div>

              <div className="px-8 py-6 border-t border-white/5 bg-surface-900 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-surface-400 hover:text-surface-50 hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="customer-form"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-8 py-2.5 bg-gold-500 text-surface-950 rounded-xl font-bold hover:bg-gold-400 transition-all shadow-sm hover:shadow-lg disabled:opacity-50 active:scale-95"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}