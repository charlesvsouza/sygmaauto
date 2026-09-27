// Número do atendimento, igual ao do backend (common/order-number.ts): contador da
// oficina em hexadecimal + mês/ano da abertura em Brasília. Ex.: 0000007B/09-2026.
// O orçamento aprovado vira O.S. com o mesmo número.

type OrderLike = { id: string; number?: number | null; createdAt?: string | Date | null };

export function orderCode(order: OrderLike): string {
  if (order.number == null) return order.id.slice(0, 8).toUpperCase();
  const hex = order.number.toString(16).toUpperCase().padStart(8, '0');
  if (!order.createdAt) return hex;
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(order.createdAt));
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${hex}/${month}-${year}`;
}

// Parte curta (só o hexadecimal): usada para confirmar exclusão digitando o número.
export function orderShortCode(order: OrderLike): string {
  return orderCode(order).split('/')[0];
}

// Para nomes de arquivo: sem "/".
export function orderFileCode(order: OrderLike): string {
  return orderCode(order).replace(/\//g, '-');
}
