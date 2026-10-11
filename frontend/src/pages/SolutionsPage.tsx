import { motion } from 'framer-motion';
import { ArrowRight, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingPageHero } from '../components/marketing/MarketingPageHero';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { solutions } from '../data/marketingContent';

export function SolutionsPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        icon={Wrench}
        eyebrow="Soluções"
        title="Uma suíte completa para a rotina da oficina"
        description="Cada módulo foi pensado para resolver uma etapa real da operação: atendimento, execução, venda, controle e gestão."
        aside={
          <div>
            <p className="text-xs uppercase tracking-wide text-surface-500">Cobertura</p>
            <p className="mt-3 text-3xl font-bold text-surface-50">360°</p>
            <p className="text-sm text-surface-500">da entrada do veículo ao fechamento financeiro</p>
          </div>
        }
      />

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {solutions.map(({ icon: Icon, title, desc }, index) => (
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
        <div className="grid lg:grid-cols-3 gap-5">
          {[
            ['1. Recepção', 'Cadastre cliente e veículo, abra a OS e registre a entrada sem retrabalho.'],
            ['2. Execução', 'Diagnóstico, peças, mão de obra e atualização de status com visão da equipe.'],
            ['3. Gestão', 'Receba, análise indicadores e acompanhe resultados do negócio em tempo real.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-line bg-ink/5 p-6">
              <p className="text-sm font-bold text-surface-50">{title}</p>
              <p className="mt-3 text-sm text-surface-500 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link
            to="/planos"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors"
          >
            Ver planos e modalidades <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
