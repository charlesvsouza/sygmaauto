import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import {
  escapeHtml,
  formatDateBR,
  formatDateTimeBR,
  pdfIssuedLine,
  serviceOrderStatusLabel,
} from '../common/pdf-format';
import { formatOrderCode, orderFileName } from '../common/order-number';
import { fillWarrantyText, resolveDocumentSettings, DocumentSettings } from '../common/document-settings';
import {
  CHECKLIST_ACCESSORIES,
  CHECKLIST_AREA_LABEL,
  CHECKLIST_CONDITION_LABEL,
  FUEL_LEVEL_LABEL,
} from '../common/checklist-labels';

// Documentos do atendimento. Todo atendimento começa pela ENTRADA (vistoria), segue para
// o ORÇAMENTO e, aprovado, vira O.S. com o mesmo número; a O.S. tem a via do cliente
// (com valores), a via da OFICINA (sem valores, para o chão de oficina) e termina no
// termo de ENTREGA com garantia.
export const ORDER_DOCUMENT_KINDS = ['entrada', 'orcamento', 'os', 'oficina', 'entrega'] as const;
export type OrderDocumentKind = (typeof ORDER_DOCUMENT_KINDS)[number];

const TITLES: Record<OrderDocumentKind, string> = {
  entrada: 'Entrada do Veículo',
  orcamento: 'Orçamento',
  os: 'Ordem de Serviço',
  oficina: 'Ordem de Serviço — Via da Oficina',
  entrega: 'Termo de Entrega e Garantia',
};

const FILE_LABEL: Record<OrderDocumentKind, string> = {
  entrada: 'ENTRADA',
  orcamento: 'ORCAMENTO',
  os: 'OS',
  oficina: 'OS-OFICINA',
  entrega: 'ENTREGA',
};

const e = escapeHtml;
const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
const qty = (v: number) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

const CSS = `
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #111; }
table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
th, td { border: 1px solid #c8ccd2; padding: 4px 6px; vertical-align: top; text-align: left; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { background: #eef1f5; font-size: 8pt; text-transform: uppercase; letter-spacing: .03em; }
.r { text-align: right; } .c { text-align: center; }
.muted { color: #666; } .small { font-size: 8pt; }
.head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 10px; }
.head .co { display: flex; gap: 10px; align-items: flex-start; }
.head img { max-height: 52px; max-width: 120px; object-fit: contain; }
.head .name { font-size: 15pt; font-weight: 900; line-height: 1.1; }
.head .doc { border: 2px solid #1e293b; padding: 6px 10px; text-align: right; min-width: 190px; }
.head .doc .t { font-size: 10.5pt; font-weight: 900; text-transform: uppercase; }
.head .doc .n { font-size: 12pt; font-weight: 900; font-family: 'Courier New', monospace; margin-top: 2px; }
.sec { background: #1e293b; color: #fff; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; letter-spacing: .05em; padding: 4px 6px; margin: 10px 0 0; break-after: avoid; }
.box { border: 1px solid #c8ccd2; padding: 6px 8px; white-space: pre-line; margin-bottom: 8px; min-height: 22px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
.kv td:nth-child(odd) { background: #f6f7f9; font-weight: bold; font-size: 8.5pt; }
.kv td:first-child { width: 32%; }
.totals { width: 55%; margin-left: auto; }
.totals td:first-child { background: #f6f7f9; }
.totals .grand td { font-weight: 900; font-size: 11pt; background: #e8f5ec; }
.legal { font-size: 8.5pt; color: #333; border-left: 3px solid #1e293b; padding: 4px 8px; margin: 8px 0; text-align: justify; }
.signs { display: flex; gap: 32px; margin-top: 34px; break-inside: avoid; }
.sign { flex: 1; text-align: center; font-size: 8.5pt; }
.sign .line { border-top: 1px solid #333; margin-bottom: 3px; }
.sign .who { font-weight: bold; font-size: 9pt; }
.check { display: inline-block; width: 11px; height: 11px; border: 1px solid #333; vertical-align: middle; }
.photos { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.photos figure { margin: 0; width: 118px; font-size: 7pt; text-align: center; break-inside: avoid; }
.photos img { width: 118px; height: 88px; object-fit: cover; border: 1px solid #c8ccd2; }
.qr { display: flex; gap: 10px; align-items: center; border: 1px dashed #999; padding: 6px 8px; margin: 8px 0; break-inside: avoid; }
.qr img { width: 92px; height: 92px; }
.approved { border: 2px solid #16a34a; color: #166534; padding: 6px 8px; font-weight: bold; margin: 8px 0; }
`;

