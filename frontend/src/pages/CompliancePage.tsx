import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  LifeBuoy,
  Lock,
  Mail,
  ShieldCheck,
  Siren,
  UserRoundCog,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { companyContacts } from '../lib/companyContacts';

const maturityItems = [
  {
    title: 'Segurança técnica',
    value: 'Base forte',
    detail: 'JWT, segregação por tenant, validação de entrada, hashing de senha e webhook Meta com assinatura validada.',
  },
  {
    title: 'Atendimento LGPD',
    value: 'Parcial',
    detail: 'Fluxos técnicos para solicitação, exportação e eliminação controlada de dados já existem no backend.',
  },
  {
    title: 'Governança documental',
    value: '50%',
    detail: 'Politicas, procedimento do titular, plano de incidentes e registro de governança já foram estruturados.',
  },
];

const pillars = [
  {
    icon: Lock,
    title: 'Controles implementados',
    description: 'Autenticacao por JWT, perfis de acesso, segregação logica multi-tenant, hashing de senha e trilhas de auditoria em eventos relevantes.',
  },
  {
    icon: UserRoundCog,
    title: 'Canal e responsável provisório',
    description: 'O atendimento operacional de privacidade esta centralizado provisoriamente na direcao da SigmaAuto, com entrada por suporte@sigmaauto.com.br até designacao formal de encarregado.',
  },
  {
    icon: FileText,
    title: 'Base documental ativa',
    description: 'Já existe conjunto mínimo de documentos internos cobrindo privacidade, retenção, atendimento ao titular e resposta a incidentes.',
  },
  {
    icon: Siren,
    title: 'Postura de transparência',
    description: 'A página pública apenas o que esta efetivamente implantado ou formalizado, sem prometer conformidade jurídica plena antes de revisão especializada.',
  },
];

const publicDocuments = [
  {
    title: 'Política de Privacidade',
    href: '/privacidade',
    description: 'Versao pública com informações gerais sobre coleta, uso e exercicio de direitos.',
  },
  {
    title: 'Canal de atendimento ao titular',
    href: `mailto:${companyContacts.support}`,
    description: 'Solicitacoes de acesso, correção, exportação e eliminação devem ser iniciadas por esse canal operacional.',
  },
  {
    title: 'Central de suporte',
    href: '/suporte',
    description: 'Página pública com manual, FAQ e canais operacionais de contato.',
  },
];

const nextSteps = [
  'Revisão jurídica dos textos antes de consolidacao definitiva no site institucional.',
  'Formalizacao nominal do encarregado/DPO e da matriz de responsabilidades.',
  'Automacao de retenção e descarte por categoria de dado com cronograma operacional.',
  'Expansao continua da trilha de auditoria para dominios administrativos criticos.',
];

