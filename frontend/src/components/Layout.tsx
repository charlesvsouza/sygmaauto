import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardList,
  Package,
  DollarSign,
  Settings,
  LogOut,
  Wrench,
  Menu,
  X,
  UserCheck,
  Search,
  Bell,
  Tv2,
  Monitor,
  MessageCircle,
  BarChart3,
  Gauge,
  FileText,
  Award,
  Cog,
  Star,
  CalendarDays,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { canAccessFeature, canAccessRetificaMode, featureLabel, getFeatureMinPlan, getFeatureUpgradeMessage, getPlanLabel, type PlanFeatureKey } from '../lib/planAccess';
import { SigmaAutoLogo } from './SigmaAutoLogo';
import { CommandPalette, type CommandItem } from './CommandPalette';
import { Button } from './ui';
import { cn } from '../lib/utils';

const RAIL_STORAGE_KEY = 'sygmaauto.sidebar.rail';

type NavItem = {
  to: string;
  icon: any;
  label: string;
  premium: boolean;
  feature?: PlanFeatureKey;
  retificaMode?: boolean;
};

type NavGroup = { label: string | null; items: NavItem[] };

export function Layout() {
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rail, setRail] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<
    | { kind: 'feature'; feature: PlanFeatureKey }
    | { kind: 'retifica' }
    | null
  >(null);
  const canViewUsers = ['MASTER', 'ADMIN'].includes(user?.role ?? '');

  useEffect(() => {
    try {
      if (localStorage.getItem(RAIL_STORAGE_KEY) === '1') setRail(true);
    } catch { /* localStorage indisponível */ }
  }, []);

  const toggleRail = () => {
    setRail((r) => {
      const next = !r;
      try { localStorage.setItem(RAIL_STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const planName = tenant?.subscription?.plan?.name || 'START';

  const adminItems: NavItem[] = [
    ...(canViewUsers ? [{ to: '/users', icon: UserCheck, label: 'Usuários', premium: false }] : []),
    ...(canViewUsers ? [{ to: '/lgpd', icon: ShieldCheck, label: 'LGPD', premium: false }] : []),
    { to: '/settings', icon: Settings, label: 'Configurações', premium: false },
  ];

  const navGroups: NavGroup[] = [
    {
      label: null,
      items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Painel', premium: false }],
    },
    {
      label: 'Atendimento',
      items: [
        { to: '/service-orders', icon: ClipboardList, label: 'Ordens de Serviço', premium: false },
        { to: '/agenda', icon: CalendarDays, label: 'Agenda', premium: false },
        { to: '/customers', icon: Users, label: 'Clientes', premium: false },
        { to: '/vehicles', icon: Car, label: 'Veículos', premium: false },
      ],
    },
    {
      label: 'Oficina',
      items: [
        { to: '/services', icon: Wrench, label: 'Serviços', premium: false },
        { to: '/inventory', icon: Package, label: 'Estoque', premium: false },
        { to: '/retifica', icon: Cog, label: 'Modo Retífica', premium: true, retificaMode: true },
        { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', premium: true, feature: 'WHATSAPP' },
        { to: '/maintenance', icon: Bell, label: 'Manutenção Prev.', premium: true, feature: 'WHATSAPP' },
      ],
    },
    {
      label: 'Painéis',
      items: [
        { to: '/kanban', icon: Tv2, label: 'Kanban de Pátio', premium: true, feature: 'KANBAN_PATIO' },
        { to: '/kanban-recepcao', icon: Monitor, label: 'Recepção / TV', premium: true, feature: 'KANBAN_RECEPCAO' },
        { to: '/kanban-retifica', icon: Cog, label: 'Kanban Retífica', premium: true, retificaMode: true },
        { to: '/dashboard-retifica', icon: Gauge, label: 'Dashboard Retífica', premium: true, retificaMode: true },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { to: '/financial', icon: DollarSign, label: 'Fluxo de Caixa', premium: false },
        { to: '/commissions', icon: Award, label: 'Comissões', premium: true, feature: 'COMISSOES' },
        { to: '/dre', icon: BarChart3, label: 'DRE', premium: true, feature: 'DRE_KPI_RELATORIOS' },
      ],
    },
    {
      label: 'Análise',
      items: [
        { to: '/kpis', icon: Gauge, label: 'Indicadores', premium: true, feature: 'DRE_KPI_RELATORIOS' },
        { to: '/reports', icon: FileText, label: 'Relatórios', premium: true, feature: 'DRE_KPI_RELATORIOS' },
        { to: '/nps', icon: Star, label: 'NPS — Satisfação', premium: true, feature: 'DRE_KPI_RELATORIOS' },
      ],
    },
    {
      label: null,
      items: adminItems,
    },
  ];

  // Grupos em acordeão: só os que têm rótulo (os sem rótulo — Painel e Admin — ficam sempre visíveis).
  const accordionGroups = navGroups.filter((g) => g.label);

  const activeGroupLabel = useMemo(() => {
    for (const g of accordionGroups) {
      if (g.items.some((it) => it.to === location.pathname)) return g.label;
    }
    return accordionGroups[0]?.label ?? null;
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const [openCategory, setOpenCategory] = useState<string | null>(activeGroupLabel);

  // Ao navegar para uma página de outro grupo (ex.: via command palette), abre o grupo correspondente.
  useEffect(() => {
    setOpenCategory(activeGroupLabel);
  }, [activeGroupLabel]);

  const toggleCategory = (label: string) => {
    setOpenCategory((cur) => (cur === label ? null : label));
  };

  // Rótulo da página atual, para o header mobile e o breadcrumb.
  const hrefLabel = useMemo(() => {
    const map: Record<string, string> = { '/dashboard': 'Painel' };
    for (const g of navGroups) for (const it of g.items) map[it.to] = it.label;
    return map;
  }, [navGroups]);

  const currentPageLabel = hrefLabel[location.pathname];
  const showBreadcrumb = location.pathname !== '/dashboard';

  // Lista achatada para o command palette (Ctrl/Cmd+K).
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];
    for (const g of navGroups) {
      for (const it of g.items) list.push({ to: it.to, label: it.label, group: g.label ?? 'Geral' });
    }
    return list;
  }, [navGroups]);

  function renderNavItem(item: NavItem, onNavigate?: () => void) {
    const blockedByPlan = item.feature ? !canAccessFeature(planName, item.feature) : false;
    const blockedByRetificaMode = item.retificaMode ? !canAccessRetificaMode(planName) : false;

    if (blockedByRetificaMode || blockedByPlan) {
      const badge = blockedByRetificaMode ? 'RET' : getFeatureMinPlan(item.feature!);
      return (
        <button
          type="button"
          key={item.to}
          onClick={() => {
            onNavigate?.();
            setUpgradeModal(blockedByRetificaMode ? { kind: 'retifica' } : { kind: 'feature', feature: item.feature! });
          }}
          title={rail ? item.label : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-lg transition-all opacity-60 text-sidebar-ink hover:text-white hover:opacity-80 w-full text-left px-2.5 py-2',
            rail && 'lg:justify-center lg:px-0',
          )}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          <span className={cn('leading-tight', rail && 'lg:hidden')}>{item.label}</span>
          <span className={cn('ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80', rail && 'lg:hidden')}>{badge}</span>
        </button>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        title={rail ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2.5 rounded-lg transition-all px-2.5 py-2',
            rail && 'lg:justify-center lg:px-0',
            isActive ? 'sidebar-nav-link-active font-medium' : 'text-sidebar-ink hover:text-white',
          )
        }
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <span className={cn('leading-tight', rail && 'lg:hidden')}>{item.label}</span>
      </NavLink>
    );
  }

  function renderNavGroups(opts: { rail: boolean; onNavigate?: () => void }) {
    return navGroups.map((group, gi) => {
      const isAccordion = !!group.label;
      const isOpen = !isAccordion || openCategory === group.label;
      return (
        <div key={gi} className={gi > 0 ? 'mt-1.5 pt-1.5 border-t border-line' : ''}>
          {group.label && (
            <button
              type="button"
              onClick={() => toggleCategory(group.label!)}
              className={cn(
                'flex w-full items-center justify-between px-2.5 mb-1 text-[8px] font-bold uppercase tracking-wide text-white/45 hover:text-white/70 transition-colors',
                opts.rail && 'lg:hidden',
              )}
            >
              {group.label}
              {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
          )}
          <div className={cn('space-y-px', !isOpen && 'hidden', opts.rail && 'lg:block')}>
            {group.items.map((item) => renderNavItem(item, opts.onNavigate))}
          </div>
        </div>
      );
    });
  }

  return (
    <div className="h-screen overflow-hidden flex bg-app text-surface-100">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        'app-sidebar hidden lg:flex flex-col h-screen fixed left-0 top-0 z-30 overflow-hidden transition-[width] duration-200',
        rail ? 'lg:w-16' : 'w-64',
      )}>
        {/* Logo */}
        <div className={cn('px-4 py-2.5 border-b border-line', rail && 'lg:px-2 lg:flex lg:justify-center')}>
          <SigmaAutoLogo variant={rail ? 'icon' : 'full'} size={rail ? 28 : 34} accent="teal" />
          {!rail && (
            <div className="mt-1.5 pl-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                planName === 'START'
                  ? 'bg-white/10 text-white/80'
                  : 'bg-white/15 text-white'
              }`}>
                {getPlanLabel(planName)}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 min-h-0 px-3 py-2 overflow-y-auto', rail && 'lg:px-2')}>
          {renderNavGroups({ rail })}
        </nav>

        {/* Recolher/expandir menu */}
        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={toggleRail}
            title={rail ? 'Expandir menu' : 'Recolher menu'}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sidebar-ink hover:text-white hover:bg-white/5 transition-colors',
              rail && 'lg:justify-center lg:px-0',
            )}
          >
            {rail ? <PanelLeft size={16} className="shrink-0" /> : <PanelLeftClose size={16} className="shrink-0" />}
            <span className={cn('text-xs', rail && 'lg:hidden')}>Recolher menu</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`app-sidebar fixed inset-y-0 left-0 w-64 z-50 transform transition-transform lg:hidden flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 border-b border-line flex items-center justify-between">
          <SigmaAutoLogo variant="full" size={36} accent="teal" />
          <button type="button" onClick={() => setSidebarOpen(false)} className="text-sidebar-ink hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {renderNavGroups({ rail: false, onNavigate: () => setSidebarOpen(false) })}
        </nav>

        <div className="p-4 border-t border-line">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sidebar-ink hover:text-red-300 hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className={cn('app-main-frame flex-1 min-w-0 flex flex-col min-h-0 transition-[margin] duration-200', rail ? 'lg:ml-16' : 'lg:ml-64')}>
        {/* Header mobile */}
        <header className="lg:hidden bg-surface-900 border-b border-line px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button type="button" onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-surface-300 hover:text-surface-100">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <SigmaAutoLogo variant="compact" size={28} tone="dark" accent="teal" />
          </div>
          <div className="w-8" /> {/* Spacer */}
        </header>

        {/* Header desktop */}
        <header className="app-shell-header hidden lg:flex items-center justify-between px-4 xl:px-8 py-4 border-b border-line sticky top-0 z-10 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-surface-50">
              {tenant?.name || 'Minha Oficina'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Search / command palette trigger */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="relative flex items-center gap-2 w-44 xl:w-64 pl-9 pr-3 py-2 bg-surface-950/40 border border-line rounded-lg text-sm text-surface-500 hover:border-accent/40 transition-colors text-left"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <span className="flex-1">Buscar...</span>
              <kbd className="hidden xl:inline rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-surface-500">Ctrl K</kbd>
            </button>

            {/* Notifications */}
            <button type="button" className="relative p-2 text-surface-400 hover:text-surface-100 hover:bg-ink/5 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
            </button>

            {/* Plan upgrade CTA */}
            {planName === 'START' && (
              <Button size="sm">
                Migrar para o Premium
              </Button>
            )}

            {/* Divider */}
            <div className="w-px h-6 bg-ink/5" />

            {/* User avatar + name + logout */}
            <div className="relative group">
              <button type="button" className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-ink/5 transition-all">
                <div className="w-8 h-8 bg-surface-800 border border-line rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-accent-ink">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-left hidden xl:block">
                  <p className="text-xs font-semibold text-surface-100 leading-tight truncate max-w-[140px]">{user?.name}</p>
                  <p className="text-[10px] text-surface-500 leading-tight truncate max-w-[140px]">{user?.email}</p>
                </div>
              </button>
              {/* Dropdown on hover */}
              <div className="absolute right-0 top-full mt-1 w-52 bg-surface-900 rounded-xl shadow-card-hover border border-line py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-3 py-2 border-b border-line">
                  <p className="text-xs font-semibold text-surface-100 truncate">{user?.name}</p>
                  <p className="text-[10px] text-surface-500 truncate">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-300 hover:text-danger hover:bg-danger/10 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        {showBreadcrumb && (
          <nav aria-label="Trilha de navegação" className="border-b border-line px-4 xl:px-8 py-2 text-xs">
            <ol className="flex items-center gap-1.5">
              <li>
                <NavLink to="/dashboard" className="text-surface-500 hover:text-accent-ink transition-colors">Painel</NavLink>
              </li>
              <li className="text-surface-700" aria-hidden="true">/</li>
              <li className="font-medium text-surface-100" aria-current="page">{currentPageLabel ?? ''}</li>
            </ol>
          </nav>
        )}

        {/* Page content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Modal de upgrade de plano */}
      {upgradeModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4"
          onClick={() => setUpgradeModal(null)}
        >
          <div
            className="bg-surface-950 border border-line text-surface-100 rounded-lg p-6 max-w-sm w-full shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-accent-ink" />
              </div>
              <div>
                <p className="text-xs font-bold text-surface-500 uppercase tracking-wide">{upgradeModal.kind === 'retifica' ? 'Modo Especializado' : 'Recurso Premium'}</p>
                <h3 className="font-bold text-surface-50">{upgradeModal.kind === 'retifica' ? 'Modo Retífica de Motores' : featureLabel(upgradeModal.feature)}</h3>
              </div>
            </div>
            <p className="text-sm text-surface-300 mb-5">
              {upgradeModal.kind === 'retifica'
                ? 'Disponível somente nos planos Modo Retífica Pro e Modo Retífica Rede. Esse modo libera operação híbrida oficina + retífica, incluindo abertura com motor avulso e fluxo técnico especializado.'
                : getFeatureUpgradeMessage(upgradeModal.feature)}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => { setUpgradeModal(null); navigate('/settings'); }}
                className="flex-1"
              >
                Ver Planos
              </Button>
              <Button
                variant="ghost"
                onClick={() => setUpgradeModal(null)}
                className="flex-1"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette commands={commands} />
    </div>
  );
}
