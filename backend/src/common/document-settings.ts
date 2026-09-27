// Configurações dos documentos do atendimento (orçamento, O.S., termo de entrega).
// Campos nulos no tenant usam os padrões abaixo; a oficina pode personalizar.
// Nos textos, {servicos} e {pecas} viram os prazos de garantia em dias.

export const DEFAULT_WARRANTY_DAYS_SERVICES = 90; // CDC, art. 26, II
export const DEFAULT_WARRANTY_DAYS_PARTS = 90;
export const DEFAULT_BUDGET_VALIDITY_DAYS = 7;

export const DEFAULT_AUTHORIZATION_TEXT =
  'Autorizo a execução dos serviços e o fornecimento das peças relacionados neste orçamento, ' +
  'nos valores e condições aqui descritos. Serviços ou peças adicionais só serão executados ' +
  'mediante nova autorização.';

export const DEFAULT_WARRANTY_TEXT =
  'Garantia de {servicos} dias para os serviços e de {pecas} dias para as peças, contados da data ' +
  'de entrega do veículo, conforme o Código de Defesa do Consumidor (art. 26). A garantia não cobre ' +
  'mau uso, acidentes, desgaste natural nem intervenções de terceiros após a entrega.';

export const DEFAULT_BELONGINGS_TEXT =
  'A oficina não se responsabiliza por objetos pessoais deixados no veículo que não estejam ' +
  'relacionados na vistoria de entrada.';

type TenantDocFields = {
  warrantyDaysServices?: number | null;
  warrantyDaysParts?: number | null;
  budgetValidityDays?: number | null;
  authorizationText?: string | null;
  warrantyText?: string | null;
  belongingsText?: string | null;
};

export type DocumentSettings = {
  warrantyDaysServices: number;
  warrantyDaysParts: number;
  budgetValidityDays: number;
  authorizationText: string;
  warrantyText: string;
  belongingsText: string;
};

const text = (v: string | null | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);

export function resolveDocumentSettings(tenant: TenantDocFields | null | undefined): DocumentSettings {
  return {
    warrantyDaysServices: tenant?.warrantyDaysServices ?? DEFAULT_WARRANTY_DAYS_SERVICES,
    warrantyDaysParts: tenant?.warrantyDaysParts ?? DEFAULT_WARRANTY_DAYS_PARTS,
    budgetValidityDays: tenant?.budgetValidityDays ?? DEFAULT_BUDGET_VALIDITY_DAYS,
    authorizationText: text(tenant?.authorizationText, DEFAULT_AUTHORIZATION_TEXT),
    warrantyText: text(tenant?.warrantyText, DEFAULT_WARRANTY_TEXT),
    belongingsText: text(tenant?.belongingsText, DEFAULT_BELONGINGS_TEXT),
  };
}

export function fillWarrantyText(settings: DocumentSettings): string {
  return settings.warrantyText
    .split('{servicos}').join(String(settings.warrantyDaysServices))
    .split('{pecas}').join(String(settings.warrantyDaysParts));
}