type Ctx = {
  order: any;
  settings: DocumentSettings;
  code: string;
  kind: OrderDocumentKind;
};

@Injectable()
export class OrderDocumentsService {
  constructor(
    private prisma: PrismaService,
    private pdf: PdfService,
  ) {}

  async generate(tenantId: string, orderId: string, kind: OrderDocumentKind, userId?: string) {
    if (!ORDER_DOCUMENT_KINDS.includes(kind)) {
      throw new BadRequestException(`Documento inválido: ${kind}`);
    }
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        customer: true,
        vehicle: true,
        tenant: true,
        mechanic: { select: { name: true } },
        items: {
          include: {
            service: true,
            part: { include: { supplier: { select: { name: true } } } },
            assignedUser: { select: { name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        checklists: { include: { items: { include: { photos: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Ordem de Serviço não encontrada');

    const ctx: Ctx = { order, settings: resolveDocumentSettings(order.tenant), code: formatOrderCode(order), kind };
    const issuer = userId
      ? await this.prisma.user.findFirst({ where: { id: userId, tenantId }, select: { name: true } })
      : null;

    let body: string;
    if (kind === 'entrada') body = this.entrada(ctx, issuer?.name);
    else if (kind === 'orcamento') body = await this.orcamento(ctx);
    else if (kind === 'os') body = this.osCliente(ctx);
    else if (kind === 'oficina') body = this.oficina(ctx);
    else body = await this.entrega(ctx);

    const title = TITLES[kind];
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${e(title)} ${e(ctx.code)}</title><style>${CSS}</style></head><body>${this.header(ctx)}${body}</body></html>`;
    const companyName = this.companyName(order.tenant);
    const buffer = await this.pdf.renderHtml(html, {
      margin: { top: '12mm', right: '12mm', bottom: '14mm', left: '12mm' },
      footerLabel: `${companyName} · ${title} ${ctx.code}`,
      footerIssued: pdfIssuedLine(issuer?.name),
    });
    return { buffer, fileName: orderFileName(FILE_LABEL[kind], order, order.vehicle?.plate) };
  }

  // ─── partes comuns ────────────────────────────────────────────────────────

  private companyName(t: any): string {
    return t?.name || t?.tradeName || t?.legalName || 'Oficina';
  }

  private header({ order, code, kind }: Ctx): string {
    const t = order.tenant;
    const contact = [t.phone && `Tel: ${t.phone}`, t.email].filter(Boolean).join(' · ');
    const doc = t.taxId || t.document;
    return `
<div class="head">
  <div class="co">
    ${t.logo ? `<img src="${e(t.logo)}" alt="" />` : ''}
    <div>
      <div class="name">${e(this.companyName(t))}</div>
      ${doc ? `<div class="small">${e(t.companyType || 'CNPJ')}: ${e(doc)}</div>` : ''}
      ${t.address ? `<div class="small">${e(t.address)}</div>` : ''}
      ${contact ? `<div class="small">${e(contact)}</div>` : ''}
    </div>
  </div>
  <div class="doc">
    <div class="t">${e(TITLES[kind])}</div>
    <div class="n">Nº ${e(code)}</div>
    <div class="small">Abertura: ${formatDateBR(order.createdAt)}</div>
    <div class="small">Situação: ${e(serviceOrderStatusLabel(order.status))}</div>
  </div>
</div>`;
  }

  private clientVehicle({ order }: Ctx, opts: { kmSaida?: boolean } = {}): string {
    const c = order.customer;
    const v = order.vehicle;
    const addr = [c.address, c.cidade, c.estado].filter(Boolean).join(' — ');
    const vehicleRows = v
      ? `<tr><td>Veículo</td><td>${e(`${v.brand} ${v.model}`)}${v.year ? ` · ${v.year}` : ''}${v.color ? ` · ${e(v.color)}` : ''}</td></tr>
         <tr><td>Placa</td><td><b>${e(v.plate)}</b></td></tr>
         <tr><td>Chassi</td><td>${e(v.vin || '—')}</td></tr>`
      : `<tr><td>Equipamento</td><td>${e([order.equipmentBrand, order.equipmentModel].filter(Boolean).join(' ') || '—')}</td></tr>
         <tr><td>Nº de série</td><td>${e(order.serialNumber || '—')}</td></tr>`;
    const km = `<tr><td>KM entrada</td><td>${order.kmEntrada != null ? qty(order.kmEntrada) : '—'}</td></tr>`
      + (opts.kmSaida ? `<tr><td>KM saída</td><td>${order.kmSaida != null ? qty(order.kmSaida) : '—'}</td></tr>` : '');
    return `
<div class="grid2">
  <table class="kv">
    <tr><td>Cliente</td><td><b>${e(c.name)}</b></td></tr>
    <tr><td>CPF/CNPJ</td><td>${e(c.document || '—')}</td></tr>
    <tr><td>Telefone</td><td>${e(c.phone || '—')}</td></tr>
    <tr><td>Endereço</td><td>${e(addr || '—')}</td></tr>
  </table>
  <table class="kv">${vehicleRows}${km}</table>
</div>`;
  }

  private textSection(title: string, text?: string | null, emptyLines = 0): string {
    if (!text && !emptyLines) return '';
    const content = text ? e(text) : '<br/>'.repeat(emptyLines);
    return `<div class="sec">${e(title)}</div><div class="box">${content}</div>`;
  }

  private signatures(list: Array<{ role: string; name?: string | null }>): string {
    return `<div class="signs">${list
      .map((s) => `<div class="sign"><div class="line"></div><div class="who">${e(s.name || '')}</div><div>${e(s.role)}</div></div>`)
      .join('')}</div>`;
  }

  private services(order: any) {
    return order.items.filter((i: any) => i.type !== 'part');
  }

  private parts(order: any) {
    return order.items.filter((i: any) => i.type === 'part');
  }

  private partRef(i: any): string {
    return [i.part?.internalCode, i.part?.sku].filter(Boolean).join(' / ') || '—';
  }

  // Tabelas com valores (orçamento, O.S. do cliente, entrega).
  private valuedItems(order: any, withTech: boolean): string {
    const services = this.services(order);
    const parts = this.parts(order);
    const tech = (i: any) => (withTech ? `<td class="small">${e(i.assignedUser?.name || '—')}</td>` : '');
    const techTh = withTech ? '<th style="width:16%">Técnico</th>' : '';
    const discount = (i: any) => (Number(i.discount) > 0 ? money(i.discount) : '—');
    const servicesHtml = services.length
      ? `<div class="sec">Serviços</div>
<table><thead><tr><th>Descrição</th>${techTh}<th class="c" style="width:7%">Qtd</th><th class="r" style="width:13%">Unitário</th><th class="r" style="width:11%">Desconto</th><th class="r" style="width:13%">Total</th></tr></thead>
<tbody>${services.map((i: any) => `<tr><td>${e(i.service?.name || i.description)}${i.type === 'labor' ? ' <span class="small muted">(mão de obra)</span>' : ''}</td>${tech(i)}<td class="c">${qty(i.quantity)}</td><td class="r">${money(i.unitPrice)}</td><td class="r">${discount(i)}</td><td class="r">${money(i.totalPrice)}</td></tr>`).join('')}</tbody></table>`
      : '';
    const partsHtml = parts.length
      ? `<div class="sec">Peças</div>
<table><thead><tr><th style="width:15%">Código / Ref.</th><th>Descrição</th><th class="c" style="width:7%">Qtd</th><th class="r" style="width:13%">Unitário</th><th class="r" style="width:11%">Desconto</th><th class="r" style="width:13%">Total</th></tr></thead>
<tbody>${parts.map((i: any) => `<tr><td class="small">${e(this.partRef(i))}</td><td>${e(i.part?.name || i.description)}</td><td class="c">${qty(i.quantity)}</td><td class="r">${money(i.unitPrice)}</td><td class="r">${discount(i)}</td><td class="r">${money(i.totalPrice)}</td></tr>`).join('')}</tbody></table>`
      : '';
    return servicesHtml + partsHtml || '<div class="box muted">Nenhum item lançado.</div>';
  }

  private totals(order: any, extra: Array<[string, number]> = []): string {
    const services = Number(order.totalServices || 0) + Number(order.totalLabor || 0);
    const parts = Number(order.totalParts || 0);
    const itemDiscounts = order.items.reduce((s: number, i: any) => s + Number(i.discount || 0), 0);
    const total = Number(order.totalCost || 0);
    const rows: Array<[string, string, string?]> = [
      ['Serviços', money(services)],
      ['Peças', money(parts)],
    ];
    if (itemDiscounts > 0) rows.push(['Descontos nos itens (já deduzidos)', `− ${money(itemDiscounts)}`]);
    if (Number(order.totalDiscount) > 0) rows.push(['Desconto geral', `− ${money(order.totalDiscount)}`]);
    rows.push(['TOTAL', money(total), 'grand']);
    extra.forEach(([k, v]) => rows.push([k, money(v)]));
    return `<table class="totals">${rows.map(([k, v, cls]) => `<tr${cls ? ` class="${cls}"` : ''}><td>${e(k)}</td><td class="r">${v}</td></tr>`).join('')}</table>`;
  }

  private stageDates(order: any): string {
    const d = (x?: Date | null) => (x ? formatDateTimeBR(x) : '—');
    return `<table class="kv"><tr><td>Abertura</td><td>${d(order.createdAt)}</td><td>Aprovação</td><td>${d(order.approvedAt)}</td></tr>
<tr><td>Conclusão</td><td>${d(order.completedAt)}</td><td>Entrega</td><td>${d(order.deliveredAt)}</td></tr></table>`;
  }

  // ─── ENTRADA (vistoria) ───────────────────────────────────────────────────

  private entrada(ctx: Ctx, issuerName?: string): string {
    const { order, settings } = ctx;
    const ck = order.checklists.find((c: any) => c.type === 'ENTRADA');
    let vistoria: string;
    if (!ck) {
      vistoria = `<div class="box muted">Vistoria de entrada não registrada no sistema. Anotar avarias à mão:<br/><br/><br/><br/></div>`;
    } else {
      const byArea = new Map<string, any>(ck.items.map((i: any) => [i.area, i]));
      const accKeys = new Set(CHECKLIST_ACCESSORIES.map((a) => a.key));
      const bodyItems = ck.items.filter((i: any) => !accKeys.has(i.area));
      const damaged = bodyItems.filter((i: any) => i.condition !== 'OK');
      const okCount = bodyItems.length - damaged.length;
      const damagedHtml = damaged.length
        ? `<table><thead><tr><th style="width:30%">Região</th><th style="width:16%">Condição</th><th>Observação</th></tr></thead><tbody>${damaged
            .map((i: any) => `<tr><td>${e(CHECKLIST_AREA_LABEL[i.area] || i.area)}</td><td><b>${e(CHECKLIST_CONDITION_LABEL[i.condition] || i.condition)}</b></td><td>${e(i.notes || '')}</td></tr>`)
            .join('')}</tbody></table>`
        : '<div class="box">Nenhuma avaria registrada nas regiões vistoriadas.</div>';
      const accHtml = `<table><thead><tr><th>Acessório / objeto</th><th class="c" style="width:14%">Situação</th><th>Observação</th></tr></thead><tbody>${CHECKLIST_ACCESSORIES.map((a) => {
        const it = byArea.get(a.key);
        const status = !it ? '<span class="muted">não verificado</span>' : it.condition === 'OK' ? '<b>Presente</b>' : 'Ausente';
        return `<tr><td>${e(a.label)}</td><td class="c">${status}</td><td>${e(it?.notes || '')}</td></tr>`;
      }).join('')}</tbody></table>`;
      const photos = ck.items.flatMap((i: any) =>
        (i.photos || []).map((p: any) => ({ p, label: CHECKLIST_AREA_LABEL[i.area] || CHECKLIST_ACCESSORIES.find((a) => a.key === i.area)?.label || i.area })),
      );
      const photoSrc = (p: any) => (String(p.data).startsWith('http') || String(p.data).startsWith('data:') ? p.data : `data:${p.mimeType || 'image/jpeg'};base64,${p.data}`);
      const photosHtml = photos.length
        ? `<div class="sec">Fotos da vistoria (${photos.length})</div><div class="photos">${photos
            .map(({ p, label }: any) => `<figure><img src="${e(photoSrc(p))}" alt="" /><figcaption>${e(label)}</figcaption></figure>`)
            .join('')}</div>`
        : '';
      vistoria = `
<table class="kv"><tr><td>Combustível</td><td>${e(FUEL_LEVEL_LABEL[ck.fuelLevel] ?? String(ck.fuelLevel))}</td><td>Vistoriado por</td><td>${e(ck.completedBy || '—')}</td></tr>
<tr><td>Entregue por</td><td>${e(ck.ownerName || order.customer.name)}${ck.ownerType === 'DELEGADO' ? ' (terceiro)' : ''}</td><td>Regiões sem avaria</td><td>${okCount} de ${bodyItems.length} verificada(s)</td></tr></table>
<div class="sec">Avarias encontradas</div>${damagedHtml}
<div class="sec">Acessórios e objetos no veículo</div>${accHtml}
${ck.observations ? this.textSection('Observações da vistoria', ck.observations) : ''}
${photosHtml}`;
    }
    const consultant = ck?.completedBy || issuerName;
    return `
${this.clientVehicle(ctx)}
${this.textSection('Reclamação inicial', order.complaint || null, 3)}
${order.scheduledDate ? `<table class="kv"><tr><td>Agendamento</td><td>${formatDateTimeBR(order.scheduledDate)}</td></tr></table>` : ''}
<div class="sec">Vistoria de entrada</div>
${vistoria}
<div class="legal">${e(settings.belongingsText)}</div>
<div class="legal">Declaro que as informações acima conferem com o estado do veículo no momento da entrega à oficina.</div>
${this.signatures([
  { role: 'Cliente', name: ck?.ownerName || order.customer.name },
  { role: 'Consultor / recepção', name: consultant },
])}`;
  }

  // ─── ORÇAMENTO ────────────────────────────────────────────────────────────

  private async orcamento(ctx: Ctx): Promise<string> {
    const { order, settings } = ctx;
    const validUntil = order.approvalTokenExpires || addDays(new Date(order.createdAt), settings.budgetValidityDays);
    const approved = order.approvedAt && order.approvalStatus !== 'REJECTED';
    let approval = '';
    if (approved) {
      approval = `<div class="approved">Orçamento aprovado em ${formatDateTimeBR(order.approvedAt)}${order.approvedBy ? ` por ${e(order.approvedBy)}` : ''}.</div>`;
    } else if (order.approvalToken && (!order.approvalTokenExpires || new Date(order.approvalTokenExpires) > new Date())) {
      const link = `${(process.env.FRONTEND_URL || 'https://sigmaauto.com.br').replace(/\/+$/, '')}/aprovacao/${order.approvalToken}`;
      const qr = await QRCode.toDataURL(link, { margin: 1, width: 240 });
      approval = `<div class="qr"><img src="${qr}" alt="QR code" /><div><b>Aprove ou recuse pelo celular</b><br/><span class="small">Aponte a câmera para o código ou acesse:</span><br/><span class="small">${e(link)}</span></div></div>`;
    }
    return `
${this.clientVehicle(ctx)}
${this.textSection('Reclamação inicial', order.complaint)}
${this.textSection('Diagnóstico técnico', order.diagnosis)}
${this.textSection('Laudo / Solução', order.technicalReport)}
${this.valuedItems(order, false)}
${this.totals(order)}
<table class="kv"><tr><td>Validade do orçamento</td><td>${formatDateBR(validUntil)}</td><td>Condição de pagamento</td><td>${e(order.paymentMethod || 'A combinar')}</td></tr></table>
${this.textSection('Observações', order.observations)}
${approval}
<div class="legal">${e(settings.authorizationText)}</div>
${this.signatures([
  { role: 'Cliente — autorização', name: order.customer.name },
  { role: 'Data', name: approved ? formatDateBR(order.approvedAt) : '____/____/________' },
])}`;
  }

  // ─── O.S. (via do cliente, com valores) ───────────────────────────────────

  private osCliente(ctx: Ctx): string {
    const { order } = ctx;
    const techs = [...new Set(order.items.map((i: any) => i.assignedUser?.name).filter(Boolean))] as string[];
    return `
${this.clientVehicle(ctx)}
${this.stageDates(order)}
${this.textSection('Reclamação inicial', order.complaint)}
${this.textSection('Diagnóstico técnico', order.diagnosis)}
${this.valuedItems(order, true)}
${this.totals(order)}
${this.textSection('Laudo / Solução', order.technicalReport)}
${this.textSection('Observações', order.observations)}
${this.signatures([
  { role: 'Técnico responsável', name: techs.join(', ') || order.mechanic?.name },
  { role: 'Cliente', name: order.customer.name },
])}`;
  }

  // ─── O.S. via da OFICINA (sem valores) ────────────────────────────────────

  private oficina(ctx: Ctx): string {
    const { order } = ctx;
    const services = this.services(order);
    const parts = this.parts(order);
    const techs = [...new Set(order.items.map((i: any) => i.assignedUser?.name).filter(Boolean))] as string[];
    const servicesHtml = `<div class="sec">Serviços a executar</div>
<table><thead><tr><th class="c" style="width:6%">Feito</th><th>Serviço</th><th class="c" style="width:8%">Qtd</th><th style="width:22%">Técnico</th></tr></thead>
<tbody>${services.length ? services.map((i: any) => `<tr><td class="c"><span class="check"></span></td><td>${e(i.service?.name || i.description)}</td><td class="c">${qty(i.quantity)}</td><td>${e(i.assignedUser?.name || '')}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">Nenhum serviço lançado.</td></tr>'}</tbody></table>`;
    const partsHtml = `<div class="sec">Peças a aplicar</div>
<table><thead><tr><th class="c" style="width:6%">Aplic.</th><th style="width:18%">Código / Ref.</th><th>Peça</th><th class="c" style="width:8%">Qtd</th><th style="width:16%">Local estoque</th></tr></thead>
<tbody>${parts.length ? parts.map((i: any) => `<tr><td class="c"><span class="check"></span></td><td class="small">${e(this.partRef(i))}</td><td>${e(i.part?.name || i.description)}</td><td class="c">${qty(i.quantity)}</td><td class="small">${e(i.part?.location || '')}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Nenhuma peça lançada.</td></tr>'}</tbody></table>`;
    return `
${this.clientVehicle(ctx)}
${order.scheduledDate ? `<table class="kv"><tr><td>Agendamento</td><td>${formatDateTimeBR(order.scheduledDate)}</td></tr></table>` : ''}
${this.textSection('Reclamação inicial', order.complaint || null, 2)}
${this.textSection('Diagnóstico técnico', order.diagnosis)}
${this.textSection('Laudo / Solução', order.technicalReport)}
${servicesHtml}
${partsHtml}
${this.textSection('Observações', order.observations)}
<div class="sec">Anotações do técnico</div><div class="box"><br/><br/><br/><br/></div>
${this.signatures(
  (techs.length ? techs : [order.mechanic?.name || '']).map((name) => ({ role: 'Técnico', name })),
)}`;
  }

  // ─── TERMO DE ENTREGA E GARANTIA ──────────────────────────────────────────

  private async entrega(ctx: Ctx): Promise<string> {
    const { order, settings } = ctx;
    // A O.S. faturada está paga pelo total: o faturamento lança a receita única da O.S.
    const total = Number(order.totalCost || 0);
    const paid = order.paidAt ? total : 0;
    const balance = Math.max(0, total - paid);
    const deliveredAt: Date = order.deliveredAt ? new Date(order.deliveredAt) : new Date();
    const warrantyServices = addDays(deliveredAt, settings.warrantyDaysServices);
    const warrantyParts = addDays(deliveredAt, settings.warrantyDaysParts);
    const hasParts = this.parts(order).length > 0;
    const exit = order.checklists.find((c: any) => c.type === 'SAIDA');
    return `
${this.clientVehicle(ctx, { kmSaida: true })}
${this.stageDates(order)}
${this.textSection('Laudo / Solução', order.technicalReport)}
${this.valuedItems(order, true)}
${this.totals(order, [['Valor pago', paid], ['Saldo a pagar', balance]])}
<table class="kv"><tr><td>Forma de pagamento</td><td>${e(order.paymentMethod || '—')}</td><td>Data da entrega</td><td>${formatDateBR(deliveredAt)}</td></tr></table>
<div class="sec">Garantia</div>
<table class="kv">
  <tr><td>Serviços</td><td>${settings.warrantyDaysServices} dias — até <b>${formatDateBR(warrantyServices)}</b></td></tr>
  ${hasParts ? `<tr><td>Peças</td><td>${settings.warrantyDaysParts} dias — até <b>${formatDateBR(warrantyParts)}</b></td></tr>` : ''}
</table>
<div class="legal">${e(fillWarrantyText(settings))}</div>
${hasParts ? `<table class="kv"><tr><td>Peças substituídas</td><td><span class="check"></span> devolvidas ao cliente &nbsp;&nbsp; <span class="check"></span> descartadas pela oficina</td></tr></table>` : ''}
${exit ? `<table class="kv"><tr><td>Vistoria de saída</td><td>Realizada${exit.completedBy ? ` por ${e(exit.completedBy)}` : ''} · combustível ${e(FUEL_LEVEL_LABEL[exit.fuelLevel] ?? String(exit.fuelLevel))}</td></tr></table>` : ''}
<div class="legal">Declaro que recebi o veículo com os serviços acima executados, em condições de uso, e que tomei conhecimento das condições de garantia.</div>
${this.signatures([
  { role: 'Cliente — retirada', name: exit?.ownerName || order.customer.name },
  { role: 'Oficina', name: this.companyName(order.tenant) },
])}`;
  }
}
