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
} from 'lucide-react';
import { useState } from 'react';
import { canAccessFeature, type PlanFeatureKey } from '../lib/planAccess';

export function Layout() {
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  };

  const adminItems: NavItem[] = [
    ...(canViewUsers ? [{ to: '/users', icon: UserCheck, label: 'Usuários', premium: false }] : []),
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
        { to: '/customers', icon: Users, label: 'Clientes', premium: false },
        { to: '/vehicles', icon: Car, label: 'Veículos', premium: false },
      ],
    },
    {
      label: 'Oficina',
      items: [
        { to: '/services', icon: Wrench, label: 'Serviços', premium: false },
        { to: '/inventory', icon: Package, label: 'Estoque', premium: false },
        { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', premium: false },
      ],
    },
    {
      label: 'Painéis',
      items: [
        { to: '/kanban', icon: Tv2, label: 'Kanban de Pátio', premium: true, feature: 'KANBAN_PATIO' },
        { to: '/kanban-recepcao', icon: Monitor, label: 'Recepção / TV', premium: true, feature: 'KANBAN_RECEPCAO' },
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
      ],
    },
    {
      label: null as string | null,
      items: adminItems,
    },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar - Desktop */}
      <aside className="app-sidebar hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 z-30 overflow-hidden">
        {/* Logo */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 shrink-0">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
               <h1 className="font-bold text-white text-base leading-tight">Sigma Auto</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                planName === 'START' ? 'bg-slate-700 text-slate-300' :
                planName === 'PRO' ? 'bg-purple-500/20 text-purple-300' :
                'bg-amber-500/20 text-amber-300'
              }`}>
                {planName}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 px-3 py-2.5 overflow-hidden">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-2 pt-2 border-t border-white/5' : ''}>
              {group.label && (
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-2.5 mb-1">
                  {group.label}
                </p>
              )}
              <div className="space-y-px">
                {group.items.map((item) => {
                  const blockedByPlan = item.feature ? !canAccessFeature(planName, item.feature) : false;
                  return (
                  <NavLink
                    key={item.to}
                    to={blockedByPlan ? '/settings' : item.to}
                    className={({ isActive }) =>
                      `sidebar-nav-link flex items-center gap-2.5 rounded-lg transition-all ${
                        blockedByPlan ? 'opacity-70' : ''
                      } ${
                        isActive
                          ? 'sidebar-nav-link-active font-medium'
                          : 'text-slate-300 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="sidebar-nav-label leading-tight">{item.label}</span>
                    {blockedByPlan && (
                      <span className="sidebar-pro-badge ml-auto text-[10px] px-1.5 py-0.5 rounded">PRO</span>
                    )}
                  </NavLink>
                );
              })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-2.5 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs">Sair</span>
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
      <div className={`app-sidebar fixed inset-y-0 left-0 w-64 z-50 transform transition-transform lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Sigma Auto</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-3 pt-3 border-t border-white/5' : ''}>
              {group.label && (
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const blockedByPlan = item.feature ? !canAccessFeature(planName, item.feature) : false;
                  return (
                  <NavLink
                    key={item.to}
                    to={blockedByPlan ? '/settings' : item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                        blockedByPlan ? 'opacity-70' : ''
                      } ${
                        isActive
                          ? 'bg-primary-500/20 text-primary-400 font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                    {blockedByPlan && (
                      <span className="ml-auto text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">PRO</span>
                    )}
                  </NavLink>
                );
              })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="app-main-frame flex-1 lg:ml-64">
        {/* Header mobile */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Sigma Auto</span>
          </div>
          <div className="w-8" /> {/* Spacer */}
        </header>

        {/* Header desktop */}
        <header className="app-shell-header hidden lg:flex items-center justify-between px-8 py-4 border-b border-slate-200 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {tenant?.name || 'Minha Oficina'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-64 pl-9 pr-4 py-2 bg-slate-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Plan upgrade CTA */}
            {planName === 'START' && (
              <button className="btn btn-primary text-sm">
                Migrar para o Premium
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}