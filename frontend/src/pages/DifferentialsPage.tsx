import { motion } from 'framer-motion';
import { Gauge, Trophy } from 'lucide-react';
import { MarketingPageHero } from '../components/marketing/MarketingPageHero';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { diferenciais } from '../data/marketingContent';

export function DifferentialsPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        icon={Trophy}
        eyebrow="Diferenciais"
        title="O que torna o SigmaAuto uma escolha mais segura"
        description="A proposta não é só entregar funcionalidades. É entregar previsibilidade operacional, curva curta de adoção e evolução contínua."
        aside={
          <div>
            <p className="text-xs uppercase tracking-wide text-surface-500">Disponibilidade</p>
            <p className="mt-3 text-3xl font-bold text-surface-50">99,95%</p>
            <p className="text-sm text-surface-500">meta de uptime e operação em nuvem</p>
          </div>
        }
      />

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {diferenciais.map(({ icon: Icon, title, desc }, index) => (
          <motion.article
            key={title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className="rounded-xl border border-line bg-ink/5 p-6"
          >
            <div className="w-11 h-11 rounded-xl bg-accent-soft flex items-center justify-center mb-4">
              <Icon size={22} className="text-accent-ink" />
            </div>
            <h2 className="text-lg font-bold text-surface-50">{title}</h2>
            <p className="mt-3 text-sm text-surface-500 leading-relaxed">{desc}</p>
          </motion.article>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-xl border border-line bg-ink/5 p-8 grid md:grid-cols-3 gap-5">
          {[
            ['Implantação curta', 'A oficina consegue iniciar rápido sem projeto pesado de onboarding.'],
            ['Baixa fricção', 'Interface focada em uso real, com menos cliques e menos dependência de treinamento.'],
            ['Escala com controle', 'O produto atende desde operação única até rede com necessidade de padronização.'],
          ].map(([title, text]) => (
            <div key={title}>
              <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center mb-4">
                <Gauge size={18} className="text-accent-ink" />
              </div>
              <p className="font-bold text-surface-50">{title}</p>
              <p className="mt-2 text-sm text-surface-500 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
