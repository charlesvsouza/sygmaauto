import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Building, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { authApi, onboardingApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { formatCpfCnpj } from '../lib/masks';

export function ActivateTenantPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invite, setInvite] = useState<any>(null);

  const [tenantName, setTenantName] = useState('');
  const [masterName, setMasterName] = useState('');
  const [masterEmail, setMasterEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyType, setCompanyType] = useState('CNPJ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) return;
    onboardingApi.getInvite(token)
      .then((res) => {
        setInvite(res.data);
        setTenantName(res.data.tenant?.name || '');
        setMasterEmail(res.data.tenant?.inviteEmail || '');
        setTaxId(res.data.tenant?.document || '');
      })
      .catch((err) => setError(err.response?.data?.message || 'Convite inválido ou expirado.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('A confirmação de senha não confere.');
      return;
    }

    setSaving(true);
    try {
      const response = await onboardingApi.completeSetup(token!, {
        tenantName,
        masterName,
        masterEmail,
        recoveryEmail: recoveryEmail || undefined,
        password,
        taxId,
        document: taxId,
        companyType,
      });

      const { accessToken, refreshToken, user, tenant } = response.data;
      login({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      }, tenant, accessToken, refreshToken);

      setSuccess('Cadastro inicial concluído com sucesso.');
      navigate('/welcome');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao concluir ativação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-[-30%] right-[-15%] w-[55%] h-[55%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-15%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl z-10"
      >
        <div className="bg-surface-950/80 backdrop-blur-xl rounded-xl border border-line shadow-2xl p-5 sm:p-7 md:p-8">
          <div className="mb-5 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-black">Ativação Inicial</h1>
            <p className="text-surface-400 text-sm mt-1">Finalize o cadastro em poucos campos para liberar o tenant.</p>
          </div>

          {invite && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
              <div className="bg-ink/5 rounded-xl p-3 border border-line">
                <p className="text-surface-400 text-[11px] uppercase tracking-wider">Plano</p>
                <p className="font-bold text-white text-sm mt-0.5">{invite.tenant?.plan?.name || 'START'}</p>
              </div>
              <div className="bg-ink/5 rounded-xl p-3 border border-line">
                <p className="text-surface-400 text-[11px] uppercase tracking-wider">Expira em</p>
                <p className="font-bold text-white text-sm mt-0.5">{new Date(invite.expiresAt).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={30} /></div>
          ) : (
            <>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-3 rounded-xl text-sm mb-4">{error}</div>}
              {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-3 rounded-xl text-sm mb-4">{success}</div>}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-surface-200 uppercase tracking-wider ml-1">Nome da Empresa</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="input-dark h-11 pl-10" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-surface-200 uppercase tracking-wider ml-1">Nome MASTER</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input value={masterName} onChange={(e) => setMasterName(e.target.value)} className="input-dark h-11 pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-surface-200 uppercase tracking-wider ml-1">Email MASTER</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type="email" value={masterEmail} onChange={(e) => setMasterEmail(e.target.value)} className="input-dark h-11 pl-10" required />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-surface-200 uppercase tracking-wider ml-1">Email Recuperação</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} className="input-dark h-11 pl-10" placeholder="Opcional" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-surface-200 uppercase tracking-wider ml-1">Documento</label>
                    <input value={taxId} onChange={(e) => setTaxId(formatCpfCnpj(e.target.value))} className="input-dark h-11" placeholder="CPF/CNPJ" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-surface-200 uppercase tracking-wider ml-1">Tipo de Documento</label>
                  <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className="input-dark h-11">
                    <option value="CNPJ">CNPJ</option>
                    <option value="MEI">MEI</option>
                    <option value="CPF">CPF</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-surface-200 uppercase tracking-wider ml-1">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-dark h-11 pl-10 pr-12" placeholder="Mínimo 6 caracteres" required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-surface-200 uppercase tracking-wider ml-1">Confirmar Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-dark h-11 pl-10 pr-12" required minLength={6} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200">
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold h-11 rounded-xl flex items-center justify-center gap-2 mt-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Concluir cadastro inicial'}
                </button>
              </form>
            </>
          )}

          <div className="mt-5 pt-4 border-t border-line text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-semibold">
              <ArrowLeft size={15} /> Voltar ao login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
