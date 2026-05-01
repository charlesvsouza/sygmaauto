import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../api/client';
import { ProvisionTenantModal } from '../components/ProvisionTenantModal';
import {
  Shield, Building, Users, FileText, Package,
  Trash2, Eye, LogOut, RefreshCw, Loader2, AlertCircle,
  CheckCircle2, X, AlertTriangle,
  BarChart3, DollarSign, Plus, Mail, Copy,
} from 'lucide-react';

export function SuperAdminPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active'>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  const superAdminInfo = (() => {
    try { return JSON.parse(localStorage.getItem('superAdminInfo') || 'null'); } catch { return null; }
  })();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        superAdminApi.listTenants(),
        superAdminApi.getStats(),
      ]);
      setTenants(tenantsRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('superAdminToken');
        navigate('/admin/login');
      } else {
        setError('Erro ao carregar dados');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (tenant: any) => {
    setDetailLoading(true);
    setSelectedTenant(null);
    try {
      const res = await superAdminApi.getTenantDetails(tenant.id);
      setSelectedTenant(res.data);
    } catch {
      setError('Erro ao carregar detalhes do tenant');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || deleteConfirmText !== pendingDelete.name) return;
    setDeleteLoading(true);
    try {
      await superAdminApi.deleteTenant(pendingDelete.id);
      setSuccessMsg(`Tenant "${pendingDelete.name}" excluido com sucesso`);
      setPendingDelete(null);
      setDeleteConfirmText('');
      setSelectedTenant(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir tenant');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResendInvite = async (tenantId: string) => {
    setResendingId(tenantId);
    try {
      await superAdminApi.resendInvite(tenantId);
      setSuccessMsg('Convite reenviado com sucesso!');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reenviar convite');
    } finally {
      setResendingId(null);
    }
  };

  const getTenantStatusBadge = (tenant: any) => {
    if (tenant.status === 'PENDING_SETUP') {
      const isExpired = tenant.setupInviteExpiresAt && new Date(tenant.setupInviteExpiresAt) < new Date();
      if (isExpired) return { label: 'EXPIRADO', cls: 'bg-red-500/10 text-red-400' };
      return { label: 'PENDENTE SETUP', cls: 'bg-amber-500/10 text-amber-400' };
    }
    if (tenant.subscription?.status === 'ACTIVE') return { label: 'ATIVO', cls: 'bg-emerald-500/10 text-emerald-400' };
    if (tenant.subscription?.status === 'TRIALING') return { label: 'TRIAL', cls: 'bg-sky-500/10 text-sky-400' };
    return { label: tenant.subscription?.status ?? 'SEM PLANO', cls: 'bg-slate-700 text-slate-400' };
  };

  const filteredTenants = tenants.filter((t) => {
    if (filterStatus === 'pending') return t.status === 'PENDING_SETUP';
    if (filterStatus === 'active') return t.status !== 'PENDING_SETUP' && t.subscription?.status === 'ACTIVE';
    return true;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminInfo');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
            <Shield className="text-red-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-white text-lg">Super Admin</h1>
            <p className="text-slate-500 text-xs">{superAdminInfo?.email ?? 'Sistema Oficina360'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowProvisionModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all text-sm font-bold">
            <Plus size={16} /> Novo Tenant
          </button>
          <button onClick={loadData} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-bold">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-sm">
              <AlertCircle size={16} /> {error}
              <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-4 text-sm">
              <CheckCircle2 size={16} /> {successMsg}
              <button onClick={() => setSuccessMsg(null)} className="ml-auto"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tenants', value: stats.totalTenants, icon: Building, color: 'text-blue-400' },
              { label: 'Usuarios', value: stats.totalUsers, icon: Users, color: 'text-emerald-400' },
              { label: 'Ordens de Servico', value: stats.totalServiceOrders, icon: FileText, color: 'text-amber-400' },
              { label: 'Receita Total', value: `R$ ${Number(stats.totalRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-purple-400' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <s.icon className={`${s.color} w-5 h-5`} />
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{s.label}</span>
                </div>
                <p className="text-2xl font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <BarChart3 className="text-blue-400 w-5 h-5" /> Tenants Cadastrados
            </h2>
            <div className="flex gap-2 sm:ml-auto">
              {(['all', 'pending', 'active'] as const).map((f) => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === f ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                  {f === 'all' ? `Todos (${tenants.length})` : f === 'pending' ? `Pendentes (${tenants.filter(t => t.status === 'PENDING_SETUP').length})` : `Ativos (${tenants.filter(t => t.status !== 'PENDING_SETUP' && t.subscription?.status === 'ACTIVE').length})`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={36} /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTenants.map((tenant) => (
                <motion.div key={tenant.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/40 border border-white/10 p-5 rounded-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/10">
                        <Building className="text-blue-400 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{tenant.name}</h3>
                        <p className="text-xs text-slate-500">{tenant.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                    {(() => { const b = getTenantStatusBadge(tenant); return (
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${b.cls}`}>{b.label}</span>
                    ); })()}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    {[
                      { label: 'Usuarios', val: tenant._count?.users ?? 0, icon: Users },
                      { label: 'Clientes', val: tenant._count?.customers ?? 0, icon: Users },
                      { label: 'OS', val: tenant._count?.serviceOrders ?? 0, icon: FileText },
                      { label: 'Pecas', val: tenant._count?.parts ?? 0, icon: Package },
                    ].map((c) => (
                      <div key={c.label} className="bg-white/5 rounded-xl px-3 py-2 flex items-center gap-2">
                        <c.icon className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-400">{c.label}</span>
                        <span className="text-white font-bold ml-auto">{c.val}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-slate-500 mb-4">
                    Criado em {new Date(tenant.createdAt).toLocaleDateString('pt-BR')} · Plano: {tenant.subscription?.plan?.name ?? 'N/A'}
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => handleViewDetails(tenant)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-xl transition-all">
                      <Eye size={13} /> Detalhes
                    </button>
                    {tenant.status === 'PENDING_SETUP' && (
                      <button onClick={() => handleResendInvite(tenant.id)} disabled={resendingId === tenant.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold py-2 rounded-xl transition-all disabled:opacity-50">
                        {resendingId === tenant.id ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Reenviar
                      </button>
                    )}
                    <button onClick={() => { setPendingDelete({ id: tenant.id, name: tenant.name }); setDeleteConfirmText(''); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold py-2 rounded-xl transition-all">
                      <Trash2 size={13} /> Excluir
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(selectedTenant || detailLoading) && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTenant(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }}
              className="w-full max-w-lg bg-slate-900 border-l border-white/10 h-full overflow-y-auto">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-black text-white">Detalhes do Tenant</h2>
                <button onClick={() => setSelectedTenant(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>

              {detailLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
              ) : selectedTenant && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-white">{selectedTenant.name}</h3>
                    <p className="text-slate-400 text-sm">{selectedTenant.email ?? 'sem email'}</p>
                    <p className="text-slate-500 text-xs mt-1">ID: {selectedTenant.id}</p>
                    {(() => { const b = getTenantStatusBadge(selectedTenant); return (
                      <span className={`inline-block mt-2 text-xs font-bold px-2.5 py-1 rounded-lg ${b.cls}`}>{b.label}</span>
                    ); })()}
                  </div>

                  {selectedTenant.status === 'PENDING_SETUP' && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-2">
                      <p className="text-amber-400 text-xs font-bold flex items-center gap-2"><Mail size={13} /> Convite Pendente</p>
                      <p className="text-slate-400 text-xs">Email: <span className="text-white">{selectedTenant.setupInviteEmail ?? '—'}</span></p>
                      {selectedTenant.setupInviteExpiresAt && (
                        <p className="text-slate-400 text-xs">Expira em: <span className={`font-bold ${new Date(selectedTenant.setupInviteExpiresAt) < new Date() ? 'text-red-400' : 'text-white'}`}>{new Date(selectedTenant.setupInviteExpiresAt).toLocaleString('pt-BR')}</span></p>
                      )}
                      {selectedTenant.setupInviteToken && (
                        <div className="flex gap-2 mt-2">
                          <input readOnly value={`https://oficina360-pink.vercel.app/activate/${selectedTenant.setupInviteToken}`}
                            className="flex-1 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-300 px-3 py-2 outline-none min-w-0" />
                          <button onClick={() => copyToClipboard(`https://oficina360-pink.vercel.app/activate/${selectedTenant.setupInviteToken}`)}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-white flex items-center gap-1.5 font-bold transition-all whitespace-nowrap">
                            {copiedLink ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />} {copiedLink ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      )}
                      <button onClick={() => handleResendInvite(selectedTenant.id)} disabled={resendingId === selectedTenant.id}
                        className="w-full mt-1 flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold py-2.5 rounded-xl transition-all text-sm disabled:opacity-50">
                        {resendingId === selectedTenant.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Reenviar Convite
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ['Clientes', selectedTenant._count?.customers],
                      ['Veiculos', selectedTenant._count?.vehicles],
                      ['OS', selectedTenant._count?.serviceOrders],
                      ['Pecas', selectedTenant._count?.parts],
                      ['Transacoes', selectedTenant._count?.financialTransactions],
                    ].map(([l, v]) => (
                      <div key={l as string} className="bg-white/5 rounded-xl p-3">
                        <p className="text-slate-400 text-xs">{l}</p>
                        <p className="text-white font-black text-lg">{v}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                      <Users size={14} /> Usuarios ({selectedTenant.users?.length ?? 0})
                    </h4>
                    <div className="space-y-2">
                      {selectedTenant.users?.map((u: any) => (
                        <div key={u.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{u.name}</p>
                            <p className="text-slate-500 text-xs truncate">{u.email}</p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                            u.role === 'MASTER' ? 'bg-amber-500/10 text-amber-400' :
                            u.role === 'ADMIN' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => { setPendingDelete({ id: selectedTenant.id, name: selectedTenant.name }); setDeleteConfirmText(''); }}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-2xl transition-all">
                    <Trash2 size={16} /> Excluir este Tenant
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-red-500/20 rounded-[2rem] p-8 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="text-red-400 w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg">Excluir Tenant</h3>
                  <p className="text-slate-400 text-sm">Esta acao e irreversivel</p>
                </div>
              </div>

              <p className="text-slate-300 text-sm mb-2">
                Todos os dados de <span className="font-bold text-white">{pendingDelete.name}</span> serao permanentemente excluidos: clientes, veiculos, ordens de servico, estoque, financeiro e usuarios.
              </p>

              <p className="text-slate-400 text-sm mb-4">
                Para confirmar, digite o nome do tenant:
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={pendingDelete.name}
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-sm text-white mb-6 outline-none focus:ring-2 focus:ring-red-500/40"
              />

              <div className="flex gap-3">
                <button onClick={() => setPendingDelete(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-2xl transition-all">
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== pendingDelete.name || deleteLoading}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2">
                  {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showProvisionModal && (
        <ProvisionTenantModal
          onClose={() => setShowProvisionModal(false)}
          onCreated={() => loadData()}
        />
      )}
    </div>
  );
}
