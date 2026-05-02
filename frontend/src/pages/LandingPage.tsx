import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { features, plans, quickLinks, type Plan } from '../data/marketingContent';
import { useAuthStore } from '../store/authStore';

export function LandingPage() {
  const navigate = useNavigate();

  const startPlanCheckout = (planName: Plan['name']) => {
    navigate(`/planos?plan=${planName}`);
  };

  const handleAccess = () => {
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    navigate('/splash');
  };

  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-6 pt-8 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#ff7b2f]/30 bg-[#ff7b2f]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#ff7b2f]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff7b2f] animate-pulse" />
          Sistema para oficinas mecânicas
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 text-[clamp(3.4rem,10vw,7rem)] font-black leading-none tracking-[0.12em] uppercase"
          style={{ letterSpacing: '0.14em' }}
        >
          <span className="text-white">Sigma</span>
          <span className="text-[#ff7b2f]"> Auto</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-7 text-[clamp(1.1rem,2.5vw,1.5rem)] font-bold text-white/80 max-w-3xl leading-snug mx-auto"
        >
          Do primeiro parafuso ao lucro no bolso. <span className="text-white">Gestão completa para sua oficina, sem virar uma bagunça digital.</span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          className="mt-4 text-base text-white/45 max-w-2xl mx-auto"
        >
          A home agora é objetiva: apresenta o produto, mostra os diferenciais principais e distribui o restante do conteúdo em páginas dedicadas para navegação mais limpa.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
          className="mt-10 flex flex-wrap gap-3 justify-center"
        >
          <button
            onClick={handleAccess}
            className="h-[52px] px-8 rounded-2xl bg-[#ff7b2f] text-white font-black text-base tracking-wide hover:bg-[#f06820] transition-all shadow-[0_0_30px_rgba(255,123,47,0.4)] inline-flex items-center gap-2"
          >
            Entrar no sistema
            <ArrowRight size={18} />
          </button>
          <Link
            to="/solucoes"
            className="h-[52px] px-8 rounded-2xl border border-white/15 text-white font-bold text-base hover:border-white/40 hover:bg-white/5 transition-all inline-flex items-center"
          >
            Explorar soluções
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-16 flex flex-wrap justify-center gap-8 text-center"
        >
          {[
            { value: '99.95%', label: 'Disponibilidade' },
            { value: '-34%', label: 'Tempo medio de O.S.' },
            { value: '+52%', label: 'Produtividade da equipe' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-3xl font-black text-white">{item.value}</p>
              <p className="text-xs text-white/45 mt-1 uppercase tracking-widest">{item.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-sm p-5 hover:border-[#ff7b2f]/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#ff7b2f]/15 flex items-center justify-center mb-4">
                <Icon size={20} className="text-[#ff7b2f]" />
              </div>
              <p className="font-bold text-sm text-white">{title}</p>
              <p className="mt-1 text-xs text-white/50 leading-relaxed">{desc}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-[#ff7b2f]/70 font-bold mb-3">Navegação Comercial</p>
          <h2 className="text-3xl md:text-4xl font-black">Cada assunto agora tem sua própria página</h2>
          <p className="mt-3 text-white/45 text-sm max-w-2xl mx-auto">
            Em vez de condensar tudo em uma landing longa, a navegação pública foi distribuída para reduzir rolagem excessiva e deixar cada tema com mais espaço.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {quickLinks.map(({ to, eyebrow, title, description, icon: Icon }, index) => (
            <motion.div
              key={to}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Link to={to} className="block rounded-3xl border border-white/8 bg-white/4 backdrop-blur-sm p-6 h-full hover:border-[#ff7b2f]/35 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-[#ff7b2f]/12 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-[#ff7b2f]" />
                </div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/35 font-bold">{eyebrow}</p>
                <h3 className="mt-3 text-lg font-black text-white leading-snug">{title}</h3>
                <p className="mt-3 text-sm text-white/55 leading-relaxed">{description}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-[#ff7b2f] text-xs font-bold">
                  Abrir página <ChevronRight size={13} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <section id="planos" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-[#ff7b2f]/70 font-bold mb-3">Planos</p>
          <h2 className="text-3xl md:text-4xl font-black">Escolha e inicie sua assinatura</h2>
          <p className="mt-3 text-white/45 text-sm">Sem conta? você conclui o pagamento e recebe convite de ativação no e-mail.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan, index) => (
            <motion.article
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className={`relative rounded-3xl border p-6 flex flex-col ${
                plan.featured
                  ? 'bg-[#ff7b2f]/10 border-[#ff7b2f]/40 shadow-[0_0_60px_rgba(255,123,47,0.15)]'
                  : 'bg-white/4 border-white/10'
              }`}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-[#ff7b2f] text-white px-3 py-1 rounded-full">
                  Mais popular
                </span>
              ) : null}
              <p className="text-xs uppercase tracking-widest text-white/40">{plan.label}</p>
              <div className="mt-2 flex items-end gap-1">
                <p className="text-4xl font-black text-white">{plan.price}</p>
                <p className="text-sm text-white/40 mb-1">{plan.period}</p>
              </div>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">{plan.description}</p>

              <ul className="mt-5 space-y-2.5 text-sm flex-1">
                {plan.highlights.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-[#ff7b2f] flex-shrink-0" />
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => startPlanCheckout(plan.name)}
                className={`mt-6 h-11 w-full rounded-xl text-sm font-black transition-all inline-flex items-center justify-center gap-2 ${
                  plan.featured
                    ? 'bg-[#ff7b2f] text-white hover:bg-[#f06820] shadow-[0_0_20px_rgba(255,123,47,0.4)]'
                    : 'bg-white/8 text-white border border-white/15 hover:bg-white/14'
                }`}
              >
                {`Ver modalidades ${plan.label}`}
              </button>
            </motion.article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
