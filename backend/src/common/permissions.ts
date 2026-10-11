import { ALL_STAFF, FINANCE, FRONT_DESK, FRONT_OFFICE_ROLES, LEADERSHIP, LEDGER_ROLES, TECHNICAL_ROLES } from './roles';

// Capacidades que cada oficina pode ajustar por perfil (Configurações → Equipe e permissões).
// O padrão de cada uma é a regra histórica de common/roles.ts. MASTER e ADMIN sempre podem tudo.
export const CONFIGURABLE_ROLES = ['GERENTE', 'CHEFE_OFICINA', 'MECANICO', 'SECRETARIA', 'FINANCEIRO'] as const;

const LEAD_AND_CHIEF = [...LEADERSHIP, 'CHEFE_OFICINA'];

export interface Capability {
  key: string;
  group: 'Atendimento' | 'Financeiro';
  label: string;
  hint: string;
  defaults: string[];
}

export const CAPABILITIES: Capability[] = [
  { key: 'os.status_menu', group: 'Atendimento', label: 'Ver as ações de etapa da O.S.', hint: 'Mostra os botões de mudar de etapa (cada etapa tem a sua própria permissão abaixo).', defaults: ALL_STAFF },
  { key: 'os.create_edit', group: 'Atendimento', label: 'Abrir e editar O.S., clientes e veículos', hint: 'Cria orçamentos e O.S. e edita os dados do atendimento.', defaults: FRONT_OFFICE_ROLES },
  { key: 'os.items', group: 'Atendimento', label: 'Lançar serviços, peças e diagnóstico', hint: 'Itens da O.S., diagnóstico, laudo, metrologia e preços.', defaults: TECHNICAL_ROLES },
  { key: 'os.technical_status', group: 'Atendimento', label: 'Mover a O.S. nas fases técnicas', hint: 'Diagnóstico, execução, aguardando peças e pronto para entrega.', defaults: TECHNICAL_ROLES },
  { key: 'os.approval', group: 'Atendimento', label: 'Enviar para aprovação e aprovar no balcão', hint: 'Aguardando aprovação, aprovado e reprovado.', defaults: [...LEAD_AND_CHIEF, ...FRONT_DESK] },
  { key: 'os.invoice', group: 'Financeiro', label: 'Registrar pagamento (faturar) e cobrar pelo Asaas', hint: 'Passa a O.S. para Faturado e emite cobrança.', defaults: [...LEAD_AND_CHIEF, ...FINANCE] },
  { key: 'os.deliver', group: 'Atendimento', label: 'Confirmar a entrega do veículo', hint: 'Registra data, quem retirou e quem autorizou.', defaults: [...LEAD_AND_CHIEF, ...FRONT_DESK, ...FINANCE] },
  { key: 'os.cancel', group: 'Atendimento', label: 'Cancelar O.S.', hint: 'Passa a O.S. para Cancelado.', defaults: LEAD_AND_CHIEF },
  { key: 'financial.ledger', group: 'Financeiro', label: 'Lançar e excluir no Fluxo de Caixa', hint: 'Movimentações manuais do livro caixa.', defaults: LEDGER_ROLES },
];

export type PermissionOverrides = Record<string, string[]> | null | undefined;

const norm = (role?: string | null) => {
  const r = String(role || '').toUpperCase();
  return r === 'PRODUTIVO' ? 'MECANICO' : r;
};

const isConfigurable = (r: string) => (CONFIGURABLE_ROLES as readonly string[]).includes(r);

export function findCapability(key: string): Capability | undefined {
  return CAPABILITIES.find((c) => c.key === key);
}

/** Perfis que podem a capacidade nesta oficina (padrão + ajuste). */
export function effectiveRoles(key: string, overrides: PermissionOverrides): string[] {
  const cap = findCapability(key);
  if (!cap) return [];
  const custom = overrides?.[key];
  if (!Array.isArray(custom)) return cap.defaults.map(norm);
  return custom.map(norm);
}

export function roleCan(role: string | null | undefined, key: string, overrides: PermissionOverrides): boolean {
  const r = norm(role);
  if (r === 'MASTER' || r === 'ADMIN') return true;
  return effectiveRoles(key, overrides).includes(r);
}

// Etapa da O.S. -> capacidade que a governa. Etapas fora da tabela: liderança e chefe de oficina.
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

export function roleCanMoveToStatus(role: string | null | undefined, status: string, overrides: PermissionOverrides): boolean {
  const r = norm(role);
  if (r === 'MASTER' || r === 'ADMIN') return true;
  const cap = capabilityForStatus(status);
  if (cap) return roleCan(r, cap, overrides);
  return ['GERENTE', 'CHEFE_OFICINA'].includes(r);
}

/** Valida e normaliza um ajuste vindo da tela; só guarda o que difere do padrão. */
export function sanitizeOverrides(input: Record<string, unknown>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const cap of CAPABILITIES) {
    const raw = input?.[cap.key];
    if (!Array.isArray(raw)) continue;
    const roles = [...new Set(raw.map((r) => norm(String(r))))].filter(isConfigurable);
    const defaults = [...new Set(cap.defaults.map(norm))].filter(isConfigurable);
    const same = roles.length === defaults.length && roles.every((r) => defaults.includes(r));
    if (!same) out[cap.key] = roles;
  }
  return out;
}
