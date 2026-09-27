// Permissões por perfil — espelho de backend/src/common/roles.ts (manter iguais).
// MASTER sempre pode tudo; as listas valem para os demais perfis.

export const LEADERSHIP = ['MASTER', 'ADMIN', 'GERENTE'];
// PRODUTIVO é o nome legado de MECANICO: os dois têm as mesmas permissões.
export const TECHNICAL = ['CHEFE_OFICINA', 'MECANICO', 'PRODUTIVO'];
export const FRONT_DESK = ['SECRETARIA'];
export const FINANCE = ['FINANCEIRO'];
export const ALL_STAFF = [...LEADERSHIP, ...TECHNICAL, ...FRONT_DESK, ...FINANCE];

// Abrir O.S./orçamento, cadastrar e editar cliente e veículo, editar dados da O.S.
export const FRONT_OFFICE_ROLES = [...LEADERSHIP, ...TECHNICAL, ...FRONT_DESK];
// Lançar/editar itens, diagnóstico, metrologia, preços.
export const TECHNICAL_ROLES = [...LEADERSHIP, ...TECHNICAL];

// Quem pode levar a O.S. para cada status. Status fora da tabela: liderança e chefe de oficina.
const TECH_PHASES = [
  'EM_DIAGNOSTICO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'PRONTO_ENTREGA',
  'DESMONTAGEM', 'METROLOGIA', 'ORCAMENTO_RETIFICA', 'EM_RETIFICA', 'MONTAGEM', 'TESTE_FINAL',
];
const APPROVAL_PHASES = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_APROVACAO_RETIFICA', 'APROVADO', 'REPROVADO'];
const LEAD_AND_CHIEF = [...LEADERSHIP, 'CHEFE_OFICINA'];

export const STATUS_ROLES: Record<string, string[]> = {
  ...Object.fromEntries(TECH_PHASES.map((s) => [s, TECHNICAL_ROLES])),
  ...Object.fromEntries(APPROVAL_PHASES.map((s) => [s, [...LEAD_AND_CHIEF, ...FRONT_DESK]])),
  FATURADO: [...LEAD_AND_CHIEF, ...FINANCE],
  ENTREGUE: [...LEAD_AND_CHIEF, ...FRONT_DESK, ...FINANCE],
  CANCELADO: LEAD_AND_CHIEF,
};

export function canMoveToStatus(role: string | null | undefined, status: string): boolean {
  const r = String(role || '').toUpperCase();
  if (r === 'MASTER') return true;
  return (STATUS_ROLES[status] ?? LEAD_AND_CHIEF).includes(r);
}

// Quem aparece em qualquer tela de mudança de status (a regra fina é canMoveToStatus).
export const STATUS_CHANGE_ROLES = ALL_STAFF;
export const INVOICE_ROLES = STATUS_ROLES.FATURADO;
export const APPROVAL_ROLES = STATUS_ROLES.APROVADO;

// Lançar e excluir movimentações no Fluxo de Caixa.
export const LEDGER_ROLES = ['MASTER', 'ADMIN', ...FINANCE];
