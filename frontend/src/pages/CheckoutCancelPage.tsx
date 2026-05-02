import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, RefreshCcw } from 'lucide-react';

export function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-[#090e17] text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mb-6">
          <AlertTriangle className="text-amber-300" size={30} />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300/80">Pagamento não concluído</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-black">Seu checkout foi cancelado</h1>

        <p className="mt-4 text-white/75 leading-relaxed">
          Nenhum problema. Quando quiser, você pode iniciar novamente e escolher outra forma de pagamento no Mercado Pago.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/"
            className="h-11 px-6 rounded-xl bg-[#ff7b2f] text-white font-black inline-flex items-center gap-2 hover:bg-[#f06820]"
          >
            <RefreshCcw size={16} />
            Tentar novamente
          </Link>
          <Link
            to="/"
            className="h-11 px-6 rounded-xl border border-white/20 text-white/85 font-bold inline-flex items-center gap-2 hover:bg-white/5"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
