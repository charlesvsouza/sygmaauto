import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, FileText } from 'lucide-react';
import type { MetrologiaData } from './MetrologiaModal';

// ─── Estilos do documento ──────────────────────────────────────────────────────
const DOC_STYLES = `
.laudo {
  font-family: Arial, sans-serif;
  font-size: 9pt;
  color: #111;
  width: 100%;
}
.laudo table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.laudo td, .laudo th {
  border: 0.5pt solid #aaa; padding: 3px 6px; font-size: 8.5pt; vertical-align: top;
}
.laudo th { font-weight: 800; background: #f0f2f5; text-align: left; font-size: 8pt; }
.laudo .hdr td, .laudo .hdr th {
  background: #1e293b !important; color: #fff !important;
  border-color: #1e293b !important; font-weight: 900;
  text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.08em;
  padding: 4px 8px;
}
.laudo .amber-hdr td, .laudo .amber-hdr th {
  background: #78350f !important; color: #fef3c7 !important;
  border-color: #78350f !important; font-weight: 900;
  text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.08em;
  padding: 4px 8px;
}
.laudo .tc { text-align: center; }
.laudo .tr { text-align: right; }
.laudo hr { border: none; border-top: 1pt solid #bbb; margin: 6px 0; }
.laudo .section-title {
  font-weight: 900; font-size: 8pt; text-transform: uppercase;
  letter-spacing: 0.05em; background: #f0f2f5;
  padding: 3px 6px; border: 0.5pt solid #aaa; margin-bottom: 0;
}
.laudo .sign-box {
  border-top: 1pt solid #333;
  margin-top: 30pt;
  padding-top: 3px;
  text-align: center;
  font-size: 8pt;
  color: #555;
}
`;

const PREVIEW_STYLE = `body { padding: 12mm; background: #fff; } ${DOC_STYLES}`;
const PRINT_STYLE   = `${DOC_STYLES} @page { size: A4; margin: 8mm 10mm; }`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: string | number | undefined | null, fallback = '—') {
  return v != null && v !== '' ? String(v) : fallback;
}