export function CompliancePage() {
  return (
    <MarketingShell>
      <section className="relative max-w-6xl mx-auto px-6 pt-8 pb-16">
        <div className="absolute inset-0 pointer-events-none flex justify-center">
          <div className="mt-12 h-64 w-[42rem] rounded-full bg-accent-soft " />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative rounded-xl border border-accent/30 bg-[linear-gradient(135deg,rgba(255,123,47,0.12),rgba(40,85,214,0.08))] p-8 md:p-10 overflow-hidden"
        >
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-accent-soft blur-3xl" />
          <div className="max-w-4xl relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-accent-ink">
              <ShieldCheck size={14} />
              Publicacao provisoria de compliance
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-none text-surface-50">
              Central de Privacidade,
              <span className="block text-accent-ink">LGPD e Compliance</span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm md:text-base leading-relaxed text-surface-500">
              Esta página consolida, de forma pública e provisoria, o status real dos controles de privacidade e segurança do SigmaAuto.
              O objetivo aqui e transparencia operacional: mostrar o que ja existe, o que esta em amadurecimento e o que ainda depende de revisao juridica e formalizacao adicional.
            </p>

            <div className="mt-6 rounded-lg border border-line bg-panel p-5 text-sm text-surface-500 leading-relaxed">
              <p className="font-bold text-surface-50">Importante</p>
              <p className="mt-2">
                Este conteudo não representa certificação, parecer jurídico ou declaração de conformidade plena. Trata-se de uma central de governança e transparência em revisão continua.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-8">
        <div className="grid md:grid-cols-3 gap-4">
          {maturityItems.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-xl border border-line bg-ink/5 p-6"
            >
              <p className="text-[12px] uppercase tracking-wide text-surface-500 font-bold">{item.title}</p>
              <p className="mt-3 text-3xl font-bold text-surface-50">{item.value}</p>
              <p className="mt-3 text-sm leading-relaxed text-surface-500">{item.detail}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-wide text-accent-ink font-bold">Pilares ativos</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold text-surface-50">O que já esta operacionalizado</h2>
          </div>
          <p className="max-w-2xl text-sm text-surface-500 leading-relaxed">
            A página foi desenhada para publicar somente informações verificaveis no produto, na infraestrutura e na governança documental já existente.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {pillars.map(({ icon: Icon, title, description }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="rounded-xl border border-line bg-panel p-6"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink border border-accent/30">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-surface-50">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-surface-500">{description}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-4">
        <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-line bg-ink/5 p-7"
          >
            <div className="flex items-center gap-3">
              <BadgeCheck className="text-accent-ink" size={20} />
              <h2 className="text-2xl font-bold text-surface-50">Canais e documentos publicos</h2>
            </div>
            <div className="mt-6 space-y-4">
              {publicDocuments.map((item) => {
                const isInternal = item.href.startsWith('/');
                const content = (
                  <div className="rounded-lg border border-line bg-panel p-5 transition-colors hover:border-accent/30">
                    <p className="text-base font-bold text-surface-50">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-surface-500">{item.description}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent-ink">
                      Acessar
                      <ArrowRight size={14} />
                    </div>
                  </div>
                );

                return isInternal ? (
                  <Link key={item.title} to={item.href}>
                    {content}
                  </Link>
                ) : (
                  <a key={item.title} href={item.href}>
                    {content}
                  </a>
                );
              })}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-accent/30 bg-accent-soft p-7"
          >
            <div className="flex items-center gap-3">
              <Mail className="text-accent-ink" size={20} />
              <h2 className="text-2xl font-bold text-surface-50">Contato de privacidade</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-surface-500">
              Até a nomeacao formal de encarregado, o canal operacional provisório para temas de privacidade, governança documental e solicitacoes iniciais do titular e o e-mail abaixo.
            </p>
            <a
              href={`mailto:${companyContacts.support}`}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-line bg-ink/5 px-4 py-3 text-sm font-bold text-white hover:border-accent/30 hover:bg-accent-soft transition-all"
            >
              <LifeBuoy size={16} />
              {companyContacts.support}
            </a>
            <div className="mt-6 rounded-lg border border-line bg-panel p-5">
              <p className="text-xs uppercase tracking-wide text-surface-500 font-bold">Escopo atual</p>
              <p className="mt-3 text-sm text-surface-500 leading-relaxed">
                Recebimento inicial de pedidos de acesso, correção, exportação, eliminação e duvidas sobre tratamento de dados no contexto da plataforma.
              </p>
            </div>
          </motion.aside>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-xl border border-line bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8 md:p-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-accent-ink font-bold">Proximas consolidacoes</p>
              <h2 className="mt-2 text-3xl md:text-4xl font-bold text-surface-50">O que ainda esta em amadurecimento</h2>
            </div>
            <p className="max-w-2xl text-sm text-surface-500 leading-relaxed">
              Transparência também exige expor o que ainda não esta concluido. Esses itens seguem no trilho de maturação da governança e da conformidade documental.
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {nextSteps.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="rounded-lg border border-line bg-panel p-5 text-sm text-surface-500 leading-relaxed"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}