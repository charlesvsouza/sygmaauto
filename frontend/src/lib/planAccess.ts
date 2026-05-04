export type PlanName = 'START' | 'PRO' | 'REDE' | 'RETIFICA_PRO' | 'RETIFICA_REDE';
export type PlanTier = 'START' | 'PRO' | 'REDE';
export type PlanMode = 'AUTOS' | 'RETIFICA';

export type PlanFeatureKey =
  | 'WHATSAPP'
  | 'KANBAN_PATIO'
  | 'KANBAN_RECEPCAO'
  | 'CHECKLIST'
  | 'DRE_KPI_RELATORIOS'
  | 'COMISSOES'
  | 'MULTIUNIDADE';

const PLAN_LEVEL: Record<PlanTier, number> = {
  START: 1,
  PRO: 2,
  REDE: 3,
};

const FEATURE_MIN_PLAN: Record<PlanFeatureKey, PlanTier> = {
  WHATSAPP: 'PRO',
  KANBAN_PATIO: 'PRO',
  KANBAN_RECEPCAO: 'PRO',
  CHECKLIST: 'PRO',
  DRE_KPI_RELATORIOS: 'PRO',
  COMISSOES: 'PRO',
  MULTIUNIDADE: 'REDE',
};

export function normalizePlanName(rawPlan?: string | null): PlanName {
  const plan = String(rawPlan || '').toUpperCase();
  if (plan === 'PRO' || plan === 'REDE' || plan === 'RETIFICA_PRO' || plan === 'RETIFICA_REDE') return plan;
  return 'START';
}

export function getPlanTier(planName?: string | null): PlanTier {
  const normalized = normalizePlanName(planName);
  if (normalized === 'REDE' || normalized === 'RETIFICA_REDE') return 'REDE';
  if (normalized === 'PRO' || normalized === 'RETIFICA_PRO') return 'PRO';
  return 'START';
}

export function getPlanMode(planName?: string | null): PlanMode {
  const normalized = normalizePlanName(planName);
  return normalized === 'RETIFICA_PRO' || normalized === 'RETIFICA_REDE' ? 'RETIFICA' : 'AUTOS';
}

export function getPlanRank(planName?: string | null): number {
  const tier = getPlanTier(planName);
  const modeBonus = getPlanMode(planName) === 'RETIFICA' ? 10 : 0;
  return PLAN_LEVEL[tier] + modeBonus;
}

export function canAccessRetificaMode(planName?: string | null): boolean {
  return getPlanMode(planName) === 'RETIFICA';
}

export function getPlanLabel(planName?: string | null): string {
  const normalized = normalizePlanName(planName);
  const labels: Record<PlanName, string> = {
    START: 'Oficina de Autos Start',
    PRO: 'Oficina de Autos Pro',
    REDE: 'Oficina de Autos Rede',
    RETIFICA_PRO: 'Modo Retifica Pro',
    RETIFICA_REDE: 'Modo Retifica Rede',
  };
  return labels[normalized];
}

export function canAccessFeature(planName: string | null | undefined, feature: PlanFeatureKey): boolean {
  const normalized = getPlanTier(planName);
  const minPlan = FEATURE_MIN_PLAN[feature];
  return PLAN_LEVEL[normalized] >= PLAN_LEVEL[minPlan];
}

export function featureLabel(feature: PlanFeatureKey): string {
  const labels: Record<PlanFeatureKey, string> = {
    WHATSAPP: 'WhatsApp Automático',
    KANBAN_PATIO: 'Kanban de Pátio',
    KANBAN_RECEPCAO: 'Painel de Recepção / TV',
    CHECKLIST: 'Checklist de Entrada/Saída',
    DRE_KPI_RELATORIOS: 'DRE, KPI e Relatórios',
    COMISSOES: 'Comissões',
    MULTIUNIDADE: 'Multiunidade',
  };
  return labels[feature];
}

export function getFeatureMinPlan(feature: PlanFeatureKey): PlanTier {
  return FEATURE_MIN_PLAN[feature];
}

export function getFeatureUpgradeMessage(feature: PlanFeatureKey): string {
  const requiredPlan = getFeatureMinPlan(feature);
  const label = featureLabel(feature);
  return `Este recurso está disponível a partir do plano ${requiredPlan}. Faça upgrade para desbloquear ${label} e outros recursos avançados.`;
}
