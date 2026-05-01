import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usersApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
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
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function UsersPage() {
  const { user } = useAuthStore();
  const canManageUsers = ['MASTER', 'ADMIN'].includes(user?.role ?? '');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MECANICO',
    isActive: true
  });

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
      if (editingUser) {
        // Para update, removemos o email pois ele costuma ser a chave/único
        const { email, password, ...updateData } = formData;
        await usersApi.update(editingUser.id, updateData);
      } else {
        await usersApi.create(formData);
      }
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      alert('Falha ao salvar usuário. Verifique as permissões ou se o email já existe.');
      console.error('Failed to save user:', error);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
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
      password: '',
      role: 'MECANICO',
      isActive: true
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'MASTER':
        return <span className="badge bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest"><Star size={12} fill="currentColor" /> Master</span>;
      case 'ADMIN':
        return <span className="badge bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest"><Shield size={12} /> Admin</span>;
      case 'GERENTE':
        return <span className="badge bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">Gerente</span>;
      case 'FINANCEIRO':
        return <span className="badge bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">Financeiro</span>;
      case 'SECRETARIA':
        return <span className="badge bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">Secretaria</span>;
      case 'MECANICO':
        return <span className="badge bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">Mecânico</span>;
      default:
        return <span className="badge bg-slate-500/10 text-slate-400 border border-slate-500/20 px-3 py-1 font-black text-[10px] uppercase tracking-widest">{role}</span>;
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cadastro de Usuários</h1>
          <p className="text-slate-500 mt-1 font-medium">Gestão de acessos e colaboradores (Produtivos e Escritório).</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary h-12 px-8 rounded-2xl shadow-xl shadow-primary-100 font-bold"
        >
          <Plus size={20} /> Novo Usuário
        </button>
      </div>

      <div className="card border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all font-medium"
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
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                  <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</th>
                  <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence>
                  {filteredUsers.map((user, idx) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                            user.role === 'MASTER'     ? 'bg-amber-100 text-amber-600' :
                            user.role === 'ADMIN'      ? 'bg-purple-100 text-purple-600' :
                            user.role === 'GERENTE'    ? 'bg-blue-100 text-blue-600' :
                            user.role === 'FINANCEIRO' ? 'bg-emerald-100 text-emerald-600' :
                            user.role === 'SECRETARIA' ? 'bg-cyan-100 text-cyan-600' :
                            user.role === 'MECANICO'   ? 'bg-orange-100 text-orange-600' :
                            'bg-slate-900 text-white'
                          }`}>
                            {user.name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-lg leading-none mb-1">{user.name}</div>
                            <div className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                              <Mail size={14} className="text-slate-300" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="py-6 px-8">
                        {user.isActive ? (
                          <div className="flex items-center gap-2 text-emerald-600 text-xs font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Ativo
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                            Inativo
                          </div>
                        )}
                      </td>
                      <td className="py-6 px-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-3 hover:bg-blue-50 text-slate-300 hover:text-blue-600 rounded-2xl transition-all"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-3 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-2xl transition-all"
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
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-slate-500 font-bold">Nenhum usuário encontrado.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Redesigned */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl animate-in"
          >
            <div className="flex items-center gap-5 mb-10">
              <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-200">
                <UserCircle size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <p className="text-slate-500 font-medium">Configure as credenciais e nível de acesso.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input h-14 bg-slate-50 border-slate-200 font-bold"
                    placeholder="Nome do colaborador"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Profissional</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input h-14 bg-slate-50 border-slate-200 font-bold"
                    placeholder="email@oficina.com"
                    required
                    disabled={!!editingUser}
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input h-14 bg-slate-50 border-slate-200 font-bold"
                        placeholder="Mínimo 6 caracteres"
                        required={!editingUser}
                        minLength={6}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input h-14 bg-slate-50 border-slate-200 font-bold"
                  >
                    <option value="ADMIN">ADMIN — Administrador</option>
                    <option value="GERENTE">GERENTE — Gerência operacional</option>
                    <option value="FINANCEIRO">FINANCEIRO — Fechamento e pagamentos</option>
                    <option value="SECRETARIA">SECRETARIA — Recepção e cadastros</option>
                    <option value="MECANICO">MECÂNICO — Execução de serviços</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-slate-300 text-primary-600"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">Usuário ativo e autorizado a acessar o sistema</label>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-8 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-800 transition-colors"
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
    </motion.div>
  );
}
