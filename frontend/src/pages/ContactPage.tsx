import { useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { MarketingPageHero } from '../components/marketing/MarketingPageHero';
import { MarketingShell } from '../components/marketing/MarketingShell';

export function ContactPage() {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSent, setContactSent] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactSent(true);
  };

  return (
    <MarketingShell>
      <MarketingPageHero
        icon={Mail}
        eyebrow="Contato"
        title="Comercial, demonstração e atendimento em um só lugar"
        description="Se você quer conhecer a plataforma, tirar dúvidas ou falar com o time, este é o canal direto."
        aside={
          <div className="space-y-3 text-sm text-white/55">
            <p className="font-bold text-white">Prazo de retorno</p>
            <p>Até 24 horas úteis por e-mail e atendimento em horário comercial via WhatsApp.</p>
          </div>
        }
      />

      <section className="max-w-6xl mx-auto px-6 pb-16 grid lg:grid-cols-[360px_minmax(0,1fr)] gap-8">
        <div className="space-y-4">
          <a href="mailto:contato@sigmaauto.com.br" className="flex items-center gap-3 rounded-3xl border border-white/8 bg-white/4 p-5 text-white/70 hover:text-white transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center">
              <Mail size={18} className="text-[#ff7b2f]" />
            </div>
            <div>
              <p className="font-bold text-white">Comercial</p>
              <p className="text-sm">contato@sigmaauto.com.br</p>
            </div>
          </a>
          <a href="mailto:suporte@sigmaauto.com.br" className="flex items-center gap-3 rounded-3xl border border-white/8 bg-white/4 p-5 text-white/70 hover:text-white transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center">
              <MessageCircle size={18} className="text-[#ff7b2f]" />
            </div>
            <div>
              <p className="font-bold text-white">Suporte</p>
              <p className="text-sm">suporte@sigmaauto.com.br</p>
            </div>
          </a>
          <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-3xl border border-white/8 bg-white/4 p-5 text-white/70 hover:text-white transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white/6 flex items-center justify-center">
              <Phone size={18} className="text-[#ff7b2f]" />
            </div>
            <div>
              <p className="font-bold text-white">WhatsApp</p>
              <p className="text-sm">(11) 99999-9999</p>
            </div>
          </a>
        </div>

        {contactSent ? (
          <div className="rounded-3xl border border-[#ff7b2f]/30 bg-[#ff7b2f]/8 p-8 text-center">
            <CheckCircle2 size={44} className="text-[#ff7b2f] mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white">Mensagem registrada</h2>
            <p className="mt-3 text-sm text-white/55">Nossa equipe responderá em breve no e-mail informado.</p>
            <button
              onClick={() => {
                setContactSent(false);
                setContactForm({ name: '', email: '', message: '' });
              }}
              className="mt-6 text-sm text-[#ff7b2f] hover:underline"
            >
              Enviar outra mensagem
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-3xl border border-white/8 bg-white/4 backdrop-blur-sm p-6 space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-2 font-medium">Seu nome</label>
              <input
                type="text"
                required
                value={contactForm.name}
                onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full h-11 rounded-2xl bg-white/6 border border-white/10 px-4 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#ff7b2f]/50"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2 font-medium">E-mail</label>
              <input
                type="email"
                required
                value={contactForm.email}
                onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full h-11 rounded-2xl bg-white/6 border border-white/10 px-4 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#ff7b2f]/50"
                placeholder="voce@empresa.com.br"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2 font-medium">Mensagem</label>
              <textarea
                required
                rows={6}
                value={contactForm.message}
                onChange={(event) => setContactForm((current) => ({ ...current, message: event.target.value }))}
                className="w-full rounded-2xl bg-white/6 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#ff7b2f]/50 resize-none"
                placeholder="Conte um pouco sobre sua necessidade"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl bg-[#ff7b2f] text-white font-black text-sm hover:bg-[#f06820] transition-colors"
            >
              Enviar mensagem <Send size={16} />
            </button>
          </form>
        )}
      </section>
    </MarketingShell>
  );
}
