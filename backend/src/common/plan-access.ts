import { PrismaService } from '../prisma/prisma.service';

// Quem tem checklist de entrada/saída: planos PRO e REDE (inclusive modo retífica) ou START
// com o adicional ligado pelo superadmin (Tenant.checklistAddon).
export async function tenantHasChecklist(prisma: PrismaService, tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { checklistAddon: true, subscription: { select: { plan: { select: { name: true } } } } },
  });
  if (!tenant) return false;
  if (tenant.checklistAddon) return true;
  const plan = String(tenant.subscription?.plan?.name ?? '').toUpperCase();
  return plan.includes('PRO') || plan.includes('REDE');
}

// Uma única informação basta: combustível, uma área/acessório marcado ou observação.
export function checklistHasInfo(c: { fuelLevel?: number | null; observations?: string | null; items?: unknown[] | null } | null | undefined): boolean {
  if (!c) return false;
  return Boolean((c.fuelLevel ?? 0) > 0 || (c.items?.length ?? 0) > 0 || (c.observations ?? '').trim());
}
