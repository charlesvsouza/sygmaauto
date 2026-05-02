import { ChevronRight, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingPageHero } from '../components/marketing/MarketingPageHero';
import { MarketingShell } from '../components/marketing/MarketingShell';
import { supportChannels, supportFaq } from '../data/marketingContent';

export function SupportPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        icon={LifeBuoy}
        eyebrow="Suporte"
        title="Central pública de ajuda e documentação"
        description="Acesse o manual, encontre respostas rápidas e fale com o time quando precisar de apoio operacional."
        aside={
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Cobertura</p>
            <p className="mt-3 text-3xl font-black text-white">3 canais</p>
            <p className="text-sm text-white/45">manual, e-mail e WhatsApp</p>
          </div>
        }
      />

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-5">
        {supportChannels.map(({ title, description, href, external, icon: Icon, accent }) => {
          const accentClass = accent === 'orange'
            ? 'border-[#ff7b2f]/25 bg-[#ff7b2f]/6 hover:border-[#ff7b2f]/50'
            : 'border-white/8 bg-white/4 hover:border-white/20';

          const cardClassName = `rounded-3xl border p-6 flex flex-col transition-all ${accentClass}`;

          if (!external) {
            return (
              <Link
                key={title}
                to={href}
                className={cardClassName}
              >
                <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center mb-4">
                  <Icon size={22} className={accent === 'orange' ? 'text-[#ff7b2f]' : 'text-white/70'} />
                </div>
                <h2 className="text-lg font-black text-white">{title}</h2>
                <p className="mt-3 text-sm text-white/55 leading-relaxed flex-1">{description}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#ff7b2f]">
                  Acessar <ChevronRight size={13} />
                </div>
              </Link>
            );
          }

          return (
            <a
              key={title}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className={cardClassName}
            >
              <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center mb-4">
                <Icon size={22} className={accent === 'orange' ? 'text-[#ff7b2f]' : 'text-white/70'} />
              </div>
              <h2 className="text-lg font-black text-white">{title}</h2>
              <p className="mt-3 text-sm text-white/55 leading-relaxed flex-1">{description}</p>
              <div className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#ff7b2f]">
                Acessar <ChevronRight size={13} />
              </div>
            </a>
          );
        })}
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-sm p-8">
          <h2 className="text-2xl font-black text-white">Perguntas frequentes</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-5">
            {supportFaq.map((item) => (
              <div key={item.question} className="rounded-2xl border border-white/8 bg-[#090e17]/35 p-5">
                <p className="font-bold text-white">{item.question}</p>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
