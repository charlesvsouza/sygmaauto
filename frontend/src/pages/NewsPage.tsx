import { motion } from 'framer-motion';
import { ChevronRight, Newspaper } from 'lucide-react';
import { MarketingPageHero } from '../components/marketing/MarketingPageHero';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { news } from '../data/marketingContent';

export function NewsPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        icon={Newspaper}
        eyebrow="Notícias"
        title="Acompanhe a evolução do SigmaAuto"
        description="Central pública de novidades da plataforma, melhorias recentes e marcos do produto para oficinas mecânicas."
        aside={
          <div>
            <p className="text-xs uppercase tracking-wide text-surface-500">Resumo</p>
            <p className="mt-3 text-3xl font-bold text-surface-50">{news.length}</p>
            <p className="text-sm text-surface-500">públicações em destaque</p>
          </div>
        }
      />

      <section className="max-w-6xl mx-auto px-6 pb-16 grid lg:grid-cols-3 gap-5">
        {news.map((item, index) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className="rounded-xl border border-line bg-ink/5 p-6 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide bg-accent-soft text-accent-ink px-2 py-0.5 rounded-full">
                {item.tag}
              </span>
              <span className="text-[12px] text-surface-500">{item.date}</span>
            </div>
            <h2 className="font-bold text-lg text-surface-50 leading-snug">{item.title}</h2>
            <p className="mt-3 text-sm text-surface-500 leading-relaxed flex-1">{item.excerpt}</p>
            <div className="mt-5 inline-flex items-center gap-1 text-accent-ink text-xs font-bold">
              Atualização publicada <ChevronRight size={13} />
            </div>
          </motion.article>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-xl border border-line bg-ink/5 p-8 md:p-10">
          <h3 className="text-2xl font-bold text-surface-50">Como usamos essas atualizações</h3>
          <div className="mt-6 grid md:grid-cols-3 gap-5 text-sm text-surface-500">
            <div>
              <p className="font-bold text-surface-50 mb-2">Transparência</p>
              <p>Mostramos o que entrou no produto para que a oficina saiba exatamente onde a plataforma está evoluindo.</p>
            </div>
            <div>
              <p className="font-bold text-surface-50 mb-2">Prioridade real</p>
              <p>As mudanças seguem dores do dia a dia operacional: OS, financeiro, estoque, atendimento e governança.</p>
            </div>
            <div>
              <p className="font-bold text-surface-50 mb-2">Evolução contínua</p>
              <p>O objetivo é transformar o SigmaAuto em uma base sólida para crescimento de oficinas independentes e redes.</p>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
