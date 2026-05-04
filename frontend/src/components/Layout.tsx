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
  Edit,
  Trash2,
  Loader2,
  ChevronDown,
  Search,
  Bell,
  Tv2,
  Monitor,
  PanelsTopLeft,
  MessageCircle,
  BarChart3,
  Gauge,
  FileText,
} from 'lucide-react';
import { useState } from 'react';

export function Layout() {
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewModeOpen, setViewModeOpen] = useState(true);
  const canViewUsers = ['MASTER', 'ADMIN'].includes(user?.role ?? '');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const planName = tenant?.subscription?.plan?.name || 'START';

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
    { to: '/customers', icon: Users, label: 'Clientes' },
    ...(canViewUsers ? [{ to: '/users', icon: UserCheck, label: 'Usuários' }] : []),
    { to: '/vehicles', icon: Car, label: 'Veículos' },

    { to: '/service-orders', icon: ClipboardList, label: 'Ordens de Serviço' },
    { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', premium: true },
    { to: '/services', icon: Wrench, label: 'Serviços' },
    {
      to: '/inventory',
      icon: Package,
      label: 'Estoque',
    },
    {
      to: '/financial',
      icon: DollarSign,
      label: 'Financeiro',
      premium: true,
    },
    {
      to: '/commissions',
      icon: DollarSign,
      label: 'Comissões',
      premium: true,
    },
    {
      to: '/dre',
      icon: BarChart3,
      label: 'DRE',
      premium: true,
    },
    {
      to: '/kpis',
      icon: Gauge,
      label: 'KPIs',
      premium: true,
    },
    {
      to: '/reports',
      icon: FileText,
      label: 'Relatórios',
      premium: true,
    },
    { to: '/settings', icon: Settings, label: 'Configurações' },
  ];
  const viewModeItems = [
    { to: '/kanban', icon: Tv2, label: 'Kanban de Pátio', premium: true },
    { to: '/kanban-recepcao', icon: Monitor, label: 'Painel Recepção', premium: true },
  ];
  const isViewModeActive = viewModeItems.some((item) => location.pathname === item.to);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-midnight-950 to-midnight-900 min-h-screen fixed left-0 top-0 z-30">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
               <h1 className="font-bold text-white text-lg leading-tight">Sigma Auto</h1>
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
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-400 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
              {item.premium && planName === 'START' && (
                <span className="ml-auto text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">PRO</span>
              )}
            </NavLink>
          ))}

          <div className="pt-2 mt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setViewModeOpen((value) => !value)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                isViewModeActive
                  ? 'bg-primary-500/10 text-primary-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <PanelsTopLeft className="w-5 h-5" />
              <span className="text-sm">Modo de exibição</span>
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${viewModeOpen ? 'rotate-180' : ''}`} />
            </button>

            {viewModeOpen && (
              <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-1">
                {viewModeItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-primary-500/20 text-primary-400 font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                    {item.premium && planName === 'START' && (
                      <span className="ml-auto text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">PRO</span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sair</span>
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
      <div className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-midnight-950 to-midnight-900 z-50 transform transition-transform lg:hidden ${
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
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-400 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}

          <div className="pt-2 mt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setViewModeOpen((value) => !value)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all ${
                isViewModeActive
                  ? 'bg-primary-500/10 text-primary-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <PanelsTopLeft className="w-5 h-5" />
              <span className="text-sm">Modo de exibição</span>
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${viewModeOpen ? 'rotate-180' : ''}`} />
            </button>

            {viewModeOpen && (
              <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-1">
                {viewModeItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-primary-500/20 text-primary-400 font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                    {item.premium && planName === 'START' && (
                      <span className="ml-auto text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">PRO</span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
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
      <main className="flex-1 lg:ml-64">
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
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
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