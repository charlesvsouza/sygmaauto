import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usersApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  UserCheck,
  Edit,
  Trash2,
  Loader2,
  Lock,
  UserCircle,
  Eye,
  EyeOff,
  Star,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function UsersPage() {
  const { user } = useAuthStore();
  const toast = useToast();
  const canManageUsers = ['MASTER', 'ADMIN'].includes(user?.role ?? '');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [userError, setUserError] = useState('');
  const [resetError, setResetError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    recoveryEmail: '',
    password: '',
    role: 'MECANICO',
    jobFunction: '',
    workshopArea: '',
    commissionPercent: '',
    chiefId: '',
    isActive: true
  });

  const workshopAreas = [
    { value: 'MECANICA', label: 'Mecânica' },
    { value: 'ELETRICA', label: 'Elétrica' },
    { value: 'FUNILARIA_PINTURA', label: 'Funilaria e Pintura' },
    { value: 'LAVACAO', label: 'Lavação' },
    { value: 'HIGIENIZACAO_EMBELEZAMENTO', label: 'Higienização e Embelezamento' },
  ];

  const jobFunctions = [
    { value: 'MECANICO', label: 'Mecânico' },
    { value: 'ELETRICISTA', label: 'Eletricista' },
    { value: 'APRENDIZ', label: 'Aprendiz' },
    { value: 'PINTOR', label: 'Pintor' },
    { value: 'PREPARADOR', label: 'Preparador' },
    { value: 'COLABORADOR_SERVICOS_GERAIS', label: 'Serviços Gerais' },
    { value: 'FUNILEIRO', label: 'Funileiro' },
    { value: 'LAVADOR', label: 'Lavador' },
    { value: 'MARTELINHO_OURO', label: 'Martelinho de Ouro' },
    { value: 'EMBELEZADOR_AUTOMOTIVO', label: 'Embelezador Automotivo' },
    { value: 'CHEFE_OFICINA', label: 'Chefe de Oficina' },
  ];

  useEffect(() => {
    if (!canManageUsers) {
      setLoading(false);
      return;
    }
    loadUsers();
  }, [canManageUsers]);

  if (!canManageUsers) {
    return <Navigate to="/dashboard" replace />;
  }

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        jobFunction: formData.jobFunction || undefined,
        workshopArea: formData.workshopArea || undefined,
        chiefId: formData.chiefId || undefined,
        commissionPercent:
          formData.commissionPercent === '' ? undefined : Number(formData.commissionPercent),
      };

      if (editingUser) {
        const { email, password, commissionPercent, chiefId, ...rest } = payload;
        await usersApi.update(editingUser.id, {
          ...rest,
          recoveryEmail: rest.recoveryEmail || undefined,
        });
      } else {
        await usersApi.create(payload);
      }
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      setUserError(Array.isArray(msg) ? msg.join(', ') : msg || 'Falha ao salvar usuário. Verifique as permissões ou se o email já existe.');
      console.error('Failed to save user:', error);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      recoveryEmail: user.recoveryEmail || '',
      password: '',
      role: user.role,
      jobFunction: user.jobFunction || '',
      workshopArea: user.workshopArea || '',
      commissionPercent: user.commissionPercent != null ? String(user.commissionPercent) : '',
      chiefId: user.chiefId || '',
      isActive: user.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente remover este usuário?')) {
      try {
        await usersApi.delete(id);
        loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      recoveryEmail: '',
      password: '',
      role: 'MECANICO',
      jobFunction: '',
      workshopArea: '',
      commissionPercent: '',
      chiefId: '',
      isActive: true
    });
  };

  const openResetPasswordModal = (target: any) => {
    setResetTargetUser(target);
    setResetPassword('');
    setShowResetPassword(false);
    setShowResetModal(true);
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (!resetPassword || resetPassword.length < 6) {
      setResetError('A nova senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    try {
      await usersApi.adminResetPassword(resetTargetUser.id, resetPassword);
      toast.success(`Senha redefinida para ${resetTargetUser.email} com sucesso.`);
      setShowResetModal(false);
      setResetTargetUser(null);
      setResetPassword('');
      setResetError('');
      loadUsers();
    } catch (error) {
      setResetError('Falha ao redefinir senha.');
      console.error('Failed to reset password:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'MASTER':
        return <span className="badge bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest"><Star size={12} fill="currentColor" /> Master</span>;
      case 'ADMIN':
        return <span className="badge bg-purple-500/10 text-purple-600 border border-purple-500/20 px-3 py-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest"><Shield size={12} /> Admin</span>;
      case 'GERENTE':
        return <span className="badge bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">Gerente</span>;
      case 'CHEFE_OFICINA':
        return <span className="badge bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">Chefe Oficina</span>;
      case 'FINANCEIRO':
        return <span className="badge bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">Financeiro</span>;
      case 'SECRETARIA':
        return <span className="badge bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">Secretaria</span>;
      case 'MECANICO':
        return <span className="badge bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">Mecânico</span>;
      default:
        return <span className="badge bg-surface-500/10 text-surface-500 border border-line px-3 py-1 font-black text-[10px] uppercase tracking-widest">{role}</span>;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-surface-50 tracking-tight">Cadastro de Usuários</h1>
          <p className="text-surface-400 mt-1 font-medium">Gestão de acessos e colaboradores (Produtivos e Escritório).</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary h-12 px-8 rounded-lg shadow-xl shadow-primary-100 font-bold"
        >
          <Plus size={20} /> Novo Usuário
        </button>
      </div>

      <div className="card border-line overflow-hidden">
        <div className="p-6 border-b border-line bg-surface-950/40">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-900 border border-line rounded-lg py-3 pl-12 pr-4 text-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-950/40 border-b border-line">
                  <th className="py-5 px-8 text-[10px] font-black text-surface-500 uppercase tracking-widest">Colaborador</th>
                  <th className="py-5 px-8 text-[10px] font-black text-surface-500 uppercase tracking-widest">Nível de Acesso</th>
                  <th className="py-5 px-8 text-[10px] font-black text-surface-500 uppercase tracking-widest">Área/Função</th>
                  <th className="py-5 px-8 text-[10px] font-black text-surface-500 uppercase tracking-widest">Comissão</th>
                  <th className="py-5 px-8 text-[10px] font-black text-surface-500 uppercase tracking-widest">Status</th>
                  <th className="py-5 px-8 text-[10px] font-black text-surface-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <AnimatePresence>
                  {filteredUsers.map((user, idx) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-ink/5 transition-colors"
                    >
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                            user.role === 'MASTER'     ? 'bg-amber-500/15 text-amber-600' :
                            user.role === 'ADMIN'      ? 'bg-purple-500/15 text-purple-600' :
                            user.role === 'GERENTE'    ? 'bg-blue-500/15 text-blue-600' :
                            user.role === 'CHEFE_OFICINA' ? 'bg-rose-500/15 text-rose-600' :
                            user.role === 'FINANCEIRO' ? 'bg-emerald-500/15 text-emerald-600' :
                            user.role === 'SECRETARIA' ? 'bg-cyan-500/15 text-cyan-600' :
                            user.role === 'MECANICO'   ? 'bg-orange-500/15 text-orange-600' :
                            'bg-accent text-surface-950'
                          }`}>
                            {user.name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-surface-50 text-lg leading-none mb-1">{user.name}</div>
                            <div className="text-sm text-surface-400 flex items-center gap-1.5 font-medium">
                              <Mail size={14} className="text-surface-600" />
                              {user.email}
                            </div>
                            {user.recoveryEmail && (
                              <div className="text-xs text-surface-500 mt-1">
                                Recuperacao: {user.recoveryEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-6 px-8">
                        <div className="text-xs font-bold text-surface-200">
                          {workshopAreas.find((a) => a.value === user.workshopArea)?.label || '—'}
                        </div>
                        <div className="text-[10px] text-surface-400 mt-1">
                          {jobFunctions.find((f) => f.value === user.jobFunction)?.label || '—'}
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <span className="text-xs font-black text-surface-200">
                          {user.commissionPercent != null ? `${Number(user.commissionPercent).toFixed(1)}%` : 'Padrão Global'}
                        </span>
                        {user.chief?.name && (
                          <div className="text-[10px] text-surface-400 mt-1">Chefe: {user.chief.name}</div>
                        )}
                      </td>
                      <td className="py-6 px-8">
                        {user.isActive ? (
                          <div className="flex items-center gap-2 text-emerald-600 text-xs font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Ativo
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-surface-500 text-xs font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-surface-600 rounded-full" />
                            Inativo
                          </div>
                        )}
                      </td>
                      <td className="py-6 px-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-3 hover:bg-blue-500/10 text-surface-600 hover:text-blue-600 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => openResetPasswordModal(user)}
                            className="p-3 hover:bg-amber-500/10 text-surface-600 hover:text-amber-600 rounded-lg transition-all"
                            title="Redefinir senha"
                          >
                            <KeyRound size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-3 hover:bg-red-500/10 text-surface-600 hover:text-red-600 rounded-lg transition-all"
                            title="Excluir"
                            disabled={user.role === 'MASTER'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-20">
                <Users className="w-16 h-16 mx-auto mb-4 text-surface-700" />
                <p className="text-surface-400 font-bold">Nenhum usuário encontrado.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Redesigned */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-900 rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl animate-in"
          >
            <div className="flex items-center gap-5 mb-10">
              <div className="w-14 h-14 bg-primary-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-200">
                <UserCircle size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-surface-50 tracking-tight">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <p className="text-surface-400 font-medium">Configure as credenciais e nível de acesso.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input h-14 bg-surface-950/40 border-line font-bold"
                    placeholder="Nome do colaborador"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Email Profissional</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input h-14 bg-surface-950/40 border-line font-bold"
                    placeholder="email@oficina.com"
                    required
                    disabled={!!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Email Recuperacao</label>
                  <input
                    type="email"
                    value={formData.recoveryEmail}
                    onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
                    className="input h-14 bg-surface-950/40 border-line font-bold"
                    placeholder="recuperacao@dominio.com"
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Senha Inicial</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input h-14 bg-surface-950/40 border-line font-bold"
                        placeholder="Mínimo 6 caracteres"
                        required={!editingUser}
                        minLength={6}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-primary-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input h-14 bg-surface-950/40 border-line font-bold"
                  >
                    <option value="CHEFE_OFICINA">CHEFE OFICINA — Liderança técnica por área</option>
                    <option value="ADMIN">ADMIN — Administrador</option>
                    <option value="GERENTE">GERENTE — Gerência operacional</option>
                    <option value="FINANCEIRO">FINANCEIRO — Fechamento e pagamentos</option>
                    <option value="SECRETARIA">SECRETARIA — Recepção e cadastros</option>
                    <option value="MECANICO">MECÂNICO — Execução de serviços</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Área da Oficina</label>
                  <select
                    value={formData.workshopArea}
                    onChange={(e) => setFormData({ ...formData, workshopArea: e.target.value })}
                    className="input h-14 bg-surface-950/40 border-line font-bold"
                  >
                    <option value="">Selecione...</option>
                    {workshopAreas.map((area) => (
                      <option key={area.value} value={area.value}>{area.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Função na Oficina</label>
                  <select
                    value={formData.jobFunction}
                    onChange={(e) => setFormData({ ...formData, jobFunction: e.target.value })}
                    className="input h-14 bg-surface-950/40 border-line font-bold"
                  >
                    <option value="">Selecione...</option>
                    {jobFunctions.map((job) => (
                      <option key={job.value} value={job.value}>{job.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Comissão Individual (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.commissionPercent}
                    onChange={(e) => setFormData({ ...formData, commissionPercent: e.target.value })}
                    className="input h-14 bg-surface-950/40 border-line font-bold"
                    placeholder="Vazio = comissão global"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Chefe da Equipe</label>
                  <select
                    value={formData.chiefId}
                    onChange={(e) => setFormData({ ...formData, chiefId: e.target.value })}
                    className="input h-14 bg-surface-950/40 border-line font-bold"
                  >
                    <option value="">Sem chefe definido</option>
                    {users
                      .filter((u) => u.role === 'CHEFE_OFICINA' && u.id !== editingUser?.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-5 bg-surface-950/40 rounded-lg border border-line">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-line text-primary-600"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-surface-200 cursor-pointer">Usuário ativo e autorizado a acessar o sistema</label>
              </div>

              {userError && (
                <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  {userError}
                </p>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setUserError(''); }}
                  className="px-8 py-3 text-surface-500 font-black text-xs uppercase tracking-widest hover:text-surface-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary h-14 px-10 rounded-[1.5rem] shadow-xl shadow-primary-100 font-black text-sm"
                >
                  {editingUser ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showResetModal && resetTargetUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-900 rounded-xl p-8 w-full max-w-xl shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-500/15 text-amber-600 rounded-lg flex items-center justify-center">
                <KeyRound size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-surface-50 tracking-tight">Redefinir Senha</h3>
                <p className="text-sm text-surface-400 font-medium">{resetTargetUser.name} ({resetTargetUser.email})</p>
              </div>
            </div>

            <form onSubmit={handleAdminResetPassword} className="space-y-5">
              <p className="text-sm text-surface-400">
                Por seguranca, a senha atual nao pode ser exibida. Defina uma nova senha para este usuario.
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Nova Senha</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="input h-14 bg-surface-950/40 border-line font-bold"
                    placeholder="Minimo 6 caracteres"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-primary-600 transition-colors"
                  >
                    {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {resetError && (
                <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  {resetError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setResetError(''); }}
                  className="px-6 py-3 text-surface-500 font-black text-xs uppercase tracking-widest hover:text-surface-100 transition-colors"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary h-12 px-8 rounded-lg font-black text-xs uppercase tracking-widest">
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
