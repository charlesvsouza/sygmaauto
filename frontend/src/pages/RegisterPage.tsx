import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';
import { Wrench, Mail, Lock, User, Building, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { formatCpfCnpj } from '../lib/masks';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyType, setCompanyType] = useState('CNPJ');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.register({
        name,
        email,
        recoveryEmail: recoveryEmail || undefined,
        password,
        tenantName: tenantName || undefined,
        taxId,
        document: taxId, // Map taxId to document for backend compatibility
        companyType,
      });

      const { accessToken, refreshToken, user, tenant } = response.data;

      login(
        {
          userId: user.id || user.sub,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
        tenant,
        accessToken,
        refreshToken
      );

      navigate('/welcome');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl grid lg:grid-cols-2 gap-0 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-white/5 backdrop-blur-xl z-10"
      >
        {/* Left Side - Info */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600/20 to-transparent border-r border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Wrench className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight">Oficina360</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight mb-6">
              Transforme sua <br />
              <span className="text-blue-400">Oficina hoje.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Gestão completa, do financeiro ao estoque, em uma única plataforma premium.
              O primeiro acesso cria sua conta <span className="text-white font-bold">MASTER</span>.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              Suporte a CNPJ, MEI e CPF
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              Gestão Multi-tenant Segura
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Criar Conta MASTER</h2>
            <p className="text-slate-400 text-sm">Registre sua oficina para começar.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Nome MASTER</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-dark pl-10"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Oficina</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="input-dark pl-10"
                    placeholder="Nome da Oficina"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Natureza</label>
                <select 
                  value={(companyType === 'CPF' ? 'PF' : 'PJ')} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'PF') setCompanyType('CPF');
                    else setCompanyType('CNPJ');
                  }}
                  className="input-dark"
                >
                  <option value="PJ">PJ (Empresa)</option>
                  <option value="PF">PF (Pessoa Física)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Tipo Doc.</label>
                <select 
                  value={companyType} 
                  onChange={(e) => setCompanyType(e.target.value)}
                  className="input-dark"
                >
                  {companyType === 'CPF' ? (
                    <option value="CPF">CPF</option>
                  ) : (
                    <>
                      <option value="CNPJ">CNPJ</option>
                      <option value="MEI">MEI</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1.5 col-span-1 md:col-span-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Documento</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={taxId}
                  onChange={(e) => {
                    const formatted = formatCpfCnpj(e.target.value);
                    setTaxId(formatted);
                  }}
                  className="input-dark"
                  placeholder={companyType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Email MASTER</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark pl-10"
                  placeholder="exemplo@email.com"
                  required
                />
              </div>
            </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Email de Recuperação</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="input-dark pl-10"
                    placeholder="recuperacao@email.com"
                  />
                </div>
              </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark pl-10 pr-12"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Criar Oficina e Conta MASTER
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Já possui uma conta?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Fazer Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}