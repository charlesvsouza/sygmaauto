import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const plan = (searchParams.get('plan') || '').toUpperCase();

  return (
    <div className="min-h-screen bg-[#090e17] text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mb-6">
          <CheckCircle2 className="text-emerald-300" size={30} />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/80">Pagamento recebido</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-black">Checkout concluído com sucesso</h1>

        <p className="mt-4 text-white/75 leading-relaxed">
          {plan
            ? `Seu pagamento do plano ${plan} foi recebido.`
            : 'Seu pagamento foi recebido.'}{' '}
          Agora vamos enviar o convite de ativação do usuário MASTER para o email informado no checkout.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f1626] p-5">
          <p className="text-sm font-bold text-white/90 flex items-center gap-2">
            <Mail size={16} className="text-[#ff7b2f]" />
            Próximo passo
          </p>
          <p className="mt-2 text-sm text-white/65">
            Verifique sua caixa de entrada e spam para encontrar o convite de ativação. Com ele você conclui o cadastro em poucos minutos.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="h-11 px-6 rounded-xl bg-[#ff7b2f] text-white font-black inline-flex items-center gap-2 hover:bg-[#f06820]"
          >
            Voltar para landing
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="h-11 px-6 rounded-xl border border-white/20 text-white/85 font-bold inline-flex items-center hover:bg-white/5"
          >
            Já tenho convite, entrar
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
