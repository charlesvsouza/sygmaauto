import { useEffect } from 'react';
import { create } from 'zustand';
import { permissionsApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ALL_STAFF, FINANCE, FRONT_DESK, FRONT_OFFICE_ROLES, LEADERSHIP, LEDGER_ROLES, TECHNICAL_ROLES } from './roles';

// Permissões efetivas do usuário logado (padrão + ajuste da oficina, vindo de /permissions/me).
// Enquanto não carregam, vale o padrão histórico por perfil: nada pisca nem muda de lugar.
const LEAD_AND_CHIEF = [...LEADERSHIP, 'CHEFE_OFICINA'];

const DEFAULTS: Record<string, string[]> = {
  'os.status_menu': ALL_STAFF,
  'os.create_edit': FRONT_OFFICE_ROLES,
  'os.items': TECHNICAL_ROLES,
  'os.technical_status': TECHNICAL_ROLES,
  'os.approval': [...LEAD_AND_CHIEF, ...FRONT_DESK],
  'os.invoice': [...LEAD_AND_CHIEF, ...FINANCE],
  'os.deliver': [...LEAD_AND_CHIEF, ...FRONT_DESK, ...FINANCE],
  'os.cancel': LEAD_AND_CHIEF,
  'financial.ledger': LEDGER_ROLES,
};

const TECH_PHASES = [
  'EM_DIAGNOSTICO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'PRONTO_ENTREGA',
  'DESMONTAGEM', 'METROLOGIA', 'ORCAMENTO_RETIFICA', 'EM_RETIFICA', 'MONTAGEM', 'TESTE_FINAL',
];
const APPROVAL_PHASES = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_RETIFICA', 'APROVADO', 'REPROVADO'];

export function capabilityForStatus(status: string): string | null {
  if (TECH_PHASES.includes(status)) return 'os.technical_status';
  if (APPROVAL_PHASES.includes(status)) return 'os.approval';
  if (status === 'FATURADO') return 'os.invoice';
  if (status === 'ENTREGUE') return 'os.deliver';
  if (status === 'CANCELADO') return 'os.cancel';
  return null;
}

interface PermissionState {
  caps: Record<string, boolean> | null;
  loading: boolean;
  load: (force?: boolean) => Promise<void>;
  reset: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  caps: null,
  loading: false,
  load: async (force = false) => {
    if (get().loading || (get().caps && !force)) return;
    set({ loading: true });
    try {
      const res = await permissionsApi.me();
      set({ caps: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  reset: () => set({ caps: null, loading: false }),
}));

/** Decisão por capacidade para o perfil atual. */
export function usePermissions() {
  const role = String(useAuthStore((s) => s.user?.role) ?? '').toUpperCase();
  const caps = usePermissionStore((s) => s.caps);
  const load = usePermissionStore((s) => s.load);
  useEffect(() => { load(); }, [load, role]);

  const can = (key: string): boolean => {
    if (role === 'MASTER' || role === 'ADMIN') return true;
    if (caps && key in caps) return caps[key];
    return (DEFAULTS[key] ?? []).includes(role);
  };
  const canMoveToStatus = (status: string): boolean => {
    if (role === 'MASTER' || role === 'ADMIN') return true;
    const cap = capabilityForStatus(status);
    if (cap) return can(cap);
    return ['GERENTE', 'CHEFE_OFICINA'].includes(role);
  };
  return { can, canMoveToStatus };
}
