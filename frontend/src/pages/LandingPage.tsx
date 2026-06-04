import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { ArrowRight, CheckCircle, CheckCircle2, ChevronRight, CircleSlash } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { EcgPulse } from '../components/marketing/EcgPulse';
import { type PlanName } from '../lib/planAccess';
import { features, plans, planCapabilities, quickLinks, retificaPlans, type Plan } from '../data/marketingContent';
import { useAuthStore } from '../store/authStore';

export function LandingPage() {
  const navigate = useNavigate();
  const logoControls = useAnimation();

  useEffect(() => {
    async function runLogoSequence() {
      await logoControls.start({
        rotateY: 0,
        scale: 1,
        opacity: 1,
        transition: { duration: 1.55, ease: [0.23, 1.0, 0.32, 1.0] },
      });
      logoControls.start({
        rotateY: 360,
        transition: { duration: 9, repeat: Infinity, ease: 'linear' },
      });
    }
    runLogoSequence();
  }, [logoControls]);

  const startPlanCheckout = (planName: PlanName) => {
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
      <section className="relative max-w-6xl mx-auto px-6 pt-10 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none flex items-start justify-center">
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.08, 0.18, 0.08] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-16 w-[520px] h-[520px] rounded-full bg-[#0b7f86]/25 blur-[95px]"
          />
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#0b7f86]/25 bg-[#0b7f86]/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#0b7f86]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0b7f86] animate-pulse" />
              Sistema para oficinas mecânicas
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-[clamp(2.8rem,7vw,5.2rem)] font-black leading-[0.95] tracking-tight"
            >
              <span className="text-[#0f1f2b]">Sigma</span>{' '}
              <span className="text-[#0b7f86]">Auto</span>
              <span className="block text-[#1a3547] mt-1">gestão em fluxo real</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.17 }}
              className="mt-5"
            >
              <EcgPulse className="h-7 w-[320px] rounded-full border border-[#0b7f86]/30 bg-white/80 overflow-hidden relative" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 text-lg md:text-xl font-bold text-[#1f3948] max-w-2xl leading-snug"
            >
              Do primeiro parafuso ao lucro no bolso, gestão completa para sua oficina sem virar bagunça digital.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="mt-3 text-base text-[#4c6471] max-w-xl"
            >
              Menos planilha, menos retrabalho e mais clareza para decidir, do atendimento ao fechamento da ordem de serviço.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <button
                onClick={handleAccess}
                className="h-[52px] px-8 rounded-2xl bg-[#0b7f86] text-white font-black text-base tracking-wide hover:bg-[#076168] transition-all shadow-[0_16px_34px_rgba(11,127,134,0.28)] inline-flex items-center gap-2"
              >
                Entrar no sistema
                <ArrowRight size={18} />
              </button>
              <Link
                to="/solucoes"
                className="h-[52px] px-8 rounded-2xl border border-[#b9d3db] text-[#1f3948] font-bold text-base hover:border-[#0b7f86]/45 hover:bg-[#0b7f86]/5 transition-all inline-flex items-center"
              >
                Explorar soluções
              </Link>
            </motion.div>
          </div>

          <div className="relative hidden lg:flex items-center justify-center min-h-[420px]">
            <div className="absolute w-[330px] h-[330px] rounded-full bg-[#0b7f86]/12 blur-3xl pointer-events-none" />

            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="w-[260px] h-[260px] rounded-full"
              style={{
                background: 'radial-gradient(circle at 38% 32%, rgba(11,127,134,0.28) 0%, rgba(11,127,134,0.10) 45%, transparent 68%)',
                boxShadow: 'inset 0 0 80px rgba(11,127,134,0.06)',
              }}
            />

            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none animate-spin"
              style={{ animationDuration: '18s' }}
            >
              <div className="w-[300px] h-[300px] rounded-full border border-[#0b7f86]/24" style={{ transform: 'rotateX(62deg)' }} />
            </div>

            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none animate-spin"
              style={{ animationDuration: '7s', animationTimingFunction: 'linear' }}
            >
              <div className="relative" style={{ width: 300, height: 300, transform: 'rotateX(62deg)' }}>
                <div className="absolute" style={{ top: -5, left: '50%', transform: 'translateX(-50%)' }}>
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, #0b7f86 20%, rgba(11,127,134,0.15) 100%)',
                      boxShadow: '0 0 8px 3px rgba(11,127,134,0.75), 0 0 18px rgba(11,127,134,0.30)',
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none animate-spin"
              style={{ animationDuration: '28s', animationDirection: 'reverse' }}
            >
              <div
                className="w-[360px] h-[360px] rounded-full border border-[#0b7f86]/16"
                style={{ transform: 'rotateX(48deg) rotateZ(30deg)' }}
              />
            </div>

            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1.7 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ perspective: 900 }}
            >
              <motion.div initial={{ rotateY: 720, scale: 0.22, opacity: 0 }} animate={logoControls}>
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-36 h-36 rounded-full bg-[#0b7f86]/10 blur-3xl animate-pulse" />
                  <div
                    className="absolute w-[110px] h-[110px] rounded-full border border-[#0b7f86]/30 animate-spin"
                    style={{ animationDuration: '14s' }}
                  />
                  <div
                    className="relative w-20 h-20 rounded-full flex items-center justify-center border-2 border-[#0b7f86]/60"
                    style={{
                      background: 'radial-gradient(circle at 35% 30%, rgba(11,127,134,0.20) 0%, rgba(246,252,253,0.96) 70%)',
                      boxShadow: '0 0 48px rgba(11,127,134,0.25), 0 0 90px rgba(11,127,134,0.12), inset 0 0 24px rgba(11,127,134,0.08)',
                    }}
                  >
                    <img
                      src="/logo.png"
                      alt="Logo SigmaAuto"
                      className="w-11 h-11 object-contain"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(11,127,134,0.55))' }}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#0b7f86]/35 to-transparent" />
      </div>

      <section className="max-w-6xl mx-auto px-6 py-20 mt-8 rounded-[34px] bg-[#0f1f2b]">
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
        <div className="h-px bg-gradient-to-r from-transparent via-[#0b7f86]/35 to-transparent" />
      </div>

      <section className="max-w-6xl mx-auto px-6 py-20 mt-8 rounded-[34px] bg-[#0f1f2b]">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-[#ff7b2f]/70 font-bold mb-3">Navegação Comercial</p>
          <h2 className="text-3xl md:text-4xl font-black">Encontre rapido o que sua oficina precisa</h2>
          <p className="mt-3 text-white/45 text-sm max-w-2xl mx-auto">
            Explore solucoes, diferenciais, suporte e canais de contato em paginas focadas para facilitar sua avaliacao da plataforma.
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
        <div className="h-px bg-gradient-to-r from-transparent via-[#0b7f86]/35 to-transparent" />
      </div>

      <section id="planos" className="max-w-6xl mx-auto px-6 py-20 mt-8 rounded-[34px] bg-[#0f1f2b]">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-[#ff7b2f]/70 font-bold mb-3">Planos</p>
          <h2 className="text-3xl md:text-4xl font-black">Escolha e inicie sua assinatura</h2>
          <p className="mt-3 text-white/45 text-sm">Sem conta? voce conclui o pagamento e recebe convite de ativacao no e-mail.</p>
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

        <div className="mt-12 rounded-3xl border border-[#ff7b2f]/20 bg-[#ff7b2f]/6 p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffb182] font-bold">Linha especializada</p>
            <h3 className="mt-2 text-2xl md:text-3xl font-black text-white">Modo Retífica de Motores</h3>
            <p className="mt-3 text-sm text-white/65 leading-relaxed">
              Para operacoes que precisam receber tanto veiculos completos quanto motores avulsos, o Sigma Auto passa a ter uma familia dedicada de planos.
              Ela preserva toda a operacao da oficina e adiciona o trilho especializado de retifica.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {retificaPlans.map((plan, index) => (
              <motion.article
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-3xl border border-white/10 bg-[#0c1220]/60 p-6"
              >
                <p className="text-xs uppercase tracking-widest text-[#ffb182]">{plan.label}</p>
                <div className="mt-2 flex items-end gap-1">
                  <p className="text-4xl font-black text-white">{plan.price}</p>
                  <p className="text-sm text-white/40 mb-1">{plan.period}</p>
                </div>
                <p className="mt-3 text-sm text-white/60 leading-relaxed">{plan.description}</p>

                <ul className="mt-5 space-y-2.5 text-sm">
                  {plan.highlights.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <CheckCircle2 size={15} className="text-[#ff7b2f] flex-shrink-0" />
                      <span className="text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => startPlanCheckout(plan.name)}
                  className="mt-6 h-11 w-full rounded-xl bg-[#ff7b2f] text-white hover:bg-[#f06820] shadow-[0_0_20px_rgba(255,123,47,0.28)] text-sm font-black transition-all inline-flex items-center justify-center gap-2"
                >
                  Ver modalidade Retifica
                </button>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/4 p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#ff7b2f]/75 font-bold">Comparativo por pacote</p>
              <h3 className="mt-1 text-xl md:text-2xl font-black text-white">Funcoes liberadas em cada plano</h3>
            </div>
            <p className="text-xs text-white/45 max-w-xl">Tabela comercial para facilitar a escolha do pacote ideal por porte de oficina e maturidade da operacao.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="py-2.5 pr-3 text-white/70 font-bold">Funcionalidade</th>
                  <th className="py-2.5 px-3 text-white font-black">Start</th>
                  <th className="py-2.5 px-3 text-[#ffb182] font-black">Pro</th>
                  <th className="py-2.5 px-3 text-[#ffd6ba] font-black">Rede</th>
                </tr>
              </thead>
              <tbody>
                {planCapabilities.map((row) => {
                  const renderCell = (value: string) => {
                    const enabled = value !== 'Nao';
                    return (
                      <span className={`inline-flex items-center gap-1.5 ${enabled ? 'text-emerald-300' : 'text-white/60'}`}>
                        {enabled ? <CheckCircle size={15} className="shrink-0" /> : <CircleSlash size={15} className="shrink-0" />}
                        {value}
                      </span>
                    );
                  };

                  return (
                    <tr key={row.feature} className="border-b border-white/5 last:border-b-0">
                      <td className="py-2.5 pr-3 text-white/80">{row.feature}</td>
                      <td className="py-2.5 px-3">{renderCell(row.start)}</td>
                      <td className="py-2.5 px-3">{renderCell(row.pro)}</td>
                      <td className="py-2.5 px-3">{renderCell(row.rede)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
