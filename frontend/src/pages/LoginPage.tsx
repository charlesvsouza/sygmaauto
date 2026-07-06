import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { authApi, subscriptionsApi } from '../api/client';
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { SigmaAutoLogo } from '../components/SigmaAutoLogo';
const LOGIN_PROGRESS_DURATION_MS = 30000;

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); // mantido para não quebrar o useEffect
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();
  const pendingCheckoutPlan = sessionStorage.getItem('pendingCheckoutPlan');
  const sessionExpired = searchParams.get('reason') === 'session-expired';

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(elapsed / LOGIN_PROGRESS_DURATION_MS, 1);
      setLoadingProgress(nextProgress);
    }, 100);

    return () => window.clearInterval(timer);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { accessToken, refreshToken, user, tenant } = response.data;
      
      login(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
        tenant,
        accessToken,
        refreshToken
      );
      
      const nextPath = searchParams.get('next');

      // Se há plano pendente (vindo da landing page), faz checkout direto
      const pendingPlan = sessionStorage.getItem('pendingCheckoutPlan');
      if (pendingPlan) {
        sessionStorage.removeItem('pendingCheckoutPlan');
        try {
          const origin = window.location.origin;
          const successUrl = `${origin}/settings?checkout=success&plan=${pendingPlan}`;
          const cancelUrl = `${origin}/settings?checkout=cancel`;
          const res = await subscriptionsApi.createCheckout(pendingPlan, successUrl, cancelUrl);
          const checkoutUrl = res.data?.checkoutUrl;
          if (checkoutUrl) {
            window.location.href = checkoutUrl;
            return;
          }
          throw new Error('Checkout indisponível para este plano');
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Falha ao iniciar checkout';
          setCheckoutError(msg);
          setLoading(false);
          return;
        }
      }

      if (nextPath && nextPath.startsWith('/')) {
        navigate(nextPath, { replace: true });
      } else {
        navigate('/welcome');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow (dourado, sutil) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/[0.06] rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="bg-surface-900 p-8 md:p-10 rounded-xl border border-line relative overflow-hidden shadow-card-hover">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10">
            <SigmaAutoLogo variant="full" tone="brand" className="mb-2" />
            <p className="text-surface-300 text-sm mt-1">Bem-vindo de volta!</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-danger/20 border border-danger/30 text-red-700 p-4 rounded-xl text-sm mb-6 flex items-center gap-3"
            >
              <div className="w-1 h-1 bg-red-400 rounded-full" />
              {error}
            </motion.div>
          )}

          {checkoutError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-warning/15 border border-warning/30 text-amber-700 p-4 rounded-xl text-sm mb-6"
            >
              <p className="font-semibold mb-1">Falha ao iniciar checkout</p>
              <p className="text-amber-700/80">{checkoutError}</p>
              <p className="mt-2 text-amber-600/70 text-xs">Tente acessar o checkout pelo menu <strong>Configurações → Assinatura</strong>.</p>
            </motion.div>
          )}

          {pendingCheckoutPlan && !checkoutError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent/10 border border-accent/40 text-accent p-4 rounded-xl text-sm mb-6"
            >
              <p className="font-semibold mb-1">Checkout pendente</p>
              <p className="text-accent/90">
                Faça login para continuar a assinatura do plano <strong>{pendingCheckoutPlan}</strong>.
              </p>
            </motion.div>
          )}

          {sessionExpired && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-warning/15 border border-warning/30 text-amber-100 p-4 rounded-xl text-sm mb-6"
            >
              <p className="font-semibold mb-1">Sessão encerrada por segurança</p>
              <p className="text-amber-700/90">
                Sua sessão expirou por inatividade ou tempo máximo de uso. Faça login novamente para continuar.
              </p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-surface-300 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-950/40 border border-line rounded-lg py-3.5 pl-12 pr-4 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold text-surface-300 uppercase tracking-widest">Senha</label>
                <Link to="/forgot-password" className="text-[10px] font-bold text-accent hover:text-accent uppercase tracking-tighter">Esqueceu a senha?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-950/40 border border-line rounded-lg py-3.5 pl-12 pr-12 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-accent hover:bg-accent-hover text-surface-950 font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-8 shadow-lg shadow-accent/20"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight size={20} />
                </>
              )}
            </button>


          </form>

          <div className="mt-10 pt-8 border-t border-line text-center">
            <p className="text-surface-400 text-sm">
              Conheça os planos?{' '}
              <Link to="/" className="text-accent hover:text-accent font-bold transition-colors">
                Ver planos e preços
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}