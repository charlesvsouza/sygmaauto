import { HeartHandshake } from 'lucide-react';
import { MarketingPageHero } from '../components/marketing/MarketingPageHero';
import { MarketingShell } from '../components/marketing/MarketingShell';

export function AboutPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        icon={HeartHandshake}
        eyebrow="Quem Somos"
        title="Tecnologia criada para a oficina brasileira"
        description="O SigmaAuto nasceu para substituir improviso por processo, papel por rastreabilidade e achismo por indicadores."
        aside={
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Posicionamento</p>
            <p className="text-sm text-white/60">ERP automotivo SaaS com foco em simplicidade operacional, implantação rápida e crescimento sustentável.</p>
          </div>
        }
      />

      <section className="max-w-6xl mx-auto px-6 pb-16 grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8">
        <div className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-sm p-8 space-y-5 text-white/60 leading-relaxed">
          <p>
            A maior parte das oficinas ainda opera com ferramentas genéricas, planilhas soltas e processos que dependem demais de memória e experiência individual. Isso reduz previsibilidade, dificulta crescimento e afeta margem.
          </p>
          <p>
            O SigmaAuto foi desenhado para ser direto: quem atende entende, quem executa atualiza e quem gere enxerga. Sem camadas desnecessárias, sem implantação longa e sem depender de um consultor para usar o básico.
          </p>
          <p>
            Nosso foco é profissionalizar a rotina da oficina com um produto acessível, claro e funcional para equipes pequenas, médias e operações em expansão.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['100%', 'foco no setor automotivo'],
            ['SaaS', 'opera na nuvem, sem instalação local'],
            ['< 5 min', 'para começar a operar'],
            ['24/7', 'infraestrutura online e monitorada'],
          ].map(([value, text]) => (
            <div key={value} className="rounded-3xl border border-white/8 bg-white/4 p-6 text-center">
              <p className="text-3xl font-black text-[#ff7b2f]">{value}</p>
              <p className="mt-2 text-sm text-white/55">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-5">
        {[
          ['Missão', 'Digitalizar e profissionalizar oficinas com uma plataforma simples, confiável e orientada a resultado.'],
          ['Visão', 'Ser a principal referência brasileira em gestão automotiva para oficinas independentes e redes.'],
          ['Valores', 'Clareza operacional, segurança, proximidade com o cliente e evolução constante do produto.'],
        ].map(([title, text]) => (
          <div key={title} className="rounded-3xl border border-white/8 bg-white/4 p-6">
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="mt-3 text-sm text-white/55 leading-relaxed">{text}</p>
          </div>
        ))}
      </section>
    </MarketingShell>
  );
}
