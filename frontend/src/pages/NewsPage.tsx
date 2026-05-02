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
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Resumo</p>
            <p className="mt-3 text-3xl font-black text-white">{news.length}</p>
            <p className="text-sm text-white/45">publicações em destaque</p>
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
            className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-sm p-6 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest bg-[#ff7b2f]/15 text-[#ff7b2f] px-2 py-0.5 rounded-full">
                {item.tag}
              </span>
              <span className="text-[11px] text-white/30">{item.date}</span>
            </div>
            <h2 className="font-bold text-lg text-white leading-snug">{item.title}</h2>
            <p className="mt-3 text-sm text-white/55 leading-relaxed flex-1">{item.excerpt}</p>
            <div className="mt-5 inline-flex items-center gap-1 text-[#ff7b2f] text-xs font-bold">
              Atualização publicada <ChevronRight size={13} />
            </div>
          </motion.article>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-sm p-8 md:p-10">
          <h3 className="text-2xl font-black text-white">Como usamos essas atualizações</h3>
          <div className="mt-6 grid md:grid-cols-3 gap-5 text-sm text-white/55">
            <div>
              <p className="font-bold text-white mb-2">Transparência</p>
              <p>Mostramos o que entrou no produto para que a oficina saiba exatamente onde a plataforma está evoluindo.</p>
            </div>
            <div>
              <p className="font-bold text-white mb-2">Prioridade real</p>
              <p>As mudanças seguem dores do dia a dia operacional: OS, financeiro, estoque, atendimento e governança.</p>
            </div>
            <div>
              <p className="font-bold text-white mb-2">Evolução contínua</p>
              <p>O objetivo é transformar o SigmaAuto em uma base sólida para crescimento de oficinas independentes e redes.</p>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
