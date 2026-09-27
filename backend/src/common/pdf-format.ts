// Utilitários compartilhados pelos geradores de PDF (Puppeteer).
// O servidor roda em UTC (Railway): toda data impressa precisa do fuso de Brasília.
export const PDF_TIME_ZONE = 'America/Sao_Paulo';

// Também escapa chaves: o template usa {{campo}}, e um texto do cliente com
// "{{...}}" não pode ser tratado como variável.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

export function formatDateBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: PDF_TIME_ZONE }).format(date);
}

export function formatDateTimeBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: PDF_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export const SERVICE_ORDER_STATUS_LABEL: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  ORCAMENTO: 'Orçamento',
  ORCAMENTO_PRONTO: 'Orçamento pronto',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  AGUARDANDO_PECAS: 'Aguardando peças',
  EM_EXECUCAO: 'Em execução',
  PRONTO_ENTREGA: 'Pronto para entrega',
  FATURADO: 'Faturado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export function serviceOrderStatusLabel(status?: string | null): string {
  if (!status) return '';
  return SERVICE_ORDER_STATUS_LABEL[status] ?? status;
}

// Rodapé do Puppeteer (displayHeaderFooter). Roda fora da página: precisa de estilo
// próprio e fonte explícita, senão sai minúsculo. pageNumber/totalPages são
// preenchidos pelo Chrome.
export function pdfFooterTemplate(label?: string): string {
  const left = label ? `<span>${escapeHtml(label)}</span>` : '<span></span>';
  return `<div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#666;padding:0 12mm;display:flex;justify-content:space-between;">${left}<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;
}

export const PDF_EMPTY_HEADER = '<span></span>';
