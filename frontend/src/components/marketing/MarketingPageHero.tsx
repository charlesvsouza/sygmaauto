import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type MarketingPageHeroProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
};

export function MarketingPageHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  aside,
}: MarketingPageHeroProps) {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-6 pb-12">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-10 items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#ff7b2f]/70 font-bold mb-4 flex items-center gap-2">
            <Icon size={13} /> {eyebrow}
          </p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight max-w-3xl">{title}</h1>
          <p className="mt-4 text-white/55 text-base max-w-2xl leading-relaxed">{description}</p>
        </div>
        {aside ? (
          <div className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-sm p-6">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}
