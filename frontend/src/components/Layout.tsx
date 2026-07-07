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
} from 'lucide-react';
import { useState } from 'react';
import { canAccessFeature, canAccessRetificaMode, featureLabel, getFeatureMinPlan, getFeatureUpgradeMessage, getPlanLabel, type PlanFeatureKey } from '../lib/planAccess';
import { SigmaAutoLogo } from './SigmaAutoLogo';
import { Button } from './ui';

export function Layout() {
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<
    | { kind: 'feature'; feature: PlanFeatureKey }
    | { kind: 'retifica' }
    | null
  >(null);
  const canViewUsers = ['MASTER', 'ADMIN'].includes(user?.role ?? '');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const planName = tenant?.subscription?.plan?.name || 'START';

  type NavItem = {
    to: string;
    icon: any;
    label: string;
    premium: boolean;
    feature?: PlanFeatureKey;
    retificaMode?: boolean;
  };

  const adminItems: NavItem[] = [
    ...(canViewUsers ? [{ to: '/users', icon: UserCheck, label: 'Usuários', premium: false }] : []),
    ...(canViewUsers ? [{ to: '/lgpd', icon: ShieldCheck, label: 'LGPD', premium: false }] : []),
    { to: '/settings', icon: Settings, label: 'Configurações', premium: false },
  ];

  const navGroups: Array<{ label: string | null; items: NavItem[] }> = [
    {
      label: null as string | null,
      items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Painel', premium: false } as NavItem],
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
      label: null as string | null,
      items: adminItems,
    },
  ];

  return (
    <div className="h-screen overflow-hidden flex bg-app text-surface-100">
      {/* Sidebar - Desktop */}
      <aside className="app-sidebar hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 z-30 overflow-hidden">
        {/* Logo */}
        <div className="px-4 py-2.5 border-b border-line">
          <SigmaAutoLogo variant="full" size={34} accent="teal" />
          <div className="mt-1.5 pl-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              planName === 'START'
                ? 'bg-white/10 text-white/80'
                : 'bg-white/15 text-white'
            }`}>
              {getPlanLabel(planName)}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 px-3 py-2 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-1.5 pt-1.5 border-t border-line' : ''}>
              {group.label && (
                <p className="text-[8px] font-bold text-white/45 uppercase tracking-wide px-2.5 mb-1">
                  {group.label}
                </p>
              )}
              <div className="space-y-px">
                {group.items.map((item) => {
                  const blockedByPlan = item.feature ? !canAccessFeature(planName, item.feature) : false;
                  const blockedByRetificaMode = item.retificaMode ? !canAccessRetificaMode(planName) : false;
                  if (blockedByRetificaMode) {
                    return (
                      <button
                        key={item.to}
                        onClick={() => setUpgradeModal({ kind: 'retifica' })}
                        className="sidebar-nav-link flex items-center gap-2.5 rounded-lg transition-all opacity-60 text-sidebar-ink hover:text-white hover:opacity-80 w-full text-left"
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="sidebar-nav-label leading-tight">{item.label}</span>
                        <span className="sidebar-pro-badge ml-auto text-[10px] px-1.5 py-0.5 rounded">RET</span>
                      </button>
                    );
                  }
                  if (blockedByPlan) {
                    return (
                      <button
                        key={item.to}
                        onClick={() => setUpgradeModal({ kind: 'feature', feature: item.feature! })}
                        className="sidebar-nav-link flex items-center gap-2.5 rounded-lg transition-all opacity-60 text-sidebar-ink hover:text-white hover:opacity-80 w-full text-left"
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="sidebar-nav-label leading-tight">{item.label}</span>
                        <span className="sidebar-pro-badge ml-auto text-[10px] px-1.5 py-0.5 rounded">{getFeatureMinPlan(item.feature!)}</span>
                      </button>
                    );
                  }
                  return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `sidebar-nav-link flex items-center gap-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'sidebar-nav-link-active font-medium'
                          : 'text-sidebar-ink hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="sidebar-nav-label leading-tight">{item.label}</span>
                  </NavLink>
                );
              })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`app-sidebar fixed inset-y-0 left-0 w-64 z-50 transform transition-transform lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 border-b border-line flex items-center justify-between">
          <SigmaAutoLogo variant="full" size={36} accent="teal" />
          <button onClick={() => setSidebarOpen(false)} className="text-sidebar-ink hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-3 pt-3 border-t border-line' : ''}>
              {group.label && (
                <p className="text-[9px] font-bold text-white/45 uppercase tracking-wide px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const blockedByPlan = item.feature ? !canAccessFeature(planName, item.feature) : false;
                  const blockedByRetificaMode = item.retificaMode ? !canAccessRetificaMode(planName) : false;
                  if (blockedByRetificaMode) {
                    return (
                      <button
                        key={item.to}
                        onClick={() => { setSidebarOpen(false); setUpgradeModal({ kind: 'retifica' }); }}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all opacity-60 text-sidebar-ink hover:text-white hover:bg-white/10 hover:opacity-80 w-full text-left"
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm">{item.label}</span>
                        <span className="ml-auto text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/80">RET</span>
                      </button>
                    );
                  }
                  if (blockedByPlan) {
                    return (
                      <button
                        key={item.to}
                        onClick={() => { setSidebarOpen(false); setUpgradeModal({ kind: 'feature', feature: item.feature! }); }}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all opacity-60 text-sidebar-ink hover:text-white hover:bg-white/10 hover:opacity-80 w-full text-left"
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm">{item.label}</span>
                        <span className="ml-auto text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/80">{getFeatureMinPlan(item.feature!)}</span>
                      </button>
                    );
                  }
                  return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-white/15 text-white font-medium'
                          : 'text-sidebar-ink hover:text-white hover:bg-white/10'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </NavLink>
                );
              })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-line">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sidebar-ink hover:text-red-300 hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="app-main-frame flex-1 lg:ml-64 min-w-0 flex flex-col min-h-0">
        {/* Header mobile */}
        <header className="lg:hidden bg-surface-900 border-b border-line px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-surface-300 hover:text-surface-100">
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-44 xl:w-64 pl-9 pr-4 py-2 bg-surface-950/40 border border-line rounded-lg text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-surface-400 hover:text-surface-100 hover:bg-ink/5 rounded-lg">
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
              <button className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-ink/5 transition-all">
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
    </div>
  );
}