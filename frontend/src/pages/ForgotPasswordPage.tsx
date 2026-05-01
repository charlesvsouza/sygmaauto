import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../api/client';
import { Mail, ShieldCheck, Lock, Loader2, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devToken, setDevToken] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setStep(2);
    }
  }, [searchParams]);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevToken('');
    setLoading(true);

    try {
      const response = await authApi.requestPasswordReset(email, recoveryEmail);
      const message = response.data?.message || 'Revalidação concluída.';
      const returnedToken = response.data?.token || '';

      setSuccess(message);
      setDevToken(returnedToken);
      if (returnedToken) {
        setToken(returnedToken);
      }
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível iniciar recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword(token, newPassword);
      setSuccess(response.data?.message || 'Senha redefinida com sucesso.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[520px] z-10"
      >
        <div className="glass-card bg-slate-900/40 p-8 md:p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden backdrop-blur-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white">Revalidar Senha</h1>
            <p className="text-slate-300 text-sm mt-1">
              {step === 1 ? 'Confirme seu e-mail principal e e-mail de recuperação.' : 'Informe o token e sua nova senha.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm mb-5">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-sm mb-5">
              {success}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={requestReset} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest ml-1">Email de Login</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest ml-1">Email de Recuperação</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full bg-slate-950/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="recuperacao@email.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !recoveryEmail}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound size={18} /> Validar e Gerar Token</>}
              </button>
            </form>
          ) : (
            <form onSubmit={submitNewPassword} className="space-y-5">
              {devToken && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl text-sm">
                  Token retornado pelo backend: <span className="font-bold">{devToken}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest ml-1">Token de Recuperação</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  placeholder="cole o token aqui"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest ml-1">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950/40 border border-white/10 rounded-2xl py-3.5 px-4 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="repita a nova senha"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !token || !newPassword || !confirmPassword}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Redefinir Senha'}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-semibold">
              <ArrowLeft size={16} /> Voltar ao login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
