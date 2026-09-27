// Documentos do atendimento (backend: service-orders/order-documents.service.ts).
// Entrada → orçamento → (aprovado) O.S. com o mesmo número → entrega.

export type OrderDocumentKind = 'entrada' | 'orcamento' | 'os' | 'oficina' | 'entrega';

const DELIVERY_STATUSES = ['PRONTO_ENTREGA', 'FATURADO', 'ENTREGUE'];

export function availableDocuments(order: { orderType?: string; status?: string }) {
  const approved = order.orderType !== 'ORCAMENTO';
  const docs: Array<{ kind: OrderDocumentKind; label: string; hint: string }> = [
    { kind: 'entrada', label: 'Entrada do veículo', hint: 'Vistoria, acessórios e fotos — assinatura do cliente' },
    { kind: 'orcamento', label: 'Orçamento', hint: 'Valores, validade, autorização e QR code de aprovação' },
  ];
  if (approved) {
    docs.push(
      { kind: 'os', label: 'Ordem de Serviço — via do cliente', hint: 'Itens aprovados com valores e técnicos' },
      { kind: 'oficina', label: 'Ordem de Serviço — via da oficina', hint: 'Sem valores: reclamações, serviços e peças a aplicar' },
    );
  }
  if (DELIVERY_STATUSES.includes(order.status ?? '')) {
    docs.push({ kind: 'entrega', label: 'Termo de entrega e garantia', hint: 'Serviços executados, pagamento e prazos de garantia' });
  }
  return docs;
}
