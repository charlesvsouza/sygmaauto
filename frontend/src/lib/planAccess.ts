export type PlanName = 'START' | 'PRO' | 'REDE';

export type PlanFeatureKey =
  | 'KANBAN_PATIO'
  | 'KANBAN_RECEPCAO'
  | 'CHECKLIST'
  | 'DRE_KPI_RELATORIOS'
  | 'COMISSOES'
  | 'MULTIUNIDADE';

const PLAN_LEVEL: Record<PlanName, number> = {
  START: 1,
  PRO: 2,
  REDE: 3,
};

const FEATURE_MIN_PLAN: Record<PlanFeatureKey, PlanName> = {
  KANBAN_PATIO: 'REDE',
  KANBAN_RECEPCAO: 'REDE',
  CHECKLIST: 'PRO',
  DRE_KPI_RELATORIOS: 'REDE',
  COMISSOES: 'REDE',
  MULTIUNIDADE: 'REDE',
};

export function normalizePlanName(rawPlan?: string | null): PlanName {
  const plan = String(rawPlan || '').toUpperCase();
  if (plan === 'PRO' || plan === 'REDE') return plan;
  return 'START';
}

export function canAccessFeature(planName: string | null | undefined, feature: PlanFeatureKey): boolean {
  const normalized = normalizePlanName(planName);
  const minPlan = FEATURE_MIN_PLAN[feature];
  return PLAN_LEVEL[normalized] >= PLAN_LEVEL[minPlan];
}

export function featureLabel(feature: PlanFeatureKey): string {
  const labels: Record<PlanFeatureKey, string> = {
    KANBAN_PATIO: 'Kanban de Pátio',
    KANBAN_RECEPCAO: 'Painel de Recepção / TV',
    CHECKLIST: 'Checklist de Entrada/Saída',
    DRE_KPI_RELATORIOS: 'DRE, KPI e Relatórios',
    COMISSOES: 'Comissões',
    MULTIUNIDADE: 'Multiunidade',
  };
  return labels[feature];
}
