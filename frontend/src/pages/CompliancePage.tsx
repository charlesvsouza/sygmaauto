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
    title: 'Seguranca tecnica',
    value: 'Base forte',
    detail: 'JWT, segregacao por tenant, validacao de entrada, hashing de senha e webhook Meta com assinatura validada.',
  },
  {
    title: 'Atendimento LGPD',
    value: 'Parcial',
    detail: 'Fluxos tecnicos para solicitacao, exportacao e eliminacao controlada de dados ja existem no backend.',
  },
  {
    title: 'Governanca documental',
    value: '50%',
    detail: 'Politicas, procedimento do titular, plano de incidentes e registro de governanca ja foram estruturados.',
  },
];

const pillars = [
  {
    icon: Lock,
    title: 'Controles implementados',
    description: 'Autenticacao por JWT, perfis de acesso, segregacao logica multi-tenant, hashing de senha e trilhas de auditoria em eventos relevantes.',
  },
  {
    icon: UserRoundCog,
    title: 'Canal e responsavel provisorio',
    description: 'O atendimento operacional de privacidade esta centralizado provisoriamente na direcao da SigmaAuto, com entrada por suporte@sigmaauto.com.br ate designacao formal de encarregado.',
  },
  {
    icon: FileText,
    title: 'Base documental ativa',
    description: 'Ja existe conjunto minimo de documentos internos cobrindo privacidade, retencao, atendimento ao titular e resposta a incidentes.',
  },
  {
    icon: Siren,
    title: 'Postura de transparencia',
    description: 'A pagina publica apenas o que esta efetivamente implantado ou formalizado, sem prometer conformidade juridica plena antes de revisao especializada.',
  },
];

const publicDocuments = [
  {
    title: 'Politica de Privacidade',
    href: '/privacidade',
    description: 'Versao publica com informacoes gerais sobre coleta, uso e exercicio de direitos.',
  },
  {
    title: 'Canal de atendimento ao titular',
    href: `mailto:${companyContacts.support}`,
    description: 'Solicitacoes de acesso, correcao, exportacao e eliminacao devem ser iniciadas por esse canal operacional.',
  },
  {
    title: 'Central de suporte',
    href: '/suporte',
    description: 'Pagina publica com manual, FAQ e canais operacionais de contato.',
  },
];

const nextSteps = [
  'Revisao juridica dos textos antes de consolidacao definitiva no site institucional.',
  'Formalizacao nominal do encarregado/DPO e da matriz de responsabilidades.',
  'Automacao de retencao e descarte por categoria de dado com cronograma operacional.',
  'Expansao continua da trilha de auditoria para dominios administrativos criticos.',
];

export function CompliancePage() {
  return (
    <MarketingShell>
      <section className="relative max-w-6xl mx-auto px-6 pt-8 pb-16">
        <div className="absolute inset-0 pointer-events-none flex justify-center">
          <div className="mt-12 h-64 w-[42rem] rounded-full bg-[#2855d6]/10 blur-[110px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative rounded-xl border border-[#ff7b2f]/20 bg-[linear-gradient(135deg,rgba(255,123,47,0.12),rgba(40,85,214,0.08))] p-8 md:p-10 overflow-hidden"
        >
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#ff7b2f]/15 blur-3xl" />
          <div className="max-w-4xl relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff7b2f]/30 bg-[#ff7b2f]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#ffb182]">
              <ShieldCheck size={14} />
              Publicacao provisoria de compliance
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-black leading-none text-white">
              Central de Privacidade,
              <span className="block text-[#ffb182]">LGPD e Compliance</span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm md:text-base leading-relaxed text-white/68">
              Esta pagina consolida, de forma publica e provisoria, o status real dos controles de privacidade e seguranca do SigmaAuto.
              O objetivo aqui e transparencia operacional: mostrar o que ja existe, o que esta em amadurecimento e o que ainda depende de revisao juridica e formalizacao adicional.
            </p>

            <div className="mt-6 rounded-lg border border-line bg-[#090e17]/55 p-5 text-sm text-white/70 leading-relaxed">
              <p className="font-bold text-white">Importante</p>
              <p className="mt-2">
                Este conteudo nao representa certificacao, parecer juridico ou declaracao de conformidade plena. Trata-se de uma central de governanca e transparencia em revisao continua.
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
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/35 font-bold">{item.title}</p>
              <p className="mt-3 text-3xl font-black text-white">{item.value}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{item.detail}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#ff7b2f]/70 font-bold">Pilares ativos</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-black text-white">O que ja esta operacionalizado</h2>
          </div>
          <p className="max-w-2xl text-sm text-white/45 leading-relaxed">
            A pagina foi desenhada para publicar somente informacoes verificaveis no produto, na infraestrutura e na governanca documental ja existente.
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
              className="rounded-xl border border-line bg-[#0c1220]/70 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#ff7b2f]/14 text-[#ff7b2f] border border-[#ff7b2f]/20">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/58">{description}</p>
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
              <BadgeCheck className="text-[#ff7b2f]" size={20} />
              <h2 className="text-2xl font-black text-white">Canais e documentos publicos</h2>
            </div>
            <div className="mt-6 space-y-4">
              {publicDocuments.map((item) => {
                const isInternal = item.href.startsWith('/');
                const content = (
                  <div className="rounded-lg border border-line bg-[#090e17]/55 p-5 transition-colors hover:border-[#ff7b2f]/30">
                    <p className="text-base font-black text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">{item.description}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ffb182]">
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
            className="rounded-xl border border-[#2855d6]/20 bg-[#2855d6]/8 p-7"
          >
            <div className="flex items-center gap-3">
              <Mail className="text-[#8ca8ff]" size={20} />
              <h2 className="text-2xl font-black text-white">Contato de privacidade</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/62">
              Ate a nomeacao formal de encarregado, o canal operacional provisório para temas de privacidade, governanca documental e solicitacoes iniciais do titular e o e-mail abaixo.
            </p>
            <a
              href={`mailto:${companyContacts.support}`}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-line bg-ink/5 px-4 py-3 text-sm font-bold text-white hover:border-[#ff7b2f]/35 hover:bg-[#ff7b2f]/10 transition-all"
            >
              <LifeBuoy size={16} />
              {companyContacts.support}
            </a>
            <div className="mt-6 rounded-lg border border-line bg-[#090e17]/55 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35 font-bold">Escopo atual</p>
              <p className="mt-3 text-sm text-white/58 leading-relaxed">
                Recebimento inicial de pedidos de acesso, correcao, exportacao, eliminacao e duvidas sobre tratamento de dados no contexto da plataforma.
              </p>
            </div>
          </motion.aside>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-xl border border-line bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8 md:p-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#ff7b2f]/70 font-bold">Proximas consolidacoes</p>
              <h2 className="mt-2 text-3xl md:text-4xl font-black text-white">O que ainda esta em amadurecimento</h2>
            </div>
            <p className="max-w-2xl text-sm text-white/45 leading-relaxed">
              Transparencia tambem exige expor o que ainda nao esta concluido. Esses itens seguem no trilho de maturacao da governanca e da conformidade documental.
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
                className="rounded-lg border border-line bg-[#090e17]/55 p-5 text-sm text-white/62 leading-relaxed"
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