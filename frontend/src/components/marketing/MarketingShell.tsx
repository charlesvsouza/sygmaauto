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
      'px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all',
      isActive
        ? 'text-[#0f1f2b] bg-[#dceef2]'
        : 'text-[#365463] hover:text-[#0f1f2b] hover:bg-[#eaf4f7]',
    ].join(' ');
  };

  return (
    <div
      className="min-h-screen bg-[#f3f9fb] text-[#0f1f2b] overflow-x-hidden"
      style={{ fontFamily: '"Space Grotesk", "Manrope", sans-serif' }}
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-11rem] left-1/2 -translate-x-1/2 w-[64rem] h-[30rem] rounded-full bg-[#0f1f2b]/8 blur-[120px]" />
        <div className="absolute top-[24%] left-[-8rem] w-[30rem] h-[30rem] rounded-full bg-[#0b7f86]/12 blur-[96px]" />
        <div className="absolute top-[65%] right-[-6rem] w-[28rem] h-[28rem] rounded-full bg-[#0f1f2b]/8 blur-[110px]" />
      </div>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#f3f9fb]/90 backdrop-blur-md border-b border-[#d2e2e7] shadow-[0_8px_30px_rgba(15,31,43,0.08)]' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex-shrink-0">
            <SigmaAutoLogo variant="full" size={32} tone="dark" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={navItemClass(link.to)}>
                {link.label}
              </Link>
            ))}
            <Link to="/compliance" className={navItemClass('/compliance')}>
              Compliance
            </Link>
            <Link to="/privacidade" className={navItemClass('/privacidade')}>
              Privacidade
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAccess}
              className="h-9 px-4 rounded-xl border border-[#0b7f86]/25 text-xs font-black text-[#0b7f86] hover:border-[#0b7f86] hover:bg-[#0b7f86] hover:text-white transition-all hidden sm:flex items-center"
            >
              Acessar sistema
            </button>
            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="md:hidden w-9 h-9 rounded-xl border border-[#d2e2e7] flex items-center justify-center text-[#365463] hover:text-[#0f1f2b] transition-colors"
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
              className="md:hidden border-t border-[#d2e2e7] bg-[#f3f9fb]/95 backdrop-blur-md overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to} className={navItemClass(link.to)}>
                    {link.label}
                  </Link>
                ))}
                <Link to="/compliance" className={navItemClass('/compliance')}>
                  Compliance
                </Link>
                <Link to="/privacidade" className={navItemClass('/privacidade')}>
                  Privacidade
                </Link>
                <button
                  onClick={handleAccess}
                  className="mt-2 h-10 rounded-xl bg-[#0b7f86] text-white font-black text-sm"
                >
                  Acessar sistema
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10 pt-24">{children}</main>

      <footer className="relative z-10 border-t border-[#d2e2e7] py-10 mt-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center lg:items-start gap-1">
            <SigmaAutoLogo variant="compact" size={28} tone="dark" />
            <span className="text-[11px] text-[#5c7380] mt-1">Sistema para Oficina Mecânica · ERP Automotivo</span>
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
                className="w-9 h-9 rounded-xl border border-[#d2e2e7] bg-white flex items-center justify-center text-[#5c7380] hover:text-[#0b7f86] hover:border-[#0b7f86]/45 hover:bg-[#0b7f86]/10 transition-all"
              >
                <Icon size={16} />
              </a>
            ))}
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-9 h-9 rounded-xl border border-[#d2e2e7] bg-white flex items-center justify-center text-[#5c7380] hover:text-[#0b7f86] hover:border-[#0b7f86]/45 hover:bg-[#0b7f86]/10 transition-all"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>

          <div className="text-[11px] text-[#5c7380] text-center lg:text-right">
            <p>© {new Date().getFullYear()} SigmaAuto · sigmaauto.com.br</p>
            <div className="mt-1 flex items-center justify-center lg:justify-end gap-2">
              <Link to="/compliance" className="hover:text-[#0b7f86] transition-colors">
                Compliance
              </Link>
              <span>·</span>
              <Link to="/privacidade" className="hover:text-[#0b7f86] transition-colors">
                Política de Privacidade
              </Link>
              <span>·</span>
              <Link to="/suporte" className="hover:text-[#0b7f86] transition-colors">
                Suporte
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
