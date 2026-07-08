import { useNavigate } from 'react-router-dom';
import { Shield, X, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatingTenantName, stopImpersonation } = useAuthStore();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = () => {
    stopImpersonation();
    navigate('/admin');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white flex items-center justify-between px-4 py-2 text-xs font-bold shadow-lg">
      <div className="flex items-center gap-2">
        <Shield size={13} />
        <span>MODO SUPERADMIN</span>
        <span className="text-red-700">·</span>
        <span>Gerenciando tenant:</span>
        <span className="bg-red-700 px-2 py-0.5 rounded-md">{impersonatingTenantName}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-red-700 hidden sm:inline">Token expira em 2h</span>
        <button type="button"
          onClick={handleExit}
          className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 px-3 py-1.5 rounded-lg transition-all"
        >
          <X size={12} />
          Sair da impersonação
        </button>
        <button type="button"
          onClick={() => { stopImpersonation(); navigate('/admin'); }}
          className="flex items-center gap-1.5 bg-ink/5 hover:bg-ink/5 px-3 py-1.5 rounded-lg transition-all"
        >
          <ExternalLink size={12} />
          Painel Admin
        </button>
      </div>
    </div>
  );
}
