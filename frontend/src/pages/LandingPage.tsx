import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { ArrowRight, CheckCircle, CheckCircle2, CircleSlash } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { EcgPulse } from '../components/marketing/EcgPulse';
import { type PlanName } from '../lib/planAccess';
import { features, news, plans, planCapabilities, retificaPlans, type Plan } from '../data/marketingContent';
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
        transition: { duration: 1.25, ease: [0.23, 1, 0.32, 1] },
      });
      logoControls.start({
        rotateY: 360,
        transition: { duration: 10, repeat: Infinity, ease: 'linear' },
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

  const releasedInnovations = news.filter((item) => item.tag === 'Lancamento').slice(0, 4);
  const plannedIntegrations = news.filter((item) => item.tag !== 'Lancamento').slice(0, 4);

  return (
    <MarketingShell>
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-16 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none flex items-start justify-center">
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.1, 0.22, 0.1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-16 w-[520px] h-[520px] rounded-full bg-[#0b7f86]/28 blur-[95px]"
          />
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
          <div className="rounded-[30px] border border-line bg-ink/5 backdrop-blur-sm px-4 sm:px-7 py-6 sm:py-8 shadow-[0_20px_64px_rgba(0,0,0,0.35)]">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#0b7f86]/35 bg-[#0b7f86]/12 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#7fd2d8]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0b7f86] animate-pulse" />
              Sistema para oficinas mecânicas
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-[clamp(1.8rem,5.2vw,3.4rem)] font-black leading-[0.95] tracking-tight"
            >
              <span className="text-[#f8fafc]">Sigma</span>{' '}
              <span className="text-[#58c3cb]">Auto</span>
              <span className="block text-[#c6d4df] mt-1">gestão em fluxo real</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.17 }}
              className="mt-5"
            >
              <EcgPulse className="h-7 w-full max-w-[320px] rounded-full border border-[#0b7f86]/30 bg-ink/5 overflow-hidden relative" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 text-lg md:text-xl font-bold text-[#e5ecf3] max-w-2xl leading-snug"
            >
              Se hoje sua oficina ainda resolve tudo no papel, aqui você migra com segurança e sem complicação.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="mt-3 text-base text-[#a1b0bd] max-w-xl"
            >
              O SigmaAuto foi pensado para a rotina real da oficina: simples de usar, rápido no dia a dia e com apoio humano para sua equipe ganhar confiança no digital.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <button
                onClick={handleAccess}
                className="h-[52px] px-8 rounded-lg bg-[#0b7f86] text-white font-black text-base tracking-wide hover:bg-[#076168] transition-all shadow-[0_16px_34px_rgba(11,127,134,0.28)] inline-flex items-center gap-2"
              >
                Entrar no sistema
                <ArrowRight size={18} />
              </button>
              <Link
                to="/solucoes"
                className="h-[52px] px-8 rounded-lg border border-line text-[#dce5ee] font-bold text-base hover:border-[#58c3cb]/55 hover:bg-[#58c3cb]/10 transition-all inline-flex items-center"
              >
                Explorar soluções
              </Link>
            </motion.div>

            <div className="mt-6 rounded-lg border border-[#58c3cb]/30 bg-[#58c3cb]/8 px-4 py-3 text-sm text-[#d6edf0] max-w-2xl leading-relaxed">
              Comece no seu ritmo: importamos dados, treinamos sua equipe e acompanhamos os primeiros dias para a transição do papel acontecer sem trauma.
            </div>
          </div>

          <div className="relative hidden lg:flex items-center justify-center min-h-[460px]">
            <div
              className="absolute"
              style={{ left: '44%', top: '43%', transform: 'translate(-50%, -50%)' }}
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-3xl"
                style={{
                  background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(11,127,134,0.14) 55%, rgba(11,127,134,0.02) 100%)',
                }}
              />

              <div className="pointer-events-none absolute" style={{ left: 0, top: 0, transform: 'translate(-50%, -50%) rotateZ(20deg) rotateX(70deg)' }}>
                <div className="w-[238px] h-[238px] rounded-full border" style={{ borderColor: 'rgba(251,191,36,0.55)' }} />
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotateZ: [0, 360] }}
                  transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="absolute" style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}>
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, #fbbf24 20%, rgba(251,191,36,0.15) 100%)',
                        boxShadow: '0 0 8px 3px rgba(251,191,36,0.9), 0 0 18px rgba(251,191,36,0.4)',
                      }}
                    />
                  </div>
                </motion.div>
              </div>

              <div className="pointer-events-none absolute" style={{ left: 0, top: 0, transform: 'translate(-50%, -50%) rotateZ(-22deg) rotateX(62deg)' }}>
                <div className="w-[318px] h-[318px] rounded-full border" style={{ borderColor: 'rgba(245,158,11,0.45)' }} />
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotateZ: [120, 480] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="absolute" style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}>
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, #f59e0b 20%, rgba(245,158,11,0.15) 100%)',
                        boxShadow: '0 0 8px 3px rgba(245,158,11,0.9), 0 0 18px rgba(245,158,11,0.38)',
                      }}
                    />
                  </div>
                </motion.div>
              </div>

              <div className="pointer-events-none absolute hidden sm:block" style={{ left: 0, top: 0, transform: 'translate(-50%, -50%) rotateZ(8deg) rotateX(58deg)' }}>
                <div className="w-[392px] h-[392px] rounded-full border" style={{ borderColor: 'rgba(251,191,36,0.38)' }} />
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotateZ: [240, 600] }}
                  transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="absolute" style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}>
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, #fcd34d 20%, rgba(252,211,77,0.15) 100%)',
                        boxShadow: '0 0 8px 3px rgba(252,211,77,0.85), 0 0 18px rgba(252,211,77,0.35)',
                      }}
                    />
                  </div>
                </motion.div>
              </div>

              <div className="absolute z-10" style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}>
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1.7 }}
                  style={{ perspective: 900 }}
                >
                  <motion.div initial={{ rotateY: 620, scale: 0.25, opacity: 0 }} animate={logoControls}>
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-[100px] h-[100px] rounded-full blur-2xl" style={{ background: 'rgba(251,191,36,0.22)' }} />
                      <div
                        className="absolute w-[80px] h-[80px] rounded-full border animate-spin"
                        style={{ borderColor: 'rgba(251,191,36,0.34)', animationDuration: '14s' }}
                      />
                      <div
                        className="relative w-[60px] h-[60px] rounded-full flex items-center justify-center border"
                        style={{
                          borderColor: 'rgba(251,191,36,0.65)',
                          background: 'radial-gradient(circle at 35% 30%, rgba(11,127,134,0.16) 0%, rgba(2,17,23,0.96) 74%)',
                          boxShadow: '0 0 40px rgba(251,191,36,0.22), 0 0 70px rgba(11,127,134,0.16), inset 0 0 22px rgba(251,191,36,0.07)',
                        }}
                      >
                        <img
                          src="/logo.png"
                          alt="Logo SigmaAuto"
                          className="w-[30px] h-[30px] object-contain"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.68))' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#0b7f86]/35 to-transparent" />
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-14 mt-8 rounded-[34px] bg-[#0f1f2b] border border-line">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-xl border border-line bg-ink/5 backdrop-blur-sm p-5 hover:border-[#ff7b2f]/35 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#ff7b2f]/15 flex items-center justify-center mb-4">
                <Icon size={20} className="text-[#ff7b2f]" />
              </div>
              <p className="font-bold text-sm text-white">{title}</p>
              <p className="mt-1 text-xs text-white/68 leading-relaxed">{desc}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#0b7f86]/35 to-transparent" />
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-14 mt-8 rounded-[34px] bg-[#0f1f2b] border border-line">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[#58c3cb]/80 font-bold mb-3">Transparência de produto</p>
          <h2 className="text-2xl sm:text-3xl md:text-3xl font-black text-white">O que já entregamos e o que vem a seguir</h2>
          <p className="mt-3 text-white/65 text-sm max-w-3xl mx-auto">
            Sem promessa vazia: aqui mostramos as inovações já disponíveis e as integrações planejadas para a evolução da sua operação.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-line bg-ink/5 backdrop-blur-sm p-6"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-700/90 font-bold">Inovações disponíveis</p>
            <h3 className="mt-3 text-xl font-black text-white">Já em uso por oficinas</h3>
            <div className="mt-5 space-y-4">
              {releasedInnovations.map((item) => (
                <div key={item.title} className="rounded-lg border border-line bg-[#0b1320]/55 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-700/80 font-bold">{item.tag}</p>
                    <span className="text-[11px] text-white/45">{item.date}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-white">{item.title}</p>
                  <p className="mt-2 text-xs text-white/70 leading-relaxed">{item.excerpt}</p>
                </div>
              ))}
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="rounded-xl border border-line bg-ink/5 backdrop-blur-sm p-6"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#7fd2d8] font-bold">Integrações planejadas</p>
            <h3 className="mt-3 text-xl font-black text-white">Próximos passos do roadmap</h3>
            <div className="mt-5 space-y-4">
              {plannedIntegrations.map((item) => (
                <div key={item.title} className="rounded-lg border border-line bg-[#0b1320]/55 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#7fd2d8] font-bold">{item.tag}</p>
                    <span className="text-[11px] text-white/45">{item.date}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-white">{item.title}</p>
                  <p className="mt-2 text-xs text-white/70 leading-relaxed">{item.excerpt}</p>
                </div>
              ))}
            </div>
          </motion.article>
        </div>

        <div className="mt-8 rounded-lg border border-[#58c3cb]/25 bg-[#58c3cb]/8 px-5 py-4 text-sm text-[#d8edf0]">
          A ideia é simples: você não precisa virar uma empresa de tecnologia para modernizar a oficina. O sistema se adapta ao seu processo e evolui junto com sua equipe.
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#0b7f86]/35 to-transparent" />
      </div>

      <section id="planos" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-14 mt-8 rounded-[34px] bg-[#0f1f2b]">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[#ff7b2f]/70 font-bold mb-3">Planos</p>
          <h2 className="text-2xl sm:text-3xl md:text-3xl font-black">Escolha e inicie sua assinatura</h2>
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
              className={`relative rounded-xl border p-6 flex flex-col ${
                plan.featured
                  ? 'bg-[#ff7b2f]/10 border-[#ff7b2f]/40 shadow-[0_0_60px_rgba(255,123,47,0.15)]'
                  : 'bg-ink/5 border-line'
              }`}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wide bg-[#ff7b2f] text-white px-3 py-1 rounded-full">
                  Mais popular
                </span>
              ) : null}
              <p className="text-xs uppercase tracking-widest text-white/40">{plan.label}</p>
              <div className="mt-2 flex items-end gap-1">
                <p className="text-3xl font-black text-white">{plan.price}</p>
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
                    : 'bg-ink/5 text-white border border-line hover:bg-ink/5'
                }`}
              >
                {`Ver modalidades ${plan.label}`}
              </button>
            </motion.article>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-[#ff7b2f]/20 bg-[#ff7b2f]/6 p-6 md:p-8">
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
                className="rounded-xl border border-line bg-[#0c1220]/60 p-6"
              >
                <p className="text-xs uppercase tracking-widest text-[#ffb182]">{plan.label}</p>
                <div className="mt-2 flex items-end gap-1">
                  <p className="text-3xl font-black text-white">{plan.price}</p>
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

        <div className="mt-10 rounded-xl border border-line bg-ink/5 p-5 md:p-7">
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
                <tr className="text-left border-b border-line">
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
                      <span className={`inline-flex items-center gap-1.5 ${enabled ? 'text-emerald-700' : 'text-white/60'}`}>
                        {enabled ? <CheckCircle size={15} className="shrink-0" /> : <CircleSlash size={15} className="shrink-0" />}
                        {value}
                      </span>
                    );
                  };

                  return (
                    <tr key={row.feature} className="border-b border-line last:border-b-0">
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
