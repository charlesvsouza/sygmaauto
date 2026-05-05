import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Facebook, Instagram, Linkedin, Menu, Twitter, X, Youtube } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SigmaAutoLogo } from '../SigmaAutoLogo';
import { navLinks } from '../../data/marketingContent';
import { useAuthStore } from '../../store/authStore';

type MarketingShellProps = {
  children: ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  const handleAccess = () => {
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    navigate('/splash');
  };

  const navItemClass = (to: string) => {
    const isActive = location.pathname === to;
    return [
      'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all',
      isActive
        ? 'text-white bg-white/8'
        : 'text-white/55 hover:text-white hover:bg-white/6',
    ].join(' ');
  };

  return (
    <div
      className="min-h-screen bg-[#090e17] text-white overflow-x-hidden"
      style={{ fontFamily: '"Space Grotesk", "Manrope", sans-serif' }}
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10rem] left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full bg-[#ff7b2f]/10 blur-[120px]" />
        <div className="absolute top-[30%] left-[-8rem] w-[30rem] h-[30rem] rounded-full bg-[#ff7b2f]/6 blur-[100px]" />
        <div className="absolute top-[60%] right-[-6rem] w-[26rem] h-[26rem] rounded-full bg-[#2855d6]/8 blur-[100px]" />
      </div>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#090e17]/90 backdrop-blur-md border-b border-white/8 shadow-[0_4px_40px_rgba(0,0,0,0.4)]' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex-shrink-0">
            <SigmaAutoLogo variant="full" size={32} />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={navItemClass(link.to)}>
                {link.label}
              </Link>
            ))}
            <Link to="/privacidade" className={navItemClass('/privacidade')}>
              Privacidade
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAccess}
              className="h-8 px-4 rounded-xl border border-white/15 text-xs font-bold text-white/80 hover:border-[#ff7b2f]/60 hover:text-white hover:bg-[#ff7b2f]/8 transition-all hidden sm:flex items-center"
            >
              Acessar sistema
            </button>
            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="md:hidden w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/8 bg-[#090e17]/95 backdrop-blur-md overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to} className={navItemClass(link.to)}>
                    {link.label}
                  </Link>
                ))}
                <Link to="/privacidade" className={navItemClass('/privacidade')}>
                  Privacidade
                </Link>
                <button
                  onClick={handleAccess}
                  className="mt-2 h-10 rounded-xl bg-[#ff7b2f] text-white font-bold text-sm"
                >
                  Acessar sistema
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10 pt-24">{children}</main>

      <footer className="relative z-10 border-t border-white/8 py-10 mt-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center lg:items-start gap-1">
            <SigmaAutoLogo variant="compact" size={28} />
            <span className="text-[11px] text-white/30 mt-1">Sistema para Oficina Mecânica · ERP Automotivo</span>
          </div>

          <div className="flex items-center gap-3">
            {[
              { icon: Instagram, href: 'https://instagram.com/sigmaauto', label: 'Instagram' },
              { icon: Facebook, href: 'https://facebook.com/sigmaauto', label: 'Facebook' },
              { icon: Youtube, href: 'https://youtube.com/@sigmaauto', label: 'YouTube' },
              { icon: Linkedin, href: 'https://linkedin.com/company/sigmaauto', label: 'LinkedIn' },
              { icon: Twitter, href: 'https://x.com/sigmaauto', label: 'X / Twitter' },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-[#ff7b2f] hover:border-[#ff7b2f]/40 hover:bg-[#ff7b2f]/10 transition-all"
              >
                <Icon size={16} />
              </a>
            ))}
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-[#ff7b2f] hover:border-[#ff7b2f]/40 hover:bg-[#ff7b2f]/10 transition-all"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>

          <div className="text-[11px] text-white/25 text-center lg:text-right">
            <p>© {new Date().getFullYear()} SigmaAuto · sigmaauto.com.br</p>
            <div className="mt-1 flex items-center justify-center lg:justify-end gap-2">
              <Link to="/privacidade" className="hover:text-[#ff7b2f] transition-colors">
                Política de Privacidade
              </Link>
              <span>·</span>
              <Link to="/suporte" className="hover:text-[#ff7b2f] transition-colors">
                Suporte
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
