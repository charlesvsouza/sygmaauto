import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, CheckCircle2, CircleSlash } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { EcgPulse } from '../components/marketing/EcgPulse';
import { type PlanName } from '../lib/planAccess';
import { features, news, plans, planCapabilities, retificaPlans, type Plan } from '../data/marketingContent';
import { useAuthStore } from '../store/authStore';

export function LandingPage() {
  const navigate = useNavigate();

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

  const releasedInnovations = news.filter((item) => item.tag === 'Lançamento').slice(0, 4);
  const plannedIntegrations = news.filter((item) => item.tag !== 'Lançamento').slice(0, 4);

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20 sm:pb-28">
        <div className="grid gap-10 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-accent-ink"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Sistema para oficinas mecânicas
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-[clamp(2.1rem,5.6vw,3.8rem)] font-bold leading-[0.95] tracking-tight"
            >
              <span className="text-surface-50">Sigma</span>{' '}
              <span className="text-accent-ink">Auto</span>
              <span className="block text-accent-ink mt-1">gestão em fluxo real</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.17 }}
              className="mt-5"
            >
              <EcgPulse className="h-7 w-full max-w-[320px] overflow-hidden relative" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 text-lg md:text-xl font-bold text-surface-50 max-w-2xl leading-snug"
            >
              Se hoje sua oficina ainda resolve tudo no papel, aqui você migra com segurança e sem complicação.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="mt-3 text-base text-surface-500 max-w-xl"
            >
              O SigmaAuto foi pensado para a rotina real da oficina: simples de usar, rápido no dia a dia e com apoio humano para sua equipe ganhar confiança no digital.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <button type="button"
                onClick={handleAccess}
                className="h-[52px] px-8 rounded-lg bg-accent text-white font-bold text-base tracking-wide hover:bg-accent-hover transition-all shadow-sm inline-flex items-center gap-2"
              >
                Entrar no sistema
                <ArrowRight size={18} />
              </button>
              <Link
                to="/solucoes"
                className="h-[52px] px-8 rounded-lg border border-line text-accent-ink font-bold text-base hover:border-accent/30 hover:bg-accent-soft transition-all inline-flex items-center"
              >
                Explorar soluções
              </Link>
            </motion.div>

            <div className="mt-6 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink max-w-2xl leading-relaxed">
              Comece no seu ritmo: importamos dados, treinamos sua equipe e acompanhamos os primeiros dias para a transição do papel acontecer sem trauma.
            </div>
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, desc }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-xl border border-line bg-ink/5 p-6 hover:border-accent/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center mb-4">
                <Icon size={20} className="text-accent-ink" />
              </div>
              <p className="font-bold text-sm text-surface-50">{title}</p>
              <p className="mt-1 text-xs text-surface-500 leading-relaxed">{desc}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Transparência de produto */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-wide text-accent-ink font-bold mb-3">Transparência de produto</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-surface-50">O que já entregamos e o que vem a seguir</h2>
          <p className="mt-3 text-surface-500 text-sm max-w-2xl">
            Sem promessa vazia: aqui mostramos as inovações já disponíveis e as integrações planejadas para a evolução da sua operação.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-x-12 gap-y-10">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-emerald-500 font-bold">Inovações disponíveis</p>
            <h3 className="mt-2 text-xl font-bold text-surface-50">Já em uso por oficinas</h3>
            <div className="mt-6">
              {releasedInnovations.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                  className="flex gap-4 py-5 border-b border-line last:border-b-0"
                >
                  <span className="text-2xl font-bold text-surface-500 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] uppercase tracking-wide text-emerald-500/90 font-bold">{item.tag}</p>
                      <span className="text-[12px] text-surface-500">{item.date}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-surface-50">{item.title}</p>
                    <p className="mt-1.5 text-xs text-surface-500 leading-relaxed">{item.excerpt}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] uppercase tracking-wide text-accent-ink font-bold">Integrações planejadas</p>
            <h3 className="mt-2 text-xl font-bold text-surface-50">Próximos passos do roadmap</h3>
            <div className="mt-6">
              {plannedIntegrations.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                  className="flex gap-4 py-5 border-b border-line last:border-b-0"
                >
                  <span className="text-2xl font-bold text-surface-500 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] uppercase tracking-wide text-accent-ink font-bold">{item.tag}</p>
                      <span className="text-[12px] text-surface-500">{item.date}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-surface-50">{item.title}</p>
                    <p className="mt-1.5 text-xs text-surface-500 leading-relaxed">{item.excerpt}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-accent/30 bg-accent-soft px-5 py-4 text-sm text-accent-ink">
          A ideia é simples: você não precisa virar uma empresa de tecnologia para modernizar a oficina. O sistema se adapta ao seu processo e evolui junto com sua equipe.
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-wide text-accent-ink font-bold mb-3">Planos</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Escolha e inicie sua assinatura</h2>
          <p className="mt-3 text-surface-500 text-sm">Sem conta? você conclui o pagamento e recebe convite de ativacao no e-mail.</p>
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
 ? 'bg-accent-soft border-accent/30 shadow-sm'
 : 'bg-ink/5 border-line'
 }`}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-wide bg-accent text-white px-3 py-1 rounded-full">
                  Mais popular
                </span>
              ) : null}
              <p className="text-xs uppercase tracking-wide text-surface-500">{plan.label}</p>
              <div className="mt-2 flex items-end gap-1">
                <p className="text-3xl font-bold text-surface-50">{plan.price}</p>
                <p className="text-sm text-surface-500 mb-1">{plan.period}</p>
              </div>
              <p className="mt-3 text-sm text-surface-500 leading-relaxed">{plan.description}</p>

              <ul className="mt-5 space-y-2.5 text-sm flex-1">
                {plan.highlights.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-accent-ink flex-shrink-0" />
                    <span className="text-surface-500">{feature}</span>
                  </li>
                ))}
              </ul>

              <button type="button"
                onClick={() => startPlanCheckout(plan.name)}
                className={`mt-6 h-11 w-full rounded-xl text-sm font-bold transition-all inline-flex items-center justify-center gap-2 ${
 plan.featured
 ? 'bg-accent text-white hover:bg-accent-hover shadow-sm'
 : 'bg-ink/5 text-white border border-line hover:bg-ink/5'
 }`}
              >
                {`Ver modalidades ${plan.label}`}
              </button>
            </motion.article>
          ))}
        </div>

        <div className="mt-14 rounded-xl border border-accent/30 bg-accent-soft p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-[12px] uppercase tracking-wide text-accent-ink font-bold">Linha especializada</p>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold text-surface-50">Modo Retífica de Motores</h3>
            <p className="mt-3 text-sm text-surface-500 leading-relaxed">
              Para operações que precisam receber tanto veículos completos quanto motores avulsos, o Sigma Auto passa a ter uma familia dedicada de planos.
              Ela preserva toda a operação da oficina e adiciona o trilho especializado de retífica.
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
                className="rounded-xl border border-line bg-panel p-6"
              >
                <p className="text-xs uppercase tracking-wide text-accent-ink">{plan.label}</p>
                <div className="mt-2 flex items-end gap-1">
                  <p className="text-3xl font-bold text-surface-50">{plan.price}</p>
                  <p className="text-sm text-surface-500 mb-1">{plan.period}</p>
                </div>
                <p className="mt-3 text-sm text-surface-500 leading-relaxed">{plan.description}</p>

                <ul className="mt-5 space-y-2.5 text-sm">
                  {plan.highlights.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <CheckCircle2 size={15} className="text-accent-ink flex-shrink-0" />
                      <span className="text-surface-500">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button type="button"
                  onClick={() => startPlanCheckout(plan.name)}
                  className="mt-6 h-11 w-full rounded-xl bg-accent text-white hover:bg-accent-hover shadow-sm text-sm font-bold transition-all inline-flex items-center justify-center gap-2"
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
              <p className="text-[12px] uppercase tracking-wide text-accent-ink font-bold">Comparativo por pacote</p>
              <h3 className="mt-1 text-xl md:text-2xl font-bold text-surface-50">Funcoes liberadas em cada plano</h3>
            </div>
            <p className="text-xs text-surface-500 max-w-xl">Tabela comercial para facilitar a escolha do pacote ideal por porte de oficina e maturidade da operação.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-line">
                  <th className="py-2.5 pr-3 text-surface-500 font-bold">Funcionalidade</th>
                  <th className="py-2.5 px-3 text-surface-50 font-bold">Start</th>
                  <th className="py-2.5 px-3 text-accent-ink font-bold">Pro</th>
                  <th className="py-2.5 px-3 text-accent-ink font-bold">Rede</th>
                </tr>
              </thead>
              <tbody>
                {planCapabilities.map((row) => {
                  const renderCell = (value: string) => {
                    const enabled = value !== 'Não';
                    return (
                      <span className={`inline-flex items-center gap-1.5 ${enabled ? 'text-emerald-500' : 'text-surface-500'}`}>
                        {enabled ? <CheckCircle size={15} className="shrink-0" /> : <CircleSlash size={15} className="shrink-0" />}
                        {value}
                      </span>
                    );
                  };

                  return (
                    <tr key={row.feature} className="border-b border-line last:border-b-0">
                      <td className="py-2.5 pr-3 text-surface-500">{row.feature}</td>
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
