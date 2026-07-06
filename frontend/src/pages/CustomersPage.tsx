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
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-surface-950 rounded-xl font-semibold hover:bg-accent-hover transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Novo Cliente
        </button>
      </div>

      {/* Toolbar de busca — sempre visível (a lista rola por baixo) */}
      <div className="flex flex-col md:flex-row items-center gap-3 rounded-lg border border-line bg-panel p-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF/CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md border border-line bg-panel text-sm text-ink placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted whitespace-nowrap px-1">
          <Users size={16} />
          <span className="font-semibold text-ink">{filteredCustomers.length}</span> clientes
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-lg border border-line bg-panel">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted text-sm">Carregando sua base de clientes...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-20 rounded-lg border border-line bg-panel">
          <Users className="w-14 h-14 mx-auto mb-4 text-faint" />
          <h3 className="text-base font-semibold text-ink">Nenhum cliente encontrado</h3>
          <p className="text-muted text-sm mt-1">Tente buscar por outro nome ou documento.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-panel overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <table className="w-full min-w-[820px] text-sm text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-panel-2 border-b border-line text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Documento</th>
                  <th className="px-4 py-2.5 font-medium">Contato</th>
                  <th className="px-4 py-2.5 font-medium">Veículos</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="group hover:bg-panel-2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-accent-soft text-accent rounded-full flex items-center justify-center font-semibold shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate">{customer.name}</p>
                          {customer.profissao && <p className="text-xs text-muted truncate">{customer.profissao}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-ink">{customer.document || '—'}</div>
                      {customer.rg && <div className="text-xs text-muted">RG: {customer.rg}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <Phone className="w-3.5 h-3.5 text-faint" />{customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-muted">
                            <Mail className="w-3.5 h-3.5 text-faint" />{customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-panel-2 text-muted border border-line">
                        {customer._count?.vehicles || 0} veículo(s)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent-soft transition-colors"
                          aria-label="Editar cliente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-red-50 transition-colors"
                          aria-label="Excluir cliente"
                        >
                          <Trash2 className="w-4 h-4" />
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
              className="relative bg-surface-900 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-line flex items-center justify-between bg-surface-950/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-900 border border-line shadow-sm flex items-center justify-center text-surface-50">
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
                  className="p-2 hover:bg-ink/5 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-surface-950/40">
                {error && (
                  <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-3 text-red-700 text-sm font-medium">
                    <AlertTriangle size={18} />
                    {error}
                  </div>
                )}

                <form id="customer-form" onSubmit={handleSubmit} className="space-y-8">
                  {/* Dados Básicos */}
                  <div className="bg-surface-900 rounded-xl border border-line p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-surface-50 border-b border-line pb-3">
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
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-950/40 focus:bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">CPF/CNPJ</label>
                        <input
                          type="text"
                          value={formData.document}
                          onChange={(e) => setFormData({ ...formData, document: formatCpfCnpj(e.target.value) })}
                          placeholder="000.000.000-00 ou 00.000.000/0000-00"
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">RG</label>
                        <input
                          type="text"
                          value={formData.rg}
                          onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@exemplo.com"
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Telefone</label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          placeholder="(00) 00000-0000"
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
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
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Estado Civil</label>
                        <select
                          value={formData.estado_civil}
                          onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
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
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="bg-surface-900 rounded-xl border border-line p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-surface-50 border-b border-line pb-3">
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
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleLookupCep}
                        disabled={loadingCep || formData.cep.replace(/\D/g, '').length !== 8}
                        className="h-[46px] px-6 rounded-lg border border-line text-sm font-bold hover:bg-ink/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 bg-surface-900"
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
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Cidade</label>
                        <input
                          type="text"
                          value={formData.cidade}
                          onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-wider ml-1">Estado (UF)</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={formData.estado}
                          onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                          className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="bg-surface-900 rounded-xl border border-line p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-surface-50 border-b border-line pb-3">
                      <FileText size={16} className="text-surface-500" /> Observações Internas
                    </div>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Alguma nota importante sobre este cliente?"
                      className="w-full px-4 py-3 rounded-lg border border-line bg-surface-900 focus:outline-none focus:ring-4 focus:ring-accent/40 focus:border-accent/40 transition-all text-sm min-h-[100px]"
                    />
                  </div>
                </form>
              </div>

              <div className="px-8 py-6 border-t border-line bg-surface-900 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-surface-400 hover:text-surface-50 hover:bg-ink/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="customer-form"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-8 py-2.5 bg-accent text-surface-950 rounded-xl font-bold hover:bg-accent-hover transition-all shadow-sm hover:shadow-lg disabled:opacity-50 active:scale-95"
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