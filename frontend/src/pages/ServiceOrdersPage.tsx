import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceOrdersApi, customersApi, vehiclesApi, servicesApi, inventoryApi, tenantsApi, usersApi, checklistApi } from '../api/client';
import {
  ClipboardList, Plus, Search, Car, User, XCircle,
  Wrench, Package, FileText, Trash2, Layout, X,
  Printer, Save, Zap, Loader2, RefreshCw, FileUp, ChevronDown,
  ClipboardCheck, ShoppingCart, CheckCircle2, AlertTriangle, Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { ImportOSModal } from '../components/ImportOSModal';
import { ChecklistModal } from '../components/ChecklistModal';
import { canAccessFeature } from '../lib/planAccess';

const statusConfig: Record<string, { label: string; color: string; icon?: string }> = {
  ABERTA:               { label: 'Aberta',                color: 'bg-slate-100 text-slate-700' },
  ORCAMENTO:            { label: 'Aberta',                color: 'bg-slate-100 text-slate-700' }, // legado
  EM_DIAGNOSTICO:       { label: 'Em Diagnóstico',        color: 'bg-indigo-100 text-indigo-700' },
  ORCAMENTO_PRONTO:     { label: 'Orçamento Pronto',      color: 'bg-blue-100 text-blue-700' },
  AGUARDANDO_APROVACAO: { label: 'Aguardando Aprovação',  color: 'bg-orange-100 text-orange-700' },
  APROVADO:             { label: 'Aprovado',              color: 'bg-emerald-100 text-emerald-700' },
  REPROVADO:            { label: 'Reprovado',             color: 'bg-red-100 text-red-700' },
  AGUARDANDO_PECAS:     { label: 'Aguardando Peças',      color: 'bg-amber-100 text-amber-700' },
  EM_EXECUCAO:          { label: 'Em Execução',           color: 'bg-cyan-100 text-cyan-700' },
  PRONTO_ENTREGA:       { label: 'Pronto p/ Entrega',     color: 'bg-violet-100 text-violet-700' },
  FATURADO:             { label: 'Faturado',              color: 'bg-green-100 text-green-700' },
  ENTREGUE:             { label: 'Entregue',              color: 'bg-slate-900 text-white' },
  CANCELADO:            { label: 'Cancelado',             color: 'bg-red-100 text-red-700' },
};

const PAYMENT_METHODS = [
  'Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito',
  'Transferência Bancária', 'Boleto', 'Cheque', 'A Prazo / Parcelado',
];

// Fluxo de status permitidos (espelha o backend exato)
// ABERTA → EM_DIAGNOSTICO → ORCAMENTO_PRONTO → AGUARDANDO_APROVACAO
//   → APROVADO → [AGUARDANDO_PECAS →] EM_EXECUCAO → PRONTO_ENTREGA → FATURADO → ENTREGUE
const STATUS_FLOW_UI: Record<string, string[]> = {
  ABERTA:               ['EM_DIAGNOSTICO', 'CANCELADO'],
  ORCAMENTO:            ['EM_DIAGNOSTICO', 'ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO', 'CANCELADO'], // legado
  EM_DIAGNOSTICO:       ['ORCAMENTO_PRONTO', 'CANCELADO'],
  ORCAMENTO_PRONTO:     ['AGUARDANDO_APROVACAO', 'CANCELADO'],
  AGUARDANDO_APROVACAO: ['APROVADO', 'REPROVADO', 'CANCELADO'],
  APROVADO:             ['AGUARDANDO_PECAS', 'EM_EXECUCAO', 'CANCELADO'],
  REPROVADO:            ['CANCELADO'],
  AGUARDANDO_PECAS:     ['EM_EXECUCAO', 'CANCELADO'],
  EM_EXECUCAO:          ['PRONTO_ENTREGA', 'CANCELADO'],
  PRONTO_ENTREGA:       ['FATURADO', 'CANCELADO'],
  FATURADO:             ['ENTREGUE'],
  ENTREGUE:             [],
  CANCELADO:            [],
};

// Labels de ação para cada transição (mais descritivos do que o nome do status)
const STATUS_ACTION_LABEL: Record<string, string> = {
  EM_DIAGNOSTICO:       '🔍 Iniciar Diagnóstico',
  ORCAMENTO_PRONTO:     '📝 Orçamento Pronto',
  AGUARDANDO_APROVACAO: '📤 Enviar para Aprovação',
  APROVADO:             '✅ Marcar como Aprovado',
  REPROVADO:            '❌ Marcar como Reprovado',
  AGUARDANDO_PECAS:     '📦 Aguardar Peças',
  EM_EXECUCAO:          '🔧 Iniciar Execução',
  PRONTO_ENTREGA:       '🏁 Marcar Pronto p/ Entrega',
  FATURADO:             '💰 Registrar Pagamento',
  ENTREGUE:             '🚗 Confirmar Entrega',
  CANCELADO:            '⛔ Cancelar O.S.',
};

const FLOW_PHASES = [
  { key: 'ABERTURA',    label: 'Abertura',    statuses: ['ABERTA', 'ORCAMENTO'] },
  { key: 'DIAGNOSTICO', label: 'Diagnóstico', statuses: ['EM_DIAGNOSTICO'] },
  { key: 'ORCAMENTO',   label: 'Orçamento',   statuses: ['ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO'] },
  { key: 'APROVACAO',   label: 'Aprovação',   statuses: ['APROVADO', 'REPROVADO'] },
  { key: 'EXECUCAO',    label: 'Execução',    statuses: ['AGUARDANDO_PECAS', 'EM_EXECUCAO'] },
  { key: 'FINALIZACAO', label: 'Faturamento', statuses: ['PRONTO_ENTREGA', 'FATURADO'] },
  { key: 'ENTREGA',     label: 'Entrega',      statuses: ['ENTREGUE'] },
];

const DOC_STYLES = `
.os-doc {
  font-family: Arial, sans-serif;
  font-size: 9pt; color: #111; width: 100%;
}
.os-doc table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
.os-doc td, .os-doc th {
  border: 0.5pt solid #aaa; padding: 3px 6px; font-size: 8.5pt; vertical-align: top;
}
.os-doc th { font-weight: 800; background: #f0f2f5; text-align: left; font-size: 8pt; }
.os-doc .hdr td, .os-doc .hdr th {
  background: #1e293b !important; color: #fff !important;
  border-color: #1e293b !important; font-weight: 900;
  text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.08em;
  padding: 4px 8px;
}
.os-doc .subtotal-row td { background: #f8fafc; font-weight: 700; }
.os-doc .total-final td {
  font-weight: 900; font-size: 11pt;
  background: #1e293b !important; color: #fff !important;
  border-color: #1e293b !important;
}
.os-doc .nb td, .os-doc .nb th { border-color: transparent; padding: 0; }
.os-doc .tr { text-align: right; }
.os-doc .tc { text-align: center; }
.os-doc hr { border: none; border-top: 1px solid #bbb; margin: 5px 0; }
`;

const PRINT_STYLE = `
@media screen { #os-print-doc { display: none; } }
@media print {
  body * { visibility: hidden; }
  #os-print-doc, #os-print-doc * { visibility: visible; }
  #os-print-doc { position: absolute; left: 0; top: 0; width: 100%; background: white; }
  @page { size: A4; margin: 8mm 10mm; }
}
${DOC_STYLES}
`;

const PRINT_PREVIEW_STYLE = `body { padding: 10mm; background: #fff; } ${DOC_STYLES}`;

function fmtBR(v: number | string | undefined, dec = 2) {
  return Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function ServiceOrdersPage() {
  const { user, tenant } = useAuthStore();
  const navigate = useNavigate();
  const planName = tenant?.subscription?.plan?.name || 'START';
  const canUseChecklist = canAccessFeature(planName, 'CHECKLIST');
  const canManageStock = ['MASTER', 'ADMIN', 'MECANICO', 'PRODUTIVO'].includes(user?.role ?? '');
  const canDelete = user?.role === 'MASTER';
  const canChangeStatus = ['MASTER', 'ADMIN', 'GERENTE', 'CHEFE_OFICINA'].includes(user?.role ?? '');
  const canAssignExecutor = ['MASTER', 'ADMIN', 'CHEFE_OFICINA', 'GERENTE'].includes(user?.role ?? '');
  const CLOSED_STATUSES = ['FATURADO', 'ENTREGUE', 'CANCELADO', 'REPROVADO'];
  const printContentRef = useRef<HTMLDivElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [executors, setExecutors] = useState<any[]>([]);
  const [tenantFullData, setTenantFullData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newOrder, setNewOrder] = useState({ customerId: '', vehicleId: '', complaint: '', kmEntrada: 0, reserveStock: false, orderType: 'ORCAMENTO' });

  const [edit, setEdit] = useState({
    complaint: '', diagnosis: '', technicalReport: '',
    observations: '', notes: '', paymentMethod: '', reserveStock: false,
  });

  // Catalog state
  const [catalogMode, setCatalogMode] = useState<'service' | 'part' | null>(null);
  const [catalogItems, setCatalogItems] = useState<{ services: any[]; parts: any[] }>({ services: [], parts: [] });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [quickAdd, setQuickAdd] = useState({ description: '', unitPrice: '', quantity: '1' });
  const [partQties, setPartQties] = useState<Record<string, number>>({});
  const [quickAssignedUserId, setQuickAssignedUserId] = useState('');
  const [pendingQtyByItem, setPendingQtyByItem] = useState<Record<string, number>>({});
  const [syncingTotals, setSyncingTotals] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checklistModal, setChecklistModal] = useState<'ENTRADA' | 'SAIDA' | null>(null);
    const [checklistFlags, setChecklistFlags] = useState<{ ENTRADA: boolean; SAIDA: boolean }>({ ENTRADA: false, SAIDA: false });
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDiagBanner, setShowDiagBanner] = useState(false);
  const [creatingDiagOrder, setCreatingDiagOrder] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const isReprovado = selectedOrder?.status === 'REPROVADO';
  const isClosed = CLOSED_STATUSES.includes(selectedOrder?.status ?? '');

  // ─── Reserva de Peças ────────────────────────────────────────────────────
  const [showReserveParts, setShowReserveParts] = useState(false);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveResult, setReserveResult] = useState<any>(null);
  const [expectedPartsDate, setExpectedPartsDate] = useState('');
  const [showPurchaseOrderPdf, setShowPurchaseOrderPdf] = useState(false);
  const purchaseOrderFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!showStatusDropdown) return;
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showStatusDropdown]);

  useEffect(() => { loadOrders(); loadBasics(); }, []);

  const loadOrders = async () => {
    try {
      const res = await serviceOrdersApi.getAll();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBasics = async () => {
    try {
      const [cRes, vRes, tRes, uRes] = await Promise.all([
        customersApi.getAll(),
        vehiclesApi.getAll(),
        tenantsApi.getMe(),
        usersApi.getAll(),
      ]);
      setCustomers(cRes.data);
      setVehicles(vRes.data);
      setTenantFullData(tRes.data);
      setExecutors(
        (Array.isArray(uRes.data) ? uRes.data : []).filter((u: any) => u.isActive)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const selectOrder = async (order: any) => {
    try {
      const res = await serviceOrdersApi.getById(order.id);
      const o = res.data;
      setSelectedOrder(o);
      setShowDiagBanner(o.status === 'REPROVADO');
      setEdit({
        complaint: o.complaint || '',
        diagnosis: o.diagnosis || '',
        technicalReport: o.technicalReport || '',
        observations: o.observations || '',
        notes: o.notes || '',
        paymentMethod: o.paymentMethod || '',
        reserveStock: Boolean(o.reserveStock),
      });
      setPendingQtyByItem({});
          // Carrega status dos checklists
          if (canUseChecklist) {
            checklistApi.get(order.id).then((cr) => {
              const data = Array.isArray(cr.data) ? cr.data : [];
              setChecklistFlags({
                ENTRADA: data.some((c: any) => c.type === 'ENTRADA'),
                SAIDA: data.some((c: any) => c.type === 'SAIDA'),
              });
            }).catch(() => {});
          } else {
            setChecklistFlags({ ENTRADA: false, SAIDA: false });
          }
    } catch (err) {
      console.error(err);
    }
  };

  const createDiagnosticOrder = async () => {
    if (!selectedOrder) return;
    setCreatingDiagOrder(true);
    try {
      const res = await serviceOrdersApi.createDiagnosticOrder(selectedOrder.id);
      setShowDiagBanner(false);
      await loadOrders();
      await selectOrder(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar OS de diagnóstico');
    } finally {
      setCreatingDiagOrder(false);
    }
  };

  const saveDetails = async (closeAfterSave = false) => {
    if (!selectedOrder) return;
    try {
      await serviceOrdersApi.update(selectedOrder.id, edit);
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      loadOrders();
      if (closeAfterSave) {
        setSelectedOrder(null);
      }
      alert('Salvo com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar. Verifique o status da OS.');
    }
  };

  const recalculateTotals = async () => {
    if (!selectedOrder) return;

    const changedEntries = Object.entries(pendingQtyByItem).filter(([itemId, newQty]) => {
      const current = selectedOrder.items?.find((i: any) => i.id === itemId);
      return current && Number(newQty) > 0 && Number(newQty) !== Number(current.quantity);
    });

    const hasPartChangeWithoutPermission = changedEntries.some(([itemId]) => {
      const current = selectedOrder.items?.find((i: any) => i.id === itemId);
      return current?.type?.toLowerCase() === 'part' && !canManageStock;
    });

    if (hasPartChangeWithoutPermission) {
      alert('Somente MASTER e ADMIN podem alterar quantidade de pecas.');
      return;
    }

    setSyncingTotals(true);
    try {
      // 1. Aplica alterações de quantidade pendentes (se houver)
      if (changedEntries.length > 0) {
        await Promise.all(
          changedEntries.map(([itemId, newQty]) =>
            serviceOrdersApi.updateItem(selectedOrder.id, itemId, { quantity: Number(newQty) })
          )
        );
        setPendingQtyByItem({});
      }

      // 2. Sincroniza preços do catálogo (peças, serviços, perfil da oficina)
      await serviceOrdersApi.syncPrices(selectedOrder.id);

      // 3. Recarrega OS, clientes, veículos e dados da empresa
      const [res, cRes, vRes, tRes] = await Promise.all([
        serviceOrdersApi.getById(selectedOrder.id),
        customersApi.getAll(),
        vehiclesApi.getAll(),
        tenantsApi.getMe(),
      ]);
      setSelectedOrder(res.data);
      setCustomers(cRes.data);
      setVehicles(vRes.data);
      setTenantFullData(tRes.data);
      loadOrders();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao atualizar a O.S.');
    } finally {
      setSyncingTotals(false);
    }
  };

  const pendingChangesCount = Object.entries(pendingQtyByItem).filter(([itemId, newQty]) => {
    const current = selectedOrder?.items?.find((i: any) => i.id === itemId);
    return current && Number(newQty) > 0 && Number(newQty) !== Number(current.quantity);
  }).length;

  const openDeleteModal = () => {
    setDeleteConfirmInput('');
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    const expectedCode = selectedOrder.id.slice(0, 8).toUpperCase();
    if (deleteConfirmInput.trim().toUpperCase() !== expectedCode) return;
    setDeleting(true);
    try {
      await serviceOrdersApi.delete(selectedOrder.id, deleteReason.trim() || undefined);
      setShowDeleteModal(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao excluir a O.S.');
    } finally {
      setDeleting(false);
    }
  };

  const buildPrintPreviewHtml = () => {
    const content = printContentRef.current?.innerHTML || '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>OS</title><style>${PRINT_PREVIEW_STYLE}</style></head><body>${content}</body></html>`;
  };

  const openPrintPreview = () => {
    if (!selectedOrder) return;
    setShowPrintPreview(true);
  };

  const printOnlyOrder = () => {
    const frameWindow = printFrameRef.current?.contentWindow;
    if (!frameWindow) return;
    frameWindow.focus();
    frameWindow.print();
  };

  const getCurrentPhaseIndex = (status: string) => {
    const idx = FLOW_PHASES.findIndex((phase) => phase.statuses.includes(status));
    return idx >= 0 ? idx : 0;
  };

  const handleReserveParts = async () => {
    if (!selectedOrder) return;
    setReserveLoading(true);
    try {
      const res = await serviceOrdersApi.reserveParts(
        selectedOrder.id,
        expectedPartsDate || undefined,
      );
      setReserveResult(res.data);
      // Recarrega OS para refletir novos status/campos
      const updated = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(updated.data);
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao reservar peças');
    } finally {
      setReserveLoading(false);
    }
  };

  const buildPurchaseOrderHtml = (result: any) => {
    const t = result.tenant || {};
    const o = result.order || {};
    const items = result.missingItems || [];
    const now = new Date().toLocaleDateString('pt-BR');
    const rows = items.map((item: any) => `
      <tr>
        <td>${item.internalCode || '—'}</td>
        <td>${item.sku || '—'}</td>
        <td>${item.description}</td>
        <td style="text-align:center">${item.lacking}</td>
        <td style="text-align:right">R$ ${Number(item.costPrice ?? item.unitPrice ?? 0).toFixed(2).replace('.', ',')}</td>
        <td style="text-align:right">R$ ${(Number(item.costPrice ?? item.unitPrice ?? 0) * item.lacking).toFixed(2).replace('.', ',')}</td>
        <td>${item.supplierName || '—'}</td>
        <td>${o.id?.slice(0,8).toUpperCase() || '—'}</td>
      </tr>
    `).join('');
    const total = items.reduce((s: number, item: any) => s + Number(item.costPrice ?? item.unitPrice ?? 0) * item.lacking, 0);
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Pedido de Compra ${result.purchaseOrderNumber}</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 9pt; color: #111; padding: 16px; }
      .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
      .company-name { font-size: 15pt; font-weight: 900; }
      .doc-box { border: 2px solid #1e293b; padding: 8px 14px; text-align: right; min-width: 160px; }
      .doc-box .doc-type { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #666; }
      .doc-box .doc-num { font-size: 16pt; font-weight: 900; font-family: monospace; letter-spacing: 2px; }
      hr { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #1e293b; color: #fff; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .5px; padding: 4px 6px; text-align: left; }
      td { padding: 4px 6px; font-size: 8.5pt; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
      tr:nth-child(even) td { background: #f8fafc; }
      .total-row td { font-weight: 900; border-top: 2px solid #1e293b; border-bottom: none; }
      .sig { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 4px; font-size: 8pt; color: #555; text-align: center; }
      .preview-label { font-size: 7pt; color: #94a3b8; margin-top: 2px; }
      @media print { body { padding: 8px; } }
    </style></head><body>
      <div class="header-row">
        <div>
          <div class="company-name">${t.name || ''}</div>
          ${t.document ? `<div>${t.document}</div>` : ''}
          ${t.address ? `<div>${t.address}</div>` : ''}
          <div>${[t.phone ? 'Tel: ' + t.phone : '', t.email].filter(Boolean).join(' · ')}</div>
        </div>
        <div class="doc-box">
          <div class="doc-type">Pedido de Compra</div>
          <div class="doc-num">${result.purchaseOrderNumber || ''}</div>
          <div style="font-size:8.5pt;margin-top:4px">Data: ${now}</div>
          ${result.expectedPartsDate ? `<div style="font-size:8.5pt">Prev. Chegada: ${new Date(result.expectedPartsDate).toLocaleDateString('pt-BR')}</div>` : ''}
        </div>
      </div>
      <hr />
      <div style="font-size:8pt;margin-bottom:6px">
        <strong>Veículo:</strong> ${(o.vehicle as any)?.brand || ''} ${(o.vehicle as any)?.model || ''} — Placa <strong>${(o.vehicle as any)?.plate || ''}</strong>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <strong>Cliente:</strong> ${(o.customer as any)?.name || ''}
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <strong>OS:</strong> ${o.id?.slice(0,8).toUpperCase() || ''}
      </div>
      <table>
        <thead><tr>
          <th style="width:80px">Cód. Interno</th>
          <th style="width:80px">Cód. Original</th>
          <th>Peça / Descrição</th>
          <th style="width:50px;text-align:center">Qtd</th>
          <th style="width:80px;text-align:right">Unitário</th>
          <th style="width:90px;text-align:right">Total</th>
          <th style="width:100px">Fornecedor</th>
          <th style="width:70px">Nº OS</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="5" style="text-align:right">Total Estimado</td>
          <td style="text-align:right">R$ ${total.toFixed(2).replace('.', ',')}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
      <div class="sig">Assinatura / Aprovação: _________________________________  &nbsp;&nbsp;&nbsp; Data: ___________</div>
      <div class="preview-label" style="text-align:center;margin-top:8px">Gerado em ${now} · SigmaAuto</div>
    </body></html>`;
  };

  const changeStatus = async (status: string, adminOverride = false) => {
    if (!selectedOrder) return;
    try {
      await serviceOrdersApi.updateStatus(selectedOrder.id, { status, ...(adminOverride && { adminOverride: true }) });
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      setShowDiagBanner(res.data.status === 'REPROVADO');
      loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao alterar status');
    }
  };

  const openCatalog = async (mode: 'service' | 'part') => {
    try {
      const [sRes, pRes] = await Promise.all([servicesApi.getAll(), inventoryApi.getAllParts()]);
      setCatalogItems({
        services: Array.isArray(sRes.data) ? sRes.data : [],
        parts: Array.isArray(pRes.data) ? pRes.data : [],
      });
      setCatalogMode(mode);
      setCatalogSearch('');
      setPartQties({});
      setQuickAssignedUserId(selectedOrder?.mechanicId || '');
      setQuickAdd({ description: '', unitPrice: '', quantity: '1' });
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = async (itemData: any) => {
    if (!selectedOrder) return;
    if (itemData?.type === 'part' && !canManageStock) {
      alert('Somente MASTER e ADMIN podem alterar estoque de pecas.');
      return;
    }
    try {
      await serviceOrdersApi.addItem(selectedOrder.id, itemData);
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      loadOrders();
      setCatalogMode(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao adicionar item. Verifique o estoque disponível.');
    }
  };

  const quickAddItem = async () => {
    const price = parseFloat(quickAdd.unitPrice.replace(',', '.'));
    const qty = parseFloat(quickAdd.quantity) || 1;
    if (!quickAdd.description.trim()) { alert('Informe a descrição.'); return; }
    if (!price || price <= 0) { alert('Informe um preço válido.'); return; }
    await addItem({
      type: catalogMode,
      description: quickAdd.description.trim(),
      quantity: qty,
      unitPrice: price,
      ...(catalogMode === 'service' && quickAssignedUserId ? { assignedUserId: quickAssignedUserId } : {}),
    });
  };

  const updateItem = async (itemId: string, data: any) => {
    if (!selectedOrder) return;
    const current = selectedOrder.items?.find((i: any) => i.id === itemId);
    if (current?.type?.toLowerCase() === 'part' && !canManageStock) {
      alert('Somente MASTER e ADMIN podem alterar estoque de pecas.');
      return;
    }
    try {
      await serviceOrdersApi.updateItem(selectedOrder.id, itemId, data);
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      loadOrders();
    } catch (err) { console.error(err); }
  };

  const removeItem = async (itemId: string) => {
    if (!selectedOrder || !confirm('Remover este item? O estoque será estornado.')) return;
    const current = selectedOrder.items?.find((i: any) => i.id === itemId);
    if (current?.type?.toLowerCase() === 'part' && !canManageStock) {
      alert('Somente MASTER e ADMIN podem alterar estoque de pecas.');
      return;
    }
    try {
      await serviceOrdersApi.removeItem(selectedOrder.id, itemId);
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      loadOrders();
    } catch (err) { console.error(err); }
  };

  // Normalise type to lowercase for filtering (seed uses uppercase)
  const itemsOf = (type: string) =>
    (selectedOrder?.items ?? []).filter((i: any) => i.type?.toLowerCase() === type);

  const serviceItems = [...itemsOf('service'), ...itemsOf('labor')];
  const partItems = itemsOf('part');
  const executorOptions = executors.filter((u: any) =>
    ['MASTER', 'ADMIN', 'CHEFE_OFICINA', 'MECANICO', 'PRODUTIVO'].includes(String(u.role || '').toUpperCase())
  );
  const nextStatuses = selectedOrder ? (STATUS_FLOW_UI[selectedOrder.status] ?? []) : [];

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.vehicle?.plate?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
      <style>{PRINT_STYLE}</style>

      {/* ── PRINT DOCUMENT ─────────────────────────────────────────── */}
      <div id="os-print-doc">
        {selectedOrder && (
          <div ref={printContentRef} className="os-doc">
            {/* Cabeçalho: empresa (esq) + tipo/número do documento (dir) */}
            <table style={{ marginBottom: '6px' }}>
              <tbody>
                <tr>
                  <td style={{ border: 'none', paddingLeft: 0, verticalAlign: 'top', width: '62%' }}>
                    <div style={{ fontSize: '15pt', fontWeight: 900, lineHeight: 1.1 }}>
                      {tenantFullData?.name ?? ''}
                    </div>
                    {(tenantFullData?.taxId || tenantFullData?.document) && (
                      <div style={{ fontSize: '8.5pt', marginTop: '2px' }}>
                        {tenantFullData?.companyType ?? 'CNPJ'}: {tenantFullData?.taxId || tenantFullData?.document}
                      </div>
                    )}
                    {tenantFullData?.address && (
                      <div style={{ fontSize: '8.5pt' }}>{tenantFullData.address}</div>
                    )}
                    <div style={{ fontSize: '8.5pt' }}>
                      {tenantFullData?.phone && `Tel: ${tenantFullData.phone}`}
                      {tenantFullData?.phone && tenantFullData?.email && '  ·  '}
                      {tenantFullData?.email}
                    </div>
                  </td>
                  <td style={{ border: '2px solid #1e293b', padding: '8px 14px', textAlign: 'right', verticalAlign: 'top', minWidth: '155px' }}>
                    <div style={{ fontSize: '7.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#666' }}>
                      {selectedOrder.orderType === 'ORCAMENTO' ? 'Orçamento' : 'Ordem de Serviço'}
                    </div>
                    <div style={{ fontSize: '19pt', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '2px', lineHeight: 1.1 }}>
                      {selectedOrder.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '8.5pt', color: '#444', marginTop: '3px' }}>
                      Abertura: {new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    {selectedOrder.scheduledDate && (
                      <div style={{ fontSize: '8.5pt', color: '#444' }}>
                        Agendamento: {new Date(selectedOrder.scheduledDate).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    <div style={{ fontSize: '8.5pt', color: '#444' }}>
                      Tipo O.S.: {selectedOrder.orderType === 'ORCAMENTO' ? 'Orçamento' : 'OS'}
                    </div>
                    {(selectedOrder.paymentMethod || edit.paymentMethod) && (
                      <div style={{ fontSize: '8.5pt', color: '#444' }}>
                        Cond. Pgto: {selectedOrder.paymentMethod || edit.paymentMethod}
                      </div>
                    )}
                    {selectedOrder.kmEntrada != null && (
                      <div style={{ fontSize: '8.5pt', color: '#444' }}>
                        KM Entrada: {Number(selectedOrder.kmEntrada).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <hr />

            {/* Dados do Cliente */}
            <table>
              <tbody>
                <tr className="hdr"><td colSpan={4}>DADOS DO CLIENTE</td></tr>
                <tr>
                  <td colSpan={2}><strong>Nome / Razão Social:</strong> {selectedOrder.customer?.name}</td>
                  <td><strong>CPF / CNPJ:</strong> {selectedOrder.customer?.document || '—'}</td>
                  <td><strong>Telefone:</strong> {selectedOrder.customer?.phone || '—'}</td>
                </tr>
                {(selectedOrder.customer?.address || selectedOrder.customer?.email) && (
                  <tr>
                    <td colSpan={3}><strong>Endereço:</strong> {selectedOrder.customer?.address || '—'}</td>
                    <td><strong>E-mail:</strong> {selectedOrder.customer?.email || '—'}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Dados do Veículo */}
            <table>
              <tbody>
                <tr className="hdr"><td colSpan={6}>DADOS DO VEÍCULO</td></tr>
                <tr>
                  <td colSpan={2}><strong>Marca / Modelo:</strong> {selectedOrder.vehicle?.brand} {selectedOrder.vehicle?.model}</td>
                  <td><strong>Ano:</strong> {selectedOrder.vehicle?.year || '—'}</td>
                  <td><strong>Cor:</strong> {selectedOrder.vehicle?.color || '—'}</td>
                  <td><strong>Placa:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 900 }}>{selectedOrder.vehicle?.plate || '—'}</span></td>
                  <td><strong>KM:</strong> {selectedOrder.vehicle?.km ? Number(selectedOrder.vehicle.km).toLocaleString('pt-BR') : '—'}</td>
                </tr>
                {selectedOrder.vehicle?.vin && (
                  <tr><td colSpan={6}><strong>Chassi / VIN:</strong> {selectedOrder.vehicle.vin}</td></tr>
                )}
              </tbody>
            </table>

            {/* Queixa / Diagnóstico / Laudo */}
            {(selectedOrder.complaint || selectedOrder.diagnosis || selectedOrder.technicalReport) && (
              <table>
                <tbody>
                  {selectedOrder.complaint && <>
                    <tr className="hdr"><td>RECLAMAÇÃO DO CLIENTE</td></tr>
                    <tr><td style={{ minHeight: '22px' }}>{selectedOrder.complaint}</td></tr>
                  </>}
                  {selectedOrder.diagnosis && <>
                    <tr className="hdr"><td>DIAGNÓSTICO TÉCNICO</td></tr>
                    <tr><td style={{ minHeight: '22px' }}>{selectedOrder.diagnosis}</td></tr>
                  </>}
                  {selectedOrder.technicalReport && <>
                    <tr className="hdr"><td>LAUDO / SOLUÇÃO APLICADA</td></tr>
                    <tr><td style={{ minHeight: '22px' }}>{selectedOrder.technicalReport}</td></tr>
                  </>}
                </tbody>
              </table>
            )}

            {/* Serviços */}
            {serviceItems.length > 0 && (
              <table>
                <thead>
                  <tr className="hdr"><td colSpan={5}>SERVIÇOS / MÃO DE OBRA</td></tr>
                  <tr>
                    <th className="tc" style={{ width: '28px' }}>#</th>
                    <th>Descrição</th>
                    <th className="tc" style={{ width: '60px' }}>Qtd/Hrs</th>
                    <th className="tr" style={{ width: '90px' }}>Vl. Unit.</th>
                    <th className="tr" style={{ width: '95px' }}>Vl. Total</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceItems.map((item: any, idx: number) => (
                    <tr key={item.id}>
                      <td className="tc" style={{ color: '#888', fontSize: '7.5pt' }}>{idx + 1}</td>
                      <td>{item.description}</td>
                      <td className="tc">{Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                      <td className="tr">R$ {fmtBR(item.unitPrice)}</td>
                      <td className="tr">R$ {fmtBR(item.totalPrice ?? item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Peças e Materiais */}
            {partItems.length > 0 && (
              <table>
                <thead>
                  <tr className="hdr"><td colSpan={6}>PEÇAS E MATERIAIS</td></tr>
                  <tr>
                    <th className="tc" style={{ width: '28px' }}>#</th>
                    <th style={{ width: '80px' }}>Referência</th>
                    <th>Descrição</th>
                    <th className="tc" style={{ width: '50px' }}>Qtd</th>
                    <th className="tr" style={{ width: '90px' }}>Vl. Unit.</th>
                    <th className="tr" style={{ width: '95px' }}>Vl. Total</th>
                  </tr>
                </thead>
                <tbody>
                  {partItems.map((item: any, idx: number) => (
                    <tr key={item.id}>
                      <td className="tc" style={{ color: '#888', fontSize: '7.5pt' }}>{idx + 1}</td>
                      <td style={{ fontSize: '7.5pt', color: '#555', fontFamily: 'monospace' }}>{item.part?.internalCode || item.internalCode || '—'}</td>
                      <td>{item.description}</td>
                      <td className="tc">{Number(item.quantity).toLocaleString('pt-BR')}</td>
                      <td className="tr">R$ {fmtBR(item.unitPrice)}</td>
                      <td className="tr">R$ {fmtBR(item.totalPrice ?? item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Observações + Totais lado a lado */}
            <table>
              <tbody>
                <tr className="nb">
                  {/* Esquerda: observações */}
                  <td style={{ border: 'none', width: '55%', verticalAlign: 'top', paddingRight: '10px' }}>
                    <table>
                      <tbody>
                        <tr className="hdr"><td>OBSERVAÇÕES</td></tr>
                        <tr>
                          <td style={{ minHeight: '38px', fontSize: '8.5pt', whiteSpace: 'pre-wrap' }}>
                            {selectedOrder.observations || selectedOrder.notes || ''}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>

                  {/* Direita: totais */}
                  <td style={{ border: 'none', verticalAlign: 'top' }}>
                    <table>
                      <tbody>
                        <tr className="subtotal-row">
                          <td className="tr">Total Serviços</td>
                          <td className="tr" style={{ width: '110px' }}>R$ {fmtBR(selectedOrder.totalServices)}</td>
                        </tr>
                        <tr className="subtotal-row">
                          <td className="tr">Total Produtos</td>
                          <td className="tr">R$ {fmtBR(selectedOrder.totalParts)}</td>
                        </tr>
                        {Number(selectedOrder.totalLabor) > 0 && (
                          <tr className="subtotal-row">
                            <td className="tr">Mão de Obra</td>
                            <td className="tr">R$ {fmtBR(selectedOrder.totalLabor)}</td>
                          </tr>
                        )}
                        {Number(selectedOrder.totalDiscount) > 0 && (
                          <tr>
                            <td className="tr" style={{ color: '#b91c1c' }}>Desconto</td>
                            <td className="tr" style={{ color: '#b91c1c' }}>− R$ {fmtBR(selectedOrder.totalDiscount)}</td>
                          </tr>
                        )}
                        <tr className="total-final">
                          <td className="tr">TOTAL GERAL</td>
                          <td className="tr">R$ {fmtBR(selectedOrder.totalCost)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Autorização + Assinatura */}
            <div style={{ marginTop: '14px', fontSize: '8pt', color: '#333', lineHeight: 1.5 }}>
              Autorizo os serviços e a substituição das peças deste{' '}
              {selectedOrder.orderType === 'ORCAMENTO' ? 'ORÇAMENTO' : 'documento'}, e o necessário
              teste de rua com o veículo. Estou ciente que a empresa não se responsabiliza pela perda
              ou roubo de qualquer objeto que se encontra no interior do veículo.
            </div>
            <table style={{ marginTop: '16px' }}>
              <tbody>
                <tr>
                  <td style={{ border: 'none', textAlign: 'center', paddingTop: '36px', width: '50%' }}>
                    <div style={{ borderTop: '1px solid #666', display: 'inline-block', width: '210px', marginBottom: '3px' }} />
                    <br /><span style={{ fontSize: '9pt', fontWeight: 700 }}>Assinatura do Cliente</span>
                    <br /><span style={{ fontSize: '8pt', color: '#555' }}>Data: _____ / _____ / ____________</span>
                  </td>
                  <td style={{ border: 'none', textAlign: 'center', paddingTop: '36px', width: '50%' }}>
                    <div style={{ borderTop: '1px solid #666', display: 'inline-block', width: '210px', marginBottom: '3px' }} />
                    <br /><span style={{ fontSize: '9pt', fontWeight: 700 }}>Consultor Técnico</span>
                    <br /><span style={{ fontSize: '8pt', color: '#555' }}>Nome: _________________________________</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #ddd', fontSize: '7pt', color: '#aaa', textAlign: 'center' }}>
              Documento gerado em {new Date().toLocaleString('pt-BR')} · Sigma Auto — Sistema de Gestão para Oficinas Automotivas
            </div>
          </div>
        )}
      </div>

      {/* ── LISTA DE OS ────────────────────────────────────────────── */}
      <div className="w-80 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-900 flex items-center gap-2 uppercase text-xs tracking-tight">
              <ClipboardList size={16} /> Ordens de Serviço
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
                title="Importar de Orçamento PDF"
              >
                <FileUp size={18} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar por placa ou cliente..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:ring-4 focus:ring-slate-900/5 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}
          {filteredOrders.map((order) => {
            const st = statusConfig[order.status] ?? statusConfig.ABERTA;
            const active = selectedOrder?.id === order.id;
            return (
              <div
                key={order.id}
                onClick={() => selectOrder(order)}
                className={cn(
                  'p-4 cursor-pointer transition-all hover:bg-slate-50',
                  active && 'bg-primary-50/30 border-l-4 border-l-primary-600'
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono font-black text-slate-400">#{order.id.slice(0, 8)}</span>
                  <div className={cn('w-2 h-2 rounded-full', st.color.split(' ')[0])} />
                </div>
                <p className="font-bold text-slate-900 text-sm truncate leading-none mb-1">{order.customer?.name}</p>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2">
                  {order.vehicle?.plate} · {order.vehicle?.model}
                </p>
                <div className="flex justify-between items-center">
                  <span className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md', st.color)}>
                    {st.label}
                  </span>
                  <span className="text-xs font-black text-slate-900">
                    R$ {fmtBR(order.totalCost)}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredOrders.length === 0 && !loading && (
            <p className="p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
              Nenhuma OS encontrada
            </p>
          )}
        </div>
      </div>

      {/* ── DETALHE DA OS ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {!selectedOrder ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-50">
            <Layout size={64} className="mb-4 stroke-[1px]" />
            <p className="font-bold uppercase tracking-widest text-xs">Selecione uma Ordem de Serviço</p>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="mb-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OS</span>
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openPrintPreview}
                  className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                >
                  <Printer size={15} /> Visualizar / Imprimir OS
                </button>
                {/* Botões de Checklist — verde quando já preenchido */}
                <button
                  onClick={() => canUseChecklist && setChecklistModal('ENTRADA')}
                  disabled={!canUseChecklist}
                  className={cn(
                    'h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all',
                    !canUseChecklist
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : checklistFlags.ENTRADA
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
                  )}
                  title={!canUseChecklist ? 'Disponível no plano PRO e REDE' : checklistFlags.ENTRADA ? 'Checklist de entrada preenchido — clique para editar' : 'Preencher checklist de entrada'}
                >
                  <ClipboardCheck size={15} />
                  Entrada
                  {canUseChecklist && checklistFlags.ENTRADA && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5 shrink-0" />}
                </button>
                <button
                  onClick={() => canUseChecklist && setChecklistModal('SAIDA')}
                  disabled={!canUseChecklist}
                  className={cn(
                    'h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all',
                    !canUseChecklist
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : checklistFlags.SAIDA
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
                  )}
                  title={!canUseChecklist ? 'Disponível no plano PRO e REDE' : checklistFlags.SAIDA ? 'Checklist de saída preenchido — clique para editar' : 'Preencher checklist de saída'}
                >
                  <ClipboardCheck size={15} />
                  Saída
                  {canUseChecklist && checklistFlags.SAIDA && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5 shrink-0" />}
                </button>
                <button
                  onClick={() => navigate('/service-orders')}
                  className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X size={15} /> Fechar
                </button>
                <button
                  onClick={() => saveDetails(false)}
                  disabled={isClosed}
                  className="h-10 px-5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  title={isClosed ? 'OS finalizada não pode ser editada' : undefined}
                >
                  <Save size={15} /> Salvar alterações
                </button>
                {canDelete && (
                  <button
                    onClick={openDeleteModal}
                    className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                    title="Excluir O.S. permanentemente (somente MASTER)"
                  >
                    <Trash2 size={15} /> Excluir O.S.
                  </button>
                )}
              </div>
            </div>

            {/* Banner: OS reprovada + opção de diagnóstico */}
            {isReprovado && showDiagBanner && (
              <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔍</span>
                  <div>
                    <p className="text-sm font-black text-amber-900">Orçamento reprovado pelo cliente</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Deseja abrir uma nova O.S. para cobrança da <strong>Taxa de Diagnóstico</strong>?
                      O valor e o tempo serão preenchidos automaticamente conforme as configurações da oficina.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={createDiagnosticOrder}
                    disabled={creatingDiagOrder}
                    className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-black hover:bg-amber-700 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
                  >
                    {creatingDiagOrder ? <Loader2 size={12} className="animate-spin" /> : '✅'} Sim, criar nova O.S.
                  </button>
                  <button
                    onClick={() => setShowDiagBanner(false)}
                    className="px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-xs font-black hover:bg-amber-50 transition-all whitespace-nowrap"
                  >
                    Não, obrigado
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">

              {/* Andamento da O.S. */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Andamento da O.S.</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                    Fase atual: {FLOW_PHASES[getCurrentPhaseIndex(selectedOrder.status)]?.label || 'Abertura'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
                  {FLOW_PHASES.map((phase, index) => {
                    const currentIdx = getCurrentPhaseIndex(selectedOrder.status);
                    const isCurrent = index === currentIdx;
                    const isDone = index < currentIdx;
                    return (
                      <div key={phase.key} className={cn(
                        'rounded-xl border px-3 py-2 text-center transition-all',
                        isCurrent && 'border-primary-600 bg-primary-50 text-primary-700',
                        isDone && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                        !isCurrent && !isDone && 'border-slate-200 bg-white text-slate-400'
                      )}>
                        <p className="text-[9px] font-black uppercase tracking-wider">{phase.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cliente + Veículo */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User size={13} className="text-slate-900" /> Dados do Cliente
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Nome / Razão Social</p>
                      <p className="font-black text-slate-900">{selectedOrder.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Telefone</p>
                      <p className="font-bold text-slate-700 text-sm">{selectedOrder.customer?.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Documento</p>
                      <p className="font-bold text-slate-700 text-sm">{selectedOrder.customer?.document || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-[10px] font-black text-primary-400 uppercase tracking-widest flex items-center gap-2">
                      <Car size={13} /> Dados do Veículo
                    </h3>
                    <div className="relative" ref={statusDropdownRef}>
                      {canChangeStatus ? (
                        <button
                          onClick={() => setShowStatusDropdown((v) => !v)}
                          title="Clique para alterar o status"
                          className={cn(
                            'text-[9px] px-2 py-0.5 rounded-md font-black flex items-center gap-1 transition-all hover:ring-2 hover:ring-offset-1 hover:ring-slate-300 cursor-pointer',
                            statusConfig[selectedOrder.status]?.color
                          )}
                        >
                          {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}
                          <ChevronDown size={9} className={cn('transition-transform', showStatusDropdown && 'rotate-180')} />
                        </button>
                      ) : (
                        <span className={cn('text-[9px] px-2 py-0.5 rounded-md font-black', statusConfig[selectedOrder.status]?.color)}>
                          {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}
                        </span>
                      )}

                      {showStatusDropdown && (
                        <div className="absolute top-full right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 min-w-[210px]">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-1.5 border-b border-slate-100 mb-1">
                            Alterar Status
                          </p>
                          {Object.entries(statusConfig)
                            .filter(([key]) => key !== selectedOrder.status && key !== 'ORCAMENTO')
                            .map(([key, cfg]) => {
                              const isNegative = key === 'CANCELADO' || key === 'REPROVADO';
                              return (
                                <button
                                  key={key}
                                  onClick={async () => {
                                    setShowStatusDropdown(false);
                                    if (isNegative && !confirm(`Confirmar mudança para: ${cfg.label}?`)) return;
                                    await changeStatus(key, true);
                                  }}
                                  className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-slate-50 text-left',
                                    isNegative ? 'text-red-600 hover:bg-red-50' : 'text-slate-700'
                                  )}
                                >
                                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.color.split(' ')[0])} />
                                  {cfg.label}
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Veículo</p>
                      <p className="font-black text-white">{selectedOrder.vehicle?.brand} {selectedOrder.vehicle?.model}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Placa</p>
                      <p className="font-mono font-black text-primary-400">{selectedOrder.vehicle?.plate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Ano / Cor</p>
                      <p className="font-bold text-white text-sm">{selectedOrder.vehicle?.year || '—'} / {selectedOrder.vehicle?.color || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">KM Atual</p>
                      <p className="font-bold text-white text-sm">{selectedOrder.vehicle?.km ? Number(selectedOrder.vehicle.km).toLocaleString('pt-BR') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">KM Entrada</p>
                      <p className="font-bold text-white text-sm">{selectedOrder.kmEntrada ? Number(selectedOrder.kmEntrada).toLocaleString('pt-BR') : '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campos texto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['complaint', 'diagnosis', 'technicalReport'] as const).map((field, i) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {['Reclamação Inicial', 'Diagnóstico Técnico', 'Laudo / Solução'][i]}
                    </label>
                    <textarea
                      value={edit[field]}
                      onChange={(e) => setEdit({ ...edit, [field]: e.target.value })}
                      readOnly={isReprovado}
                      className={`w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all resize-none ${isReprovado ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reserva de Peças no Orçamento</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Quando marcado, sinaliza a reserva das peças para esta O.S. Na aprovação do orçamento, todas as peças pendentes serão debitadas do estoque automaticamente.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(edit.reserveStock)}
                    onChange={(e) => setEdit({ ...edit, reserveStock: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  <span className="text-xs font-bold text-slate-700">Reservar</span>
                </label>
              </div>

              {/* Serviços */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Wrench size={14} /> Serviços Realizados
                    <span className="bg-slate-200 text-slate-700 rounded-md px-1.5 py-0.5 text-[9px] font-black">{serviceItems.length}</span>
                  </h3>
                  <button
                    onClick={() => openCatalog('service')}
                    className="text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Adicionar Serviço
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3 border-b border-slate-100">Descrição</th>
                      <th className="px-5 py-3 border-b border-slate-100 w-56">Executor</th>
                      <th className="px-5 py-3 border-b border-slate-100 w-20 text-center">Qtd/Hrs</th>
                      <th className="px-5 py-3 border-b border-slate-100 w-28">Unitário</th>
                      <th className="px-5 py-3 border-b border-slate-100 w-28 text-right">Subtotal</th>
                      <th className="px-5 py-3 border-b border-slate-100 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {serviceItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-bold text-slate-900">{item.description}</td>
                        <td className="px-5 py-3">
                          <select
                            value={item.assignedUserId || ''}
                            onChange={(e) => {
                              const nextUserId = e.target.value;
                              if (!nextUserId) return;
                              updateItem(item.id, { assignedUserId: nextUserId });
                            }}
                            disabled={isClosed || !canAssignExecutor}
                            className={cn(
                              'w-full rounded-lg border px-2 py-1.5 text-[11px] font-bold',
                              isClosed || !canAssignExecutor
                                ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-white border-slate-200'
                            )}
                          >
                            <option value="">Selecionar executor...</option>
                            {executorOptions.map((u: any) => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number" step="0.5" min="0.5"
                            className="w-16 bg-slate-50 border border-transparent hover:border-slate-200 rounded-md px-2 py-1 text-center font-bold text-xs"
                            value={pendingQtyByItem[item.id] ?? item.quantity}
                            onChange={(e) => setPendingQtyByItem({ ...pendingQtyByItem, [item.id]: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-5 py-3 text-slate-600">R$ {fmtBR(item.unitPrice)}</td>
                        <td className="px-5 py-3 font-black text-slate-900 text-right">R$ {fmtBR(item.totalPrice)}</td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => removeItem(item.id)} className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {serviceItems.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-400 text-xs">Nenhum serviço lançado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Peças */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} /> Peças e Materiais
                    <span className="bg-slate-200 text-slate-700 rounded-md px-1.5 py-0.5 text-[9px] font-black">{partItems.length}</span>
                  </h3>
                  <button
                    onClick={() => openCatalog('part')}
                    className={cn(
                      'text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1',
                      canManageStock ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-slate-300 text-slate-500'
                    )}
                    title={canManageStock ? 'Lancar peca' : 'Somente MASTER/ADMIN podem alterar estoque'}
                  >
                    <Plus size={12} /> Lançar Peça
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3 border-b border-slate-100">Descrição</th>
                      <th className="px-5 py-3 border-b border-slate-100 w-20 text-center">Qtd</th>
                      <th className="px-5 py-3 border-b border-slate-100 w-28">Unitário</th>
                      <th className="px-5 py-3 border-b border-slate-100 w-28 text-right">Subtotal</th>
                      <th className="px-5 py-3 border-b border-slate-100 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {partItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-bold text-slate-900">
                          <div>{item.description}</div>
                          <div className="mt-1 text-[10px] text-slate-500 font-bold">
                            Estoque atual: <span className={cn('font-black', Number(item.part?.currentStock || 0) > 0 ? 'text-emerald-600' : 'text-red-600')}>{Number(item.part?.currentStock || 0)}</span>
                            {' · '}Status: {item.applied ? 'Baixada' : 'Pendente'}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number" min="1"
                            disabled={isClosed || !canManageStock}
                            className={cn(
                              'w-16 border border-transparent rounded-md px-2 py-1 text-center font-bold text-xs',
                              isClosed || !canManageStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 hover:border-slate-200'
                            )}
                            value={pendingQtyByItem[item.id] ?? item.quantity}
                            onChange={(e) => setPendingQtyByItem({ ...pendingQtyByItem, [item.id]: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-5 py-3 text-slate-600">R$ {fmtBR(item.unitPrice)}</td>
                        <td className="px-5 py-3 font-black text-slate-900 text-right">R$ {fmtBR(item.totalPrice)}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={isClosed || !canManageStock}
                            className={cn('p-1 rounded transition-colors', isClosed || !canManageStock ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-red-500')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {partItems.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-6 text-center text-slate-400 text-xs">Nenhuma peça lançada</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ações + Pagamento + Totais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">

                {/* Avançar status */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avançar Status</h4>
                  <div className="flex flex-col gap-1.5">
                    {nextStatuses.length === 0 && (
                      <p className="text-[10px] font-bold text-slate-400">Fluxo encerrado para este status.</p>
                    )}
                    {nextStatuses.map((status) => {
                      const isCancel = status === 'CANCELADO';
                      const isReprovadoBtn = status === 'REPROVADO';
                      const isNegative = isCancel || isReprovadoBtn;
                      return (
                        <button
                          key={status}
                          onClick={() => {
                            if (isNegative && !confirm(`Confirmar: ${STATUS_ACTION_LABEL[status] || status}?`)) return;
                            changeStatus(status);
                          }}
                          className={cn(
                            'w-full px-3 py-2 rounded-xl text-[10px] font-black tracking-wide transition-all text-left',
                            isNegative
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              : 'bg-slate-900 text-white hover:bg-slate-700 shadow-sm'
                          )}
                        >
                          {STATUS_ACTION_LABEL[status] || statusConfig[status]?.label || status}
                        </button>
                      );
                    })}

                    {/* Botão Reservar Peças — visível em APROVADO e AGUARDANDO_PECAS com peças na OS */}
                    {['APROVADO', 'AGUARDANDO_PECAS'].includes(selectedOrder?.status) && partItems.length > 0 && (
                      <button
                        onClick={() => { setReserveResult(null); setExpectedPartsDate(''); setShowReserveParts(true); }}
                        className="w-full px-3 py-2 rounded-xl text-[10px] font-black tracking-wide transition-all text-left bg-amber-500 text-white hover:bg-amber-600 shadow-sm flex items-center gap-1.5"
                      >
                        <ShoppingCart size={12} />
                        {selectedOrder?.partsReserved ? 'Rever Pedido de Peças' : 'Verificar / Reservar Peças'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Forma de pagamento */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Forma de Pagamento</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setEdit({ ...edit, paymentMethod: pm })}
                        className={cn(
                          'px-2.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all border text-left leading-tight',
                          edit.paymentMethod === pm
                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                        )}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Totais */}
                <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl flex flex-col gap-3">
                  <button
                    onClick={recalculateTotals}
                    disabled={syncingTotals}
                    className="mb-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-slate-700 disabled:opacity-60"
                  >
                    {syncingTotals ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Atualizar O.S.
                  </button>
                  {[
                    { label: 'Serviços', val: selectedOrder.totalServices },
                    { label: 'Peças', val: selectedOrder.totalParts },
                    ...(Number(selectedOrder.totalLabor) > 0 ? [{ label: 'Mão de Obra', val: selectedOrder.totalLabor }] : []),
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>{label}</span>
                      <span>R$ {fmtBR(val)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1">Total da Ordem</p>
                    <p className="text-3xl font-black tracking-tight">R$ {fmtBR(selectedOrder.totalCost)}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MODAL RESERVA DE PEÇAS ───────────────────────────────── */}
      <AnimatePresence>
        {showReserveParts && selectedOrder && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!reserveLoading) setShowReserveParts(false); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[88vh] overflow-hidden">

              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                    <ShoppingCart size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Reserva de Peças</h3>
                    <p className="text-[10px] text-slate-500 font-semibold">OS {selectedOrder.id.slice(0,8).toUpperCase()} · {partItems.length} peça(s) na OS</p>
                  </div>
                </div>
                <button onClick={() => { if (!reserveLoading) setShowReserveParts(false); }} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {!reserveResult ? (
                  <>
                    {/* Lista de peças */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Peças desta OS</p>
                      {partItems.map((item: any) => {
                        const stock = Number(item.part?.currentStock ?? 0);
                        const needed = Math.ceil(Number(item.quantity));
                        const ok = stock >= needed;
                        return (
                          <div key={item.id} className={cn('flex items-center justify-between rounded-xl px-3 py-2 border text-xs', ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')}>
                            <div className="flex items-center gap-2">
                              {ok ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> : <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">{item.description}</p>
                                {item.part?.internalCode && <p className="text-slate-400 text-[10px]">Cód: {item.part.internalCode}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-slate-700">Nec: {needed}</p>
                              <p className={cn('text-[10px] font-bold', ok ? 'text-emerald-600' : 'text-red-600')}>Estoque: {stock}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Data prevista chegada */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={11} /> Data prevista de chegada (para peças faltantes)
                      </label>
                      <input
                        type="date"
                        value={expectedPartsDate}
                        min={new Date().toISOString().slice(0,10)}
                        onChange={(e) => setExpectedPartsDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <p className="text-[10px] text-slate-400">Opcional. Peças disponíveis serão reservadas imediatamente. Peças faltantes gerarão um Pedido de Compra.</p>
                    </div>

                    <button
                      onClick={handleReserveParts}
                      disabled={reserveLoading}
                      className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {reserveLoading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
                      {reserveLoading ? 'Processando...' : 'Confirmar Reserva'}
                    </button>
                  </>
                ) : (
                  /* Resultado da reserva */
                  <div className="space-y-4">
                    {/* Resumo */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-black text-emerald-600">{reserveResult.reserved}</p>
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Reservadas</p>
                        <p className="text-[9px] text-emerald-600 mt-0.5">Baixadas do estoque</p>
                      </div>
                      <div className={cn('border rounded-2xl p-4 text-center', reserveResult.missing > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200')}>
                        <p className={cn('text-2xl font-black', reserveResult.missing > 0 ? 'text-red-600' : 'text-slate-400')}>{reserveResult.missing}</p>
                        <p className={cn('text-[10px] font-bold uppercase tracking-wide', reserveResult.missing > 0 ? 'text-red-700' : 'text-slate-500')}>Faltantes</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{reserveResult.missing > 0 ? 'Pedido gerado' : 'Tudo disponível'}</p>
                      </div>
                    </div>

                    {/* Peças faltantes */}
                    {reserveResult.missingItems?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pedido de Compra</p>
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">{reserveResult.purchaseOrderNumber}</span>
                        </div>
                        {reserveResult.missingItems.map((item: any, i: number) => (
                          <div key={i} className="flex items-start justify-between rounded-xl px-3 py-2 bg-red-50 border border-red-200 text-xs">
                            <div>
                              <p className="font-bold text-slate-900">{item.description}</p>
                              <p className="text-slate-400 text-[10px]">Cód: {item.internalCode || '—'} · Orig: {item.sku || '—'} · Fornec: {item.supplierName || '—'}</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="font-black text-red-700">Falta: {item.lacking}</p>
                              <p className="text-[10px] text-slate-500">Estoque: {item.inStock}</p>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => setShowPurchaseOrderPdf(true)}
                          className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs tracking-wide flex items-center justify-center gap-2 hover:bg-slate-700 transition-all"
                        >
                          <Printer size={14} /> Imprimir Pedido de Compra
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setShowReserveParts(false)}
                      className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black text-xs tracking-wide hover:bg-slate-200 transition-all"
                    >
                      Fechar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL PDF PEDIDO DE COMPRA ────────────────────────────── */}
      <AnimatePresence>
        {showPurchaseOrderPdf && reserveResult && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPurchaseOrderPdf(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative flex flex-col w-full max-w-5xl h-[90vh] rounded-[2rem] overflow-hidden bg-white shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Pedido de Compra — {reserveResult.purchaseOrderNumber}</h3>
                  <p className="text-xs text-slate-500 font-semibold">Peças faltantes para a OS {selectedOrder?.id.slice(0,8).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowPurchaseOrderPdf(false)} className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all">Voltar</button>
                  <button onClick={() => purchaseOrderFrameRef.current?.contentWindow?.print()} className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-1.5">
                    <Printer size={13} /> Imprimir
                  </button>
                </div>
              </div>
              <iframe
                ref={purchaseOrderFrameRef}
                title="Pedido de Compra"
                srcDoc={buildPurchaseOrderHtml({ ...reserveResult, expectedPartsDate: expectedPartsDate || null })}
                className="flex-1 w-full bg-slate-200"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL CATÁLOGO ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showPrintPreview && selectedOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintPreview(false)} className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Visualização da Ordem de Serviço</h3>
                  <p className="text-xs font-semibold text-slate-500">Somente a O.S. será impressa, sem os outros quadros da tela.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowPrintPreview(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100">
                    Voltar
                  </button>
                  <button onClick={printOnlyOrder} className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-all hover:bg-slate-800">
                    Imprimir O.S.
                  </button>
                </div>
              </div>
              <iframe
                ref={printFrameRef}
                title="Visualizacao da O.S."
                srcDoc={buildPrintPreviewHtml()}
                className="h-full w-full bg-slate-200"
              />
            </motion.div>
          </div>
        )}

        {catalogMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCatalogMode(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[88vh]">

              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white', catalogMode === 'service' ? 'bg-slate-900' : 'bg-primary-600')}>
                    {catalogMode === 'service' ? <Wrench size={20} /> : <Package size={20} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest">
                      {catalogMode === 'service' ? 'Adicionar Serviço' : 'Lançar Peça'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      {catalogMode === 'service' ? 'Catálogo ou lançamento avulso' : 'Catálogo ou peça avulsa'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setCatalogMode(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              {/* Quick Add */}
              <div className="p-4 border-b border-slate-100 bg-amber-50/60">
                <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Zap size={11} />
                  {catalogMode === 'service' ? 'Serviço avulso (não cadastrado)' : 'Peça avulsa (não cadastrada)'}
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Descrição *</label>
                    <input
                      type="text"
                      placeholder={catalogMode === 'service' ? 'Ex: Limpeza de bicos injetores' : 'Ex: Correia auxiliar Fiat Uno'}
                      value={quickAdd.description}
                      onChange={(e) => setQuickAdd({ ...quickAdd, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-bold focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">R$ *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={quickAdd.unitPrice}
                      onChange={(e) => setQuickAdd({ ...quickAdd, unitPrice: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-bold text-right focus:ring-2 focus:ring-amber-400 transition-all"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">{catalogMode === 'service' ? 'Qtd/Hrs' : 'Qtd'}</label>
                    <input
                      type="number"
                      min="0.5"
                      step={catalogMode === 'service' ? '0.5' : '1'}
                      value={quickAdd.quantity}
                      onChange={(e) => setQuickAdd({ ...quickAdd, quantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-bold text-center focus:ring-2 focus:ring-amber-400 transition-all"
                    />
                  </div>
                  <button
                    onClick={quickAddItem}
                    className="h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus size={13} /> Lançar
                  </button>
                </div>
                {catalogMode === 'service' && (
                  <div className="mt-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Executor do Serviço</label>
                    <select
                      value={quickAssignedUserId}
                      onChange={(e) => setQuickAssignedUserId(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs font-bold"
                    >
                      <option value="">Selecionar executor...</option>
                      {executorOptions.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder={`Pesquisar no catálogo de ${catalogMode === 'service' ? 'serviços' : 'peças'}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 text-sm font-bold focus:bg-white transition-all"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {catalogMode === 'service' && (
                  <>
                    {catalogItems.services
                      .filter((s) => s.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => addItem({
                            type: 'service',
                            serviceId: s.id,
                            description: s.name,
                            quantity: s.tmo || 1,
                            unitPrice: s.hourlyRate || s.basePrice || 0,
                            ...(quickAssignedUserId ? { assignedUserId: quickAssignedUserId } : {}),
                          })}
                          disabled={isClosed}
                          className="w-full p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-900 hover:shadow-md text-left transition-all group flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {s.tmo ? `TMO: ${s.tmo}h × R$ ${fmtBR(s.hourlyRate)}` : `R$ ${fmtBR(s.basePrice)}`}
                              {s.category && ` · ${s.category}`}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-all">
                            <Plus size={16} />
                          </div>
                        </button>
                      ))
                    }
                    {catalogItems.services.filter((s) => s.name.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-8">Nenhum serviço encontrado no catálogo</p>
                    )}
                  </>
                )}

                {catalogMode === 'part' && (
                  <>
                    {catalogItems.parts
                      .filter((p) =>
                        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                        p.internalCode?.toLowerCase().includes(catalogSearch.toLowerCase())
                      )
                      .map((p) => {
                        const qty = partQties[p.id] ?? 1;
                        const available = Number(p.currentStock || 0);
                        const notEnoughStock = qty > available;
                        return (
                          <div key={p.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                                {p.currentStock <= (p.minStock || 0) && (
                                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-red-100 text-red-600 rounded shrink-0">Estoque Baixo</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                {p.internalCode && `${p.internalCode} · `}
                                Estoque: <span className={cn('font-black', p.currentStock > 0 ? 'text-emerald-600' : 'text-red-600')}>{p.currentStock}</span>
                                {' · Mínimo: '}<span className="font-black text-slate-600">{p.minStock || 0}</span>
                                {' · '}R$ {fmtBR(p.unitPrice)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                                <button onClick={() => setPartQties({ ...partQties, [p.id]: Math.max(1, qty - 1) })} className="w-7 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-bold">−</button>
                                <span className="w-8 text-center text-sm font-black">{qty}</span>
                                <button onClick={() => setPartQties({ ...partQties, [p.id]: qty + 1 })} className="w-7 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-bold">+</button>
                              </div>
                              <button
                                onClick={() => addItem({ type: 'part', partId: p.id, description: p.name, quantity: qty, unitPrice: p.unitPrice })}
                                disabled={isClosed || !canManageStock || notEnoughStock}
                                title={isClosed ? 'OS finalizada não pode ser editada' : !canManageStock ? 'Somente MASTER/ADMIN podem alterar estoque' : notEnoughStock ? 'Quantidade maior que estoque disponível' : 'Adicionar peça'}
                                className={cn(
                                  'w-10 h-10 rounded-xl flex items-center justify-center shadow transition-all',
                                  !canManageStock || notEnoughStock
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'bg-primary-600 text-white hover:bg-primary-700'
                                )}
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    }
                    {!canManageStock && (
                      <p className="text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2 text-[11px] font-bold">
                        Apenas MASTER e ADMIN podem adicionar/remover pecas (altera estoque).
                      </p>
                    )}
                    {catalogItems.parts.filter((p) => p.name.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-8">Nenhuma peça encontrada no catálogo</p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL NOVA OS ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Nova OS</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
              </div>
              <form className="space-y-5" onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await serviceOrdersApi.create(newOrder);
                  setShowCreateModal(false);
                  setNewOrder({ customerId: '', vehicleId: '', complaint: '', kmEntrada: 0, reserveStock: false, orderType: 'ORCAMENTO' });
                  loadOrders();
                  selectOrder(res.data);
                } catch (err: any) { alert('Erro ao criar OS: ' + (err?.response?.data?.message || err?.message || 'Verifique os dados.')); }
              }}>
                {/* Tipo de documento */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'ORCAMENTO', label: '📋 Orçamento', desc: 'Aguarda aprovação do cliente' },
                    { value: 'ORDEM_SERVICO', label: '🔧 Ordem de Serviço', desc: 'Serviço já autorizado' },
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNewOrder({ ...newOrder, orderType: value })}
                      className={cn(
                        'flex flex-col items-start p-3 rounded-2xl border-2 text-left transition-all',
                        newOrder.orderType === value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      )}
                    >
                      <span className="text-xs font-black">{label}</span>
                      <span className={cn('text-[10px] mt-0.5', newOrder.orderType === value ? 'text-slate-300' : 'text-slate-400')}>{desc}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cliente *</label>
                  <select className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all" value={newOrder.customerId} onChange={(e) => setNewOrder({ ...newOrder, customerId: e.target.value, vehicleId: '' })} required>
                    <option value="">Selecione um cliente...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Veículo *</label>
                  <select className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all" value={newOrder.vehicleId} onChange={(e) => setNewOrder({ ...newOrder, vehicleId: e.target.value })} required>
                    <option value="">Selecione um veículo...</option>
                    {vehicles.filter((v) => v.customerId === newOrder.customerId).map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
                  </select>
                  {/* Aviso de OSs abertas para o veículo selecionado */}
                  {newOrder.vehicleId && (() => {
                    const CLOSED = ['FATURADO', 'ENTREGUE', 'CANCELADO', 'REPROVADO'];
                    const openForVehicle = orders.filter(
                      (o) => o.vehicleId === newOrder.vehicleId && !CLOSED.includes(o.status)
                    );
                    if (openForVehicle.length === 0) return null;
                    return (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-medium space-y-1">
                        <p>
                          ⚠️ Este veículo já possui <strong>{openForVehicle.length}</strong> O.S/orçamento{openForVehicle.length > 1 ? 's' : ''} em aberto:
                          {openForVehicle.map((o: any) => (
                            <span key={o.id} className="ml-1 font-mono font-black">#{o.id.slice(0, 8).toUpperCase()}</span>
                          ))}
                        </p>
                        <p className="text-amber-600">Você pode criar múltiplos orçamentos/OSs para o mesmo veículo. Verifique se não é duplicata.</p>
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">KM Entrada</label>
                  <input type="number" className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all" value={newOrder.kmEntrada} onChange={(e) => setNewOrder({ ...newOrder, kmEntrada: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Reclamação Principal</label>
                  <textarea className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all h-24 resize-none" value={newOrder.complaint} onChange={(e) => setNewOrder({ ...newOrder, complaint: e.target.value })} placeholder="O que o cliente relatou?" />
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(newOrder.reserveStock)}
                    onChange={(e) => setNewOrder({ ...newOrder, reserveStock: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                  Reservar peças para debitar automaticamente na aprovação
                </label>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg active:scale-95 transition-all">Criar Ordem</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {showImportModal && (
        <ImportOSModal 
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => {
            loadOrders();
            alert('OS Importada com sucesso!');
          }} 
        />
      )}

      {/* Modais de Checklist */}
      {canUseChecklist && checklistModal && selectedOrder && (
        <ChecklistModal
          serviceOrderId={selectedOrder.id}
          orderNumber={selectedOrder.orderNumber}
          type={checklistModal}
          onClose={() => setChecklistModal(null)}
          onSaved={() => {
            setChecklistFlags((prev) => ({ ...prev, [checklistModal]: true }));
            setChecklistModal(null);
          }}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && selectedOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Excluir O.S.</h2>
                <p className="text-xs text-slate-500 font-medium">Esta ação é irreversível</p>
              </div>
            </div>

            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-700 font-medium space-y-1">
              <p><span className="font-black">OS:</span> #{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              <p><span className="font-black">Status atual:</span> {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}</p>
              <p><span className="font-black">Total:</span> R$ {fmtBR(selectedOrder.totalCost)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                Motivo da exclusão (opcional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Orçamento duplicado, erro de cadastro..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                Digite o número da O.S. para confirmar:
                <span className="ml-2 font-mono text-slate-900">#{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value.toUpperCase())}
                placeholder={`Digite ${selectedOrder.id.slice(0, 8).toUpperCase()}`}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteOrder}
                disabled={deleteConfirmInput.trim().toUpperCase() !== selectedOrder.id.slice(0, 8).toUpperCase() || deleting}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Excluir permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
