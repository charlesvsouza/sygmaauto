import { Prisma, PrismaClient } from '@prisma/client';
import { PDF_TIME_ZONE } from './pdf-format';

// Numeração do atendimento: contador da oficina em hexadecimal (8 dígitos) + mês/ano
// da abertura no fuso de Brasília. Ex.: 0000007B/09-2026. O orçamento aprovado vira
// O.S. com o MESMO número; muda só o título do documento.

type OrderLike = { id: string; number?: number | null; createdAt?: Date | string | null };

export function formatOrderCode(order: OrderLike): string {
  if (order.number == null) {
    // Legado ainda sem número (antes do preenchimento retroativo).
    return order.id.slice(0, 8).toUpperCase();
  }
  const hex = order.number.toString(16).toUpperCase().padStart(8, '0');
  if (!order.createdAt) return hex;
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: PDF_TIME_ZONE,
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(order.createdAt));
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${hex}/${month}-${year}`;
}

// Próximo número da oficina. O UPDATE ... increment trava a linha do tenant, então
// duas aberturas simultâneas nunca recebem o mesmo número.
export async function nextOrderNumber(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
): Promise<number> {
  const tenant = await db.tenant.update({
    where: { id: tenantId },
    data: { orderSequence: { increment: 1 } },
    select: { orderSequence: true },
  });
  return tenant.orderSequence;
}

// Nome de arquivo previsível: ORCAMENTO-0000007B-09-2026-ABC1D23.pdf
export function orderFileName(label: string, order: OrderLike, plate?: string | null): string {
  const code = formatOrderCode(order).replace(/\//g, '-');
  const cleanPlate = (plate || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `${label}-${code}${cleanPlate ? `-${cleanPlate}` : ''}.pdf`;
}
