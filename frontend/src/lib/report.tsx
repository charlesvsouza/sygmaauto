// Padrão único de relatório em PDF. As telas montam só o conteúdo (dentro de um
// elemento oculto) e usam ReportHeader + downloadReportPdf. O PDF é sempre gerado
// no servidor (Puppeteer), que acrescenta em toda folha o rodapé
// "Oficina · Título · Emitido em … por … · Página X de Y".
import { pdfApi } from '../api/client';

// Estilo único dos relatórios. Escopo em .rpt: também é usado na pré-visualização
// dentro do app, então não pode tocar em body nem em seletores globais.
export const REPORT_CSS = `
.rpt, .rpt * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.rpt { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 10pt; color: #111; width: 100%; }
.rpt table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.rpt td, .rpt th { border: 1px solid #ccc; padding: 5px 8px; font-size: 9pt; vertical-align: middle; }
.rpt thead { display: table-header-group; }
.rpt tr { break-inside: avoid; }
.rpt .hdr, .rpt .hdr td, .rpt .hdr th { background: #1e293b; color: #fff; border-color: #1e293b; font-weight: bold; text-transform: uppercase; font-size: 9pt; letter-spacing: .05em; }
.rpt .sub-hdr, .rpt .sub-hdr td { background: #f1f5f9; font-weight: bold; font-size: 9pt; }
.rpt .total-row, .rpt .total-row td { background: #f0fdf4; font-weight: bold; }
.rpt .income-row td { background: #f0fdf4; }
.rpt .expense-row td { background: #fff5f5; }
.rpt .pos { color: #16a34a; font-weight: bold; }
.rpt .neg { color: #dc2626; font-weight: bold; }
.rpt .critical { color: #dc2626; font-weight: bold; }
.rpt .urgent { color: #d97706; font-weight: bold; }
.rpt .attention { color: #2563eb; font-weight: bold; }
.rpt hr { border: none; border-top: 1.5px solid #333; margin: 6px 0; }
.rpt .kpi-grid { display: flex; gap: 8px; margin-bottom: 10px; break-inside: avoid; }
.rpt .kpi { flex: 1; border: 1px solid #ccc; padding: 8px 10px; text-align: center; }
.rpt .kpi-label { font-size: 7.5pt; color: #555; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
.rpt .kpi-value { font-size: 14pt; font-weight: 900; }
.rpt .summary-value { font-size: 13pt; font-weight: 900; }
.rpt .rpt-header td { border: none; }
.rpt .rpt-signature { margin-top: 28px; break-inside: avoid; }
`;

// Para HTML montado em string (laudo, pedido de compra): texto do usuário com <, &
// ou " não pode virar marcação.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type TenantLike = {
  logo?: string | null;
  name?: string | null;
  tradeName?: string | null;
  legalName?: string | null;
  document?: string | null;
  companyType?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
} | null | undefined;

export function tenantDisplayName(tenant: TenantLike): string {
  return tenant?.name || tenant?.tradeName || tenant?.legalName || 'Oficina';
}

// Cabeçalho padrão: oficina à esquerda; título e filtros APLICADOS à direita.
export function ReportHeader({ tenant, title, details = [] }: {
  tenant: TenantLike;
  title: string;
  details?: Array<string | false | null | undefined>;
}) {
  const lines = details.filter(Boolean) as string[];
  return (
    <>
      <table className="rpt-header" style={{ marginBottom: '6px' }}>
        <tbody>
          <tr>
            <td style={{ paddingLeft: 0, verticalAlign: 'top', width: '60%' }}>
              {tenant?.logo && (
                <img src={tenant.logo} alt="Logo" style={{ maxHeight: '48px', maxWidth: '130px', objectFit: 'contain', marginBottom: '4px' }} />
              )}
              <div style={{ fontSize: '16pt', fontWeight: 900, lineHeight: 1.1 }}>{tenantDisplayName(tenant)}</div>
              {tenant?.document && (
                <div style={{ fontSize: '9pt', marginTop: '3px' }}>{tenant.companyType || 'CNPJ'}: {tenant.document}</div>
              )}
              {tenant?.address && <div style={{ fontSize: '9pt' }}>{tenant.address}</div>}
              {(tenant?.phone || tenant?.email) && (
                <div style={{ fontSize: '9pt' }}>
                  {[tenant?.phone && `Tel: ${tenant.phone}`, tenant?.email].filter(Boolean).join('  |  ')}
                </div>
              )}
            </td>
            <td style={{ border: '2px solid #1e293b', padding: '8px 12px', textAlign: 'right', verticalAlign: 'top' }}>
              <div style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#1e293b' }}>{title}</div>
              {lines.map((line) => (
                <div key={line} style={{ fontSize: '9pt', color: '#444', marginTop: '3px' }}>{line}</div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
      <hr />
    </>
  );
}

export function ReportSignature({ label = 'Responsável' }: { label?: string }) {
  return (
    <div className="rpt-signature">
      <div style={{ borderTop: '1px solid #555', display: 'inline-block', width: '220px', marginBottom: '4px' }} />
      <br /><span style={{ fontSize: '9pt' }}>{label}</span>
      <br /><span style={{ fontSize: '8pt', color: '#666' }}>Data: _____/_____/__________</span>
    </div>
  );
}

function saveBlob(data: BlobPart, fileName: string) {
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function pdfName(fileName: string) {
  const safe = fileName.replace(/[\\/:*?"<>|]+/g, '_');
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
}

// Relatório: envia o conteúdo do elemento com o estilo padrão.
export async function downloadReportPdf(
  element: HTMLElement,
  opts: { title: string; fileName: string; landscape?: boolean },
): Promise<void> {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeHtml(opts.title)}</title><style>body { margin: 0; background: #fff; }${REPORT_CSS}</style></head><body>${element.innerHTML}</body></html>`;
  await downloadHtmlPdf(html, opts);
}

// Documento que já vem com HTML e estilo próprios (laudo, pedido de compra).
export async function downloadHtmlPdf(
  html: string,
  opts: { title: string; fileName: string; landscape?: boolean },
): Promise<void> {
  const fileName = pdfName(opts.fileName);
  const response = await pdfApi.render({ html, fileName, title: opts.title, landscape: opts.landscape });
  saveBlob(response.data, fileName);
}

/* ─── datas ─────────────────────────────────────────────────────────────────
   <input type="date"> trabalha com "AAAA-MM-DD" no horário LOCAL. new Date("AAAA-MM-DD")
   é lido como UTC e, no Brasil, vira o dia anterior; toISOString() depois das 21h já
   é o dia seguinte. Use estas funções. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export function firstOfMonthInput(): string {
  const d = new Date();
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 1));
}

// "2026-09-01" → "01/09/2026" (sem passar por Date, sem fuso).
export function fmtDateInput(value?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

// Período para cabeçalho e nome de arquivo.
export function periodLabel(start?: string, end?: string): string {
  if (!start && !end) return 'Todo o período';
  return `${fmtDateInput(start)} a ${fmtDateInput(end)}`;
}
