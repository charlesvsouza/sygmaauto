import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const plan = (searchParams.get('plan') || '').toUpperCase();

  return (
    <div className="min-h-screen bg-app text-surface-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl rounded-xl border border-line bg-ink/5 p-8 md:p-10"
      >
        <div className="w-14 h-14 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mb-6">
          <CheckCircle2 className="text-emerald-700" size={30} />
        </div>

        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700/80">Pagamento recebido</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold">Checkout concluído com sucesso</h1>

        <p className="mt-4 text-surface-500 leading-relaxed">
          {plan
            ? `Seu pagamento do plano ${plan} foi recebido.`
            : 'Seu pagamento foi recebido.'}{' '}
          Agora vamos enviar o convite de ativação do usuário MASTER para o email informado no checkout.
        </p>

        <div className="mt-6 rounded-lg border border-line bg-app p-5">
          <p className="text-sm font-bold text-surface-500 flex items-center gap-2">
            <Mail size={16} className="text-accent-ink" />
            Próximo passo
          </p>
          <p className="mt-2 text-sm text-surface-500">
            Verifique sua caixa de entrada e spam para encontrar o convite de ativação. Com ele você conclui o cadastro em poucos minutos.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="h-11 px-6 rounded-xl bg-accent text-white font-bold inline-flex items-center gap-2 hover:bg-accent-hover"
          >
            Voltar para landing
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="h-11 px-6 rounded-xl border border-line text-surface-500 font-bold inline-flex items-center hover:bg-ink/5"
          >
            Já tenho convite, entrar
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