function fmtDate(iso: string | undefined | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtMM(v: string | number | undefined | null) {
  const n = Number(v);
  if (isNaN(n) || v === '' || v == null) return '—';
  return n.toFixed(3);
}

// ─── Builder do HTML do laudo ─────────────────────────────────────────────────
function buildLaudoHtml(os: any, metrologia: MetrologiaData | null, tenant: any): string {
  const isMotorAvulso = !os.vehicleId && !os.vehicle;
  const motorLabel = isMotorAvulso
    ? `${fmt(os.motorBrand)} ${fmt(os.motorModel)} — Serial: ${fmt(os.motorSerial)}`
    : `${fmt(os.vehicle?.brand)} ${fmt(os.vehicle?.model)} (${fmt(os.vehicle?.plate)})`;

  const osNum = os.id.slice(-6).toUpperCase();

  // Items da OS (serviços/peças)
  const items: any[] = os.items ?? [];
  const servicos = items.filter((i: any) => i.type === 'SERVICE' || i.itemType === 'SERVICE' || !i.type);
  const pecas    = items.filter((i: any) => i.type === 'PART'    || i.itemType === 'PART');

  // Cilindros
  const cilindros = metrologia?.cilindros ?? [];

  const cilindrosRows = cilindros.map((cyl, i) => `
    <tr>
      <td class="tc">${i + 1}</td>
      <td class="tc">${fmtMM(cyl.diametroNominal)}</td>
      <td class="tc">${fmtMM(cyl.diametroMedido)}</td>
      <td class="tc">${fmtMM(cyl.ovalização)}</td>
      <td class="tc">${fmtMM(cyl.conicidade)}</td>
      <td class="tc">${fmtMM(cyl.folga)}</td>
    </tr>
  `).join('');

  const servicosRows = servicos.length
    ? servicos.map((s: any) => `
        <tr>
          <td>${fmt(s.description || s.name || s.serviceName)}</td>
          <td class="tc">${fmt(s.quantity, '1')}</td>
          <td class="tr">R$ ${Number(s.unitPrice ?? s.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="tr">R$ ${Number(s.total ?? s.totalPrice ?? (s.quantity ?? 1) * (s.unitPrice ?? s.price ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" class="tc" style="color:#999;font-style:italic;">Nenhum serviço lançado</td></tr>`;

  const pecasRows = pecas.length
    ? pecas.map((p: any) => `
        <tr>
          <td>${fmt(p.description || p.name || p.partName)}</td>
          <td class="tc">${fmt(p.quantity, '1')}</td>
          <td class="tr">R$ ${Number(p.unitPrice ?? p.price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td class="tr">R$ ${Number(p.total ?? p.totalPrice ?? (p.quantity ?? 1) * (p.unitPrice ?? p.price ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')
    : '';

  const total = Number(os.totalCost ?? os.totalServices ?? 0);

  return `
<div class="laudo">

  <!-- Cabeçalho da Oficina -->
  <table style="margin-bottom:8px;">
    <tr>
      <td style="border:none; padding:0; width:60%;">
        <div style="font-size:16pt; font-weight:900; color:#1e293b; line-height:1.1;">${fmt(tenant?.name, 'Oficina')}</div>
        <div style="font-size:8pt; color:#555; margin-top:2px;">
          ${tenant?.phone ? `Tel: ${tenant.phone}` : ''}
          ${tenant?.email ? ` · ${tenant.email}` : ''}
        </div>
        ${tenant?.address ? `<div style="font-size:8pt; color:#555;">${tenant.address}</div>` : ''}
      </td>
      <td style="border:none; padding:0; text-align:right; vertical-align:top;">
        <div style="font-size:13pt; font-weight:900; color:#1e293b;">LAUDO TÉCNICO DE RETÍFICA</div>
        <div style="font-size:9pt; color:#555;">OS #${osNum}</div>
        <div style="font-size:8pt; color:#555;">Emitido em: ${new Date().toLocaleDateString('pt-BR')}</div>
      </td>
    </tr>
  </table>

  <hr/>

  <!-- Dados da OS / Motor -->
  <table>
    <tr class="hdr"><th colspan="4">Identificação</th></tr>
    <tr>
      <th style="width:22%">Cliente</th>
      <td style="width:28%">${fmt(os.customer?.name)}</td>
      <th style="width:22%">Data de entrada</th>
      <td>${fmtDate(os.createdAt)}</td>
    </tr>
    <tr>
      <th>${isMotorAvulso ? 'Motor / Equipamento' : 'Veículo'}</th>
      <td colspan="3">${motorLabel}</td>
    </tr>
    ${os.complaint ? `<tr><th>Reclamação / Queixa</th><td colspan="3">${os.complaint}</td></tr>` : ''}
    ${os.diagnosis  ? `<tr><th>Diagnóstico inicial</th><td colspan="3">${os.diagnosis}</td></tr>` : ''}
  </table>

  <!-- Metrologia -->
  ${metrologia ? `
  <table>
    <tr class="amber-hdr">
      <th colspan="6">Metrologia — ${metrologia.numeroCilindros} cilindros · Técnico: ${fmt(metrologia.tecnico)} · Leitura: ${fmtDate(metrologia.dataLeitura)}</th>
    </tr>
    <tr>
      <th class="tc" style="width:8%">Cil.</th>
      <th class="tc">Ø Nominal (mm)</th>
      <th class="tc">Ø Medido (mm)</th>
      <th class="tc">Ovalização (mm)</th>
      <th class="tc">Conicidade (mm)</th>
      <th class="tc">Folga Pistão (mm)</th>
    </tr>
    ${cilindrosRows}
    ${metrologia.observacoes ? `<tr><td colspan="6" style="background:#fffbeb; font-style:italic; color:#555;">Obs: ${metrologia.observacoes}</td></tr>` : ''}
  </table>
  ` : `
  <table>
    <tr class="amber-hdr"><th>Metrologia</th></tr>
    <tr><td style="color:#999; font-style:italic;">Ficha de metrologia não registrada.</td></tr>
  </table>
  `}

  <!-- Serviços executados -->
  <table>
    <tr class="hdr"><th colspan="4">Serviços Executados</th></tr>
    <tr>
      <th>Descrição</th>
      <th class="tc" style="width:8%">Qtd</th>
      <th class="tr" style="width:14%">Unit. (R$)</th>
      <th class="tr" style="width:14%">Total (R$)</th>
    </tr>
    ${servicosRows}
  </table>

  <!-- Peças -->
  ${pecas.length ? `
  <table>
    <tr class="hdr"><th colspan="4">Peças / Materiais</th></tr>
    <tr>
      <th>Descrição</th>
      <th class="tc" style="width:8%">Qtd</th>
      <th class="tr" style="width:14%">Unit. (R$)</th>
      <th class="tr" style="width:14%">Total (R$)</th>
    </tr>
    ${pecasRows}
  </table>
  ` : ''}

  <!-- Total -->
  <table style="margin-top:2px;">
    <tr>
      <td style="border:none;"></td>
      <td style="width:30%; background:#1e293b; color:#fff; font-weight:900; font-size:11pt; text-align:right; padding:5px 8px; border-color:#1e293b;">
        TOTAL: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  </table>

  <!-- Observações finais -->
  ${os.observations || os.technicalReport ? `
  <table style="margin-top:4px;">
    <tr class="hdr"><th>Observações Técnicas</th></tr>
    <tr><td>${os.technicalReport || os.observations}</td></tr>
  </table>
  ` : ''}

  <!-- Assinaturas -->
  <table style="margin-top: 24pt; border:none;">
    <tr style="border:none;">
      <td style="border:none; width:45%; padding: 0 8px;">
        <div class="sign-box">Técnico Responsável${metrologia?.tecnico ? ` — ${metrologia.tecnico}` : ''}</div>
      </td>
      <td style="border:none; width:10%;"></td>
      <td style="border:none; width:45%; padding: 0 8px;">
        <div class="sign-box">Cliente — ${fmt(os.customer?.name)}</div>
      </td>
    </tr>
  </table>

  <hr style="margin-top:16pt;"/>
  <p style="font-size:7pt; color:#999; text-align:center;">
    Documento emitido por ${fmt(tenant?.name)} · SygmaAuto · ${new Date().toLocaleString('pt-BR')}
  </p>
</div>
  `;
}

// ─── Componente ───────────────────────────────────────────────────────────────
interface Props {
  os:      any;
  tenant:  any;
  onClose: () => void;
}

export function LaudoRetificaModal({ os, tenant, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Extrai metrologia do campo notes
  let metrologia: MetrologiaData | null = null;
  try {
    const parsed = os.notes ? JSON.parse(os.notes) : null;
    metrologia = parsed?.metrologia ?? null;
  } catch { /* notas não são JSON */ }

  const html    = buildLaudoHtml(os, metrologia, tenant);
  const fullDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Laudo Retífica OS #${os.id.slice(-6).toUpperCase()}</title><style>${PREVIEW_STYLE}</style></head><body>${html}</body></html>`;

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    // Injeta o estilo de impressão e chama print
    const style = win.document.createElement('style');
    style.textContent = PRINT_STYLE;
    win.document.head.appendChild(style);
    win.focus();
    win.print();
    win.document.head.removeChild(style);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <FileText className="text-amber-400 w-5 h-5" />
              <div>
                <h2 className="text-white font-black text-lg">Laudo Técnico de Retífica</h2>
                <p className="text-slate-500 text-xs">
                  OS #{os.id.slice(-6).toUpperCase()} · {os.customer?.name ?? '—'}
                  {metrologia ? ` · ${metrologia.numeroCilindros} cilindros` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-black rounded-xl transition-all"
              >
                <Printer size={15} /> Imprimir / Salvar PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Preview iframe */}
          <iframe
            ref={iframeRef}
            srcDoc={fullDoc}
            title="Laudo Retífica"
            className="flex-1 w-full rounded-b-2xl bg-white"
            style={{ border: 'none' }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
