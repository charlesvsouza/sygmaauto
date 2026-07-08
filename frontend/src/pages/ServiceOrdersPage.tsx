import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceOrdersApi, customersApi, vehiclesApi, servicesApi, inventoryApi, tenantsApi, usersApi, checklistApi, aiApi, pdfApi } from '../api/client';
import {
  ClipboardList, Plus, Search, Car, User, XCircle,
  Wrench, Package, FileText, Trash2, Layout, X,
  Printer, Save, Zap, Loader2, RefreshCw, FileUp, ChevronDown,
  ClipboardCheck, ShoppingCart, CheckCircle2, AlertTriangle, Calendar, Sparkles,
} from 'lucide-react';

import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { ImportOSModal } from '../components/ImportOSModal';
import { ChecklistModal } from '../components/ChecklistModal';
import { MetrologiaModal, type MetrologiaData, type SuggestedItem } from '../components/MetrologiaModal';
import { LaudoRetificaModal } from '../components/LaudoRetificaModal';
import { canAccessFeature, canAccessRetificaMode } from '../lib/planAccess';

const statusConfig: Record<string, { label: string; tone: 'neutral' | 'golden' | 'positive' | 'negative' }> = {
  ABERTA:               { label: 'Aberta',                tone: 'neutral' },
  ORCAMENTO:            { label: 'Aberta',                tone: 'neutral' }, // legado
  EM_DIAGNOSTICO:       { label: 'Em Diagnóstico',        tone: 'golden' },
  ORCAMENTO_PRONTO:     { label: 'Orçamento Pronto',      tone: 'neutral' },
  AGUARDANDO_APROVACAO: { label: 'Aguardando Aprovação',  tone: 'neutral' },
  APROVADO:             { label: 'Aprovado',              tone: 'positive' },
  REPROVADO:            { label: 'Reprovado',             tone: 'negative' },
  AGUARDANDO_PECAS:     { label: 'Aguardando Peças',      tone: 'neutral' },
  EM_EXECUCAO:          { label: 'Em Execução',           tone: 'neutral' },
  PRONTO_ENTREGA:       { label: 'Pronto p/ Entrega',     tone: 'golden' },
  FATURADO:             { label: 'Faturado',              tone: 'neutral' },
  ENTREGUE:             { label: 'Entregue',              tone: 'neutral' },
  CANCELADO:            { label: 'Cancelado',             tone: 'negative' },
  DESMONTAGEM:          { label: 'Desmontagem',          tone: 'neutral' },
  METROLOGIA:           { label: 'Metrologia',           tone: 'golden' },
  ORCAMENTO_RETIFICA:   { label: 'Orçamento Retífica',   tone: 'neutral' },
  AGUARDANDO_APROVACAO_RETIFICA: { label: 'Aguardando Aprovação', tone: 'neutral' },
  EM_RETIFICA:          { label: 'Em Retífica',          tone: 'neutral' },
  MONTAGEM:             { label: 'Montagem',             tone: 'neutral' },
  TESTE_FINAL:          { label: 'Teste Final',          tone: 'positive' },
};

const STATUS_CHIPS: Record<string, string> = {
  neutral: 'bg-surface-900 text-surface-300 border border-surface-800',
  golden: 'bg-accent text-white border border-transparent',
  positive: 'bg-accent/10 text-accent-ink border border-accent/40',
  negative: 'bg-red-50 text-red-700 border border-red-200',
};

const statusChip = (tone?: keyof typeof STATUS_CHIPS) => STATUS_CHIPS[tone ?? 'neutral'];
const statusIndicator = (tone?: keyof typeof STATUS_CHIPS) => {
  const map: Record<string, string> = {
    neutral: 'bg-surface-600',
    golden: 'bg-accent',
    positive: 'bg-accent',
    negative: 'bg-red-500',
  };
  return map[tone ?? 'neutral'];
};

const PAYMENT_METHODS = [
  'Dinheiro', 'PIX', 'Cartao de Debito', 'Cartao de Credito',
  'Transferencia Bancaria', 'Boleto', 'Cheque', 'A Prazo / Parcelado',
];

// Fluxo de status permitidos (espelha o backend exato)
// ABERTA -> EM_DIAGNOSTICO -> ORCAMENTO_PRONTO -> AGUARDANDO_APROVACAO
//   -> APROVADO -> [AGUARDANDO_PECAS ->] EM_EXECUCAO -> PRONTO_ENTREGA -> FATURADO -> ENTREGUE
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

const RETIFICA_STATUS_FLOW_UI: Record<string, string[]> = {
  ABERTA:                        ['DESMONTAGEM', 'CANCELADO'],
  DESMONTAGEM:                   ['METROLOGIA', 'CANCELADO'],
  METROLOGIA:                    ['ORCAMENTO_RETIFICA', 'CANCELADO'],
  ORCAMENTO_RETIFICA:            ['AGUARDANDO_APROVACAO_RETIFICA', 'CANCELADO'],
  AGUARDANDO_APROVACAO_RETIFICA: ['APROVADO', 'REPROVADO', 'CANCELADO'],
  APROVADO:                      ['EM_RETIFICA', 'MONTAGEM', 'CANCELADO'],
  REPROVADO:                     ['CANCELADO'],
  EM_RETIFICA:                   ['MONTAGEM', 'CANCELADO'],
  MONTAGEM:                      ['TESTE_FINAL', 'CANCELADO'],
  TESTE_FINAL:                   ['PRONTO_ENTREGA', 'CANCELADO'],
  PRONTO_ENTREGA:                ['FATURADO', 'CANCELADO'],
  FATURADO:                      ['ENTREGUE'],
  ENTREGUE:                      [],
  CANCELADO:                     [],
};

// Labels de acao para cada transicao (mais descritivos do que o nome do status)
const STATUS_ACTION_LABEL: Record<string, string> = {
  EM_DIAGNOSTICO:       'Iniciar Diagnostico',
  ORCAMENTO_PRONTO:     'Orçamento Pronto',
  AGUARDANDO_APROVACAO: 'Enviar para Aprovacao',
  APROVADO:             'Marcar como Aprovado',
  REPROVADO:            'Marcar como Reprovado',
  AGUARDANDO_PECAS:     'Aguardar Pecas',
  EM_EXECUCAO:          'Iniciar Execucao',
  PRONTO_ENTREGA:       'Marcar Pronto p/ Entrega',
  FATURADO:             'Registrar Pagamento',
  ENTREGUE:             'Confirmar Entrega',
  CANCELADO:            'Cancelar O.S.',
  DESMONTAGEM:          'Iniciar Desmontagem',
  METROLOGIA:           'Enviar para Metrologia',
  ORCAMENTO_RETIFICA:   'Gerar Orcamento Tecnico',
  AGUARDANDO_APROVACAO_RETIFICA: 'Enviar para Aprovacao',
  EM_RETIFICA:          'Iniciar Retifica',
  MONTAGEM:             'Iniciar Montagem',
  TESTE_FINAL:          'Executar Teste Final',
};

const FLOW_PHASES = [
  { key: 'ABERTURA',    label: 'Abertura',    statuses: ['ABERTA', 'ORCAMENTO'] },
  { key: 'DIAGNOSTICO', label: 'Diagnostico', statuses: ['EM_DIAGNOSTICO'] },
  { key: 'ORCAMENTO',   label: 'Orcamento',   statuses: ['ORCAMENTO_PRONTO', 'AGUARDANDO_APROVACAO'] },
  { key: 'APROVACAO',   label: 'Aprovacao',   statuses: ['APROVADO', 'REPROVADO'] },
  { key: 'EXECUCAO',    label: 'Execucao',    statuses: ['AGUARDANDO_PECAS', 'EM_EXECUCAO'] },
  { key: 'FINALIZACAO', label: 'Faturamento', statuses: ['PRONTO_ENTREGA', 'FATURADO'] },
  { key: 'ENTREGA',     label: 'Entrega',      statuses: ['ENTREGUE'] },
];

const RETIFICA_FLOW_PHASES = [
  { key: 'ABERTURA', label: 'Abertura', statuses: ['ABERTA'] },
  { key: 'DESMONTAGEM', label: 'Desmontagem', statuses: ['DESMONTAGEM'] },
  { key: 'ANALISE', label: 'Metrologia', statuses: ['METROLOGIA'] },
  { key: 'ORCAMENTO', label: 'Orcamento', statuses: ['ORCAMENTO_RETIFICA', 'AGUARDANDO_APROVACAO_RETIFICA'] },
  { key: 'EXECUCAO', label: 'Retifica', statuses: ['APROVADO', 'EM_RETIFICA', 'MONTAGEM', 'TESTE_FINAL'] },
  { key: 'FINALIZACAO', label: 'Finalizacao', statuses: ['PRONTO_ENTREGA', 'FATURADO'] },
  { key: 'ENTREGA', label: 'Entrega', statuses: ['ENTREGUE'] },
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
.os-doc .no-border { border: none; }
.os-doc .tr { text-align: right; }
.os-doc .tc { text-align: center; }
.os-doc .print-header-table { margin-bottom: 6px; }
.os-doc .print-header-left { border: none; padding-left: 0; vertical-align: top; width: 62%; }
.os-doc .print-company-name { font-size: 15pt; font-weight: 900; line-height: 1.1; }
.os-doc .print-company-meta { font-size: 8.5pt; margin-top: 2px; }
.os-doc .print-company-address { font-size: 8.5pt; }
.os-doc .print-company-contact { font-size: 8.5pt; }
.os-doc .print-header-right { border: 2px solid #1e293b; padding: 8px 14px; text-align: right; vertical-align: top; min-width: 155px; }
.os-doc .print-observations-col { width: 55%; padding-right: 10px; }
.os-doc .print-totals-col { vertical-align: top; }
.os-doc .print-discount-label { color: #b91c1c; }
.os-doc .print-discount-value { color: #b91c1c; }
.os-doc .print-doc-type { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #666; }
.os-doc .print-doc-number { font-size: 19pt; font-weight: 900; font-family: monospace; letter-spacing: 2px; line-height: 1.1; }
.os-doc .print-doc-meta { font-size: 8.5pt; color: #444; margin-top: 3px; }
.os-doc .print-doc-meta-muted { font-size: 8.5pt; color: #444; }
.os-doc .print-plate { font-family: monospace; font-weight: 900; }
.os-doc .print-pre-wrap { min-height: 22px; white-space: pre-wrap; }
.os-doc .print-col-28 { width: 28px; }
.os-doc .print-col-60 { width: 60px; }
.os-doc .print-col-90 { width: 90px; }
.os-doc .print-col-95 { width: 95px; }
.os-doc .print-col-80 { width: 80px; }
.os-doc .print-col-50 { width: 50px; }
.os-doc .print-col-110 { width: 110px; }
.os-doc .print-serial-cell { color: #888; font-size: 7.5pt; }
.os-doc .print-part-cell { font-size: 7.5pt; color: #555; font-family: monospace; }
.os-doc .print-observations { min-height: 38px; font-size: 8.5pt; white-space: pre-wrap; }
.os-doc .print-sign-authorize { margin-top: 14px; font-size: 8pt; color: #333; line-height: 1.5; }
.os-doc .print-sign-table { margin-top: 16px; }
.os-doc .print-sign-cell { border: none; text-align: center; padding-top: 36px; width: 50%; }
.os-doc .print-sign-line { border-top: 1px solid #666; display: inline-block; width: 210px; margin-bottom: 3px; }
.os-doc .print-sign-label { font-size: 9pt; font-weight: 700; }
.os-doc .print-sign-sub { font-size: 8pt; color: #555; }
.os-doc .print-footer { margin-top: 10px; padding-top: 5px; border-top: 1px solid #ddd; font-size: 7pt; color: #aaa; text-align: center; }
.os-doc hr { border: none; border-top: 1px solid #bbb; margin: 5px 0; }
.os-doc thead { display: table-row-group; }
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

function fmtBR(v: number | string | undefined, dec = 2) {
  return Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function ServiceOrdersPage() {
  const { user, tenant } = useAuthStore();
  const navigate = useNavigate();
  const userRole = String(user?.role ?? '').toUpperCase();
  const planName = tenant?.subscription?.plan?.name || 'START';
  const canUseChecklist = canAccessFeature(planName, 'CHECKLIST');
  const canUseRetificaMode = canAccessRetificaMode(planName);
  const canManageItems = ['MASTER', 'ADMIN', 'CHEFE_OFICINA', 'PRODUTIVO'].includes(userRole);
  const canManageStock = canManageItems;
  const canEditOrderDetails = ['MASTER', 'ADMIN', 'CHEFE_OFICINA', 'PRODUTIVO'].includes(userRole);
  const canCreateDiagnostic = ['MASTER', 'ADMIN', 'CHEFE_OFICINA', 'PRODUTIVO'].includes(userRole);
  const canSyncOrder = ['MASTER', 'ADMIN', 'PRODUTIVO'].includes(userRole);
  const canReserveParts = ['MASTER', 'ADMIN', 'GERENTE', 'CHEFE_OFICINA', 'SECRETARIA'].includes(userRole);
  const canDelete = userRole === 'MASTER';
  const canChangeStatus = ['MASTER', 'ADMIN', 'GERENTE', 'CHEFE_OFICINA'].includes(userRole);
  const canAssignExecutor = canManageItems;
  const CLOSED_STATUSES = ['FATURADO', 'ENTREGUE', 'CANCELADO', 'REPROVADO'];
  const printContentRef = useRef<HTMLDivElement>(null);
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

  const [newOrder, setNewOrder] = useState({
    customerId: '',
    vehicleId: '',
    complaint: '',
    kmEntrada: 0,
    reserveStock: false,
    orderType: 'ORCAMENTO',
    equipmentBrand: '',
    equipmentModel: '',
    serialNumber: '',
    scheduledDate: '',
  });

  const [edit, setEdit] = useState({
    complaint: '', diagnosis: '', technicalReport: '',
    observations: '', notes: '', paymentMethod: '', reserveStock: false,
    scheduledDate: '',
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
  // IA Assistiva
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetOrderId, setImportTargetOrderId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checklistModal, setChecklistModal] = useState<'ENTRADA' | 'SAIDA' | null>(null);
  const [checklistFlags, setChecklistFlags] = useState<{ ENTRADA: boolean; SAIDA: boolean }>({ ENTRADA: false, SAIDA: false });
  const [showQuickVehicleForm, setShowQuickVehicleForm] = useState(false);
  const [creatingQuickVehicle, setCreatingQuickVehicle] = useState(false);
  const [quickVehicle, setQuickVehicle] = useState({ plate: '', brand: '', model: '', color: '', year: '' });
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDiagBanner, setShowDiagBanner] = useState(false);

  const [creatingDiagOrder, setCreatingDiagOrder] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const isReprovado = selectedOrder?.status === 'REPROVADO';
  const isClosed = CLOSED_STATUSES.includes(selectedOrder?.status ?? '');
  const isRetificaOrder = selectedOrder?.orderType === 'RETIFICA_MOTOR';
  const activeStatusFlow = isRetificaOrder ? RETIFICA_STATUS_FLOW_UI : STATUS_FLOW_UI;
  const activeFlowPhases = isRetificaOrder ? RETIFICA_FLOW_PHASES : FLOW_PHASES;

  const getOrderAssetLabel = (order: any) => {
    if (order?.vehicle) {
      return `${order.vehicle.plate || 'Sem placa'} - ${order.vehicle.model || 'Veiculo'}`;
    }
    return `${order?.equipmentBrand || 'Motor'} ${order?.equipmentModel || 'Avulso'}${order?.serialNumber ? ` - Serie ${order.serialNumber}` : ''}`.trim();
  };

  //  Reserva de Pecas 
  const [showReserveParts, setShowReserveParts] = useState(false);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveResult, setReserveResult] = useState<any>(null);
  const [expectedPartsDate, setExpectedPartsDate] = useState('');

  // Modal de metrologia (aberto a partir do Andamento da O.S.)
  const [metrologiaOsTarget, setMetrologiaOsTarget] = useState<{ id: string; number: string; metrology: MetrologiaData | null } | null>(null);
  const [laudoRetificaOs, setLaudoRetificaOs] = useState<any | null>(null);

  const handleMetrologiaSaveFromDetail = async (data: MetrologiaData, items: SuggestedItem[]) => {
    if (!metrologiaOsTarget) return;
    const { id } = metrologiaOsTarget;
    await serviceOrdersApi.saveMetrology(id, data);
    await serviceOrdersApi.updateStatus(id, { status: 'METROLOGIA' });
    for (const item of items) {
      try {
        await serviceOrdersApi.addItem(id, {
          description: item.description,
          type: item.type === 'service' ? 'service' : 'part',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      } catch { /* ignora falha individual */ }
    }
    // Recarrega a OS atualizada e abre o laudo para impressão
    const res = await serviceOrdersApi.getById(id);
    setSelectedOrder(res.data);
    setMetrologiaOsTarget(null);
    setLaudoRetificaOs(res.data);
    await loadOrders();
  };

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
        scheduledDate: o.scheduledDate ? new Date(o.scheduledDate).toISOString().slice(0, 16) : '',
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
    if (!canCreateDiagnostic) {
      alert('Seu perfil nao possui permissao para criar O.S. de diagnostico.');
      return;
    }
    setCreatingDiagOrder(true);
    try {
      const res = await serviceOrdersApi.createDiagnosticOrder(selectedOrder.id);
      setShowDiagBanner(false);
      await loadOrders();
      await selectOrder(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar OS de diagnostico');
    } finally {
      setCreatingDiagOrder(false);
    }
  };

  const saveDetails = async (closeAfterSave = false) => {
    if (!selectedOrder) return;
    if (!canEditOrderDetails) {
      alert('Seu perfil nao possui permissao para editar os dados da O.S.');
      return;
    }
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
    if (!canSyncOrder) {
      alert('Seu perfil nao possui permissao para atualizar esta O.S.');
      return;
    }

    const changedEntries = Object.entries(pendingQtyByItem).filter(([itemId, newQty]) => {
      const current = selectedOrder.items?.find((i: any) => i.id === itemId);
      return current && Number(newQty) > 0 && Number(newQty) !== Number(current.quantity);
    });

    const hasPartChangeWithoutPermission = changedEntries.some(([itemId]) => {
      const current = selectedOrder.items?.find((i: any) => i.id === itemId);
      return current?.type?.toLowerCase() === 'part' && !canManageStock;
    });

    if (hasPartChangeWithoutPermission) {
      alert('Seu perfil nao possui permissao para alterar quantidade de pecas.');
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

      // 2. Sincroniza precos do catalogo (pecas, servicos, perfil da oficina)
      await serviceOrdersApi.syncPrices(selectedOrder.id);

      // 3. Recarrega OS, clientes, veiculos e dados da empresa
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

  const createQuickVehicle = async () => {
    if (!newOrder.customerId) {
      alert('Selecione um cliente antes de cadastrar o veiculo.');
      return;
    }

    const plate = quickVehicle.plate.trim().toUpperCase();
    const brand = quickVehicle.brand.trim();
    const model = quickVehicle.model.trim();

    if (!plate || !brand || !model) {
      alert('Preencha placa, marca e modelo para cadastrar o veiculo.');
      return;
    }

    setCreatingQuickVehicle(true);
    try {
      const parsedYear = Number(quickVehicle.year);
      const payload = {
        customerId: newOrder.customerId,
        plate,
        brand,
        model,
        color: quickVehicle.color.trim() || undefined,
        year: quickVehicle.year && Number.isFinite(parsedYear) ? parsedYear : undefined,
      };

      const res = await vehiclesApi.create(payload);
      const createdVehicle = res.data;

      setVehicles((prev) => {
        const exists = prev.some((v: any) => v.id === createdVehicle.id);
        return exists ? prev : [...prev, createdVehicle];
      });

      setNewOrder((prev) => ({ ...prev, vehicleId: createdVehicle.id }));
      setQuickVehicle({ plate: '', brand: '', model: '', color: '', year: '' });
      setShowQuickVehicleForm(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao cadastrar veiculo.');
    } finally {
      setCreatingQuickVehicle(false);
    }
  };

  const viewOrderPdf = async () => {
    if (!selectedOrder) return;
    try {
      const response = await serviceOrdersApi.downloadPdf(selectedOrder.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.URL.revokeObjectURL(url);
        alert('Nao foi possivel abrir a visualizacao. Verifique o bloqueador de pop-ups.');
        return;
      }
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch {
      alert('Erro ao gerar PDF da O.S.');
    }
  };

  const getCurrentPhaseIndex = (status: string) => {
    const idx = activeFlowPhases.findIndex((phase) => phase.statuses.includes(status));
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
      alert(err.response?.data?.message || 'Erro ao reservar pecas');
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
        <td>${item.internalCode || '-'}</td>
        <td>${item.sku || '-'}</td>
        <td>${item.description}</td>
        <td style="text-align:center">${item.lacking}</td>
        <td style="text-align:right">R$ ${Number(item.costPrice ?? item.unitPrice ?? 0).toFixed(2).replace('.', ',')}</td>
        <td style="text-align:right">R$ ${(Number(item.costPrice ?? item.unitPrice ?? 0) * item.lacking).toFixed(2).replace('.', ',')}</td>
        <td>${item.supplierName || '-'}</td>
        <td>${o.id?.slice(0,8).toUpperCase() || '-'}</td>
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
      .doc-footer { margin-top: 10px; padding-top: 8px; border-top: 1px solid #dbe3ea; font-size: 7.5pt; color: #64748b; text-align: center; }
      .preview-label { font-size: 7pt; color: #94a3b8; margin-top: 2px; }
      @media print { body { padding: 8px; } }
    </style></head><body>
      <div class="header-row">
        <div>
          <div class="company-name">${t.name || t.tradeName || t.legalName || ''}</div>
          ${t.document ? `<div>${t.document}</div>` : ''}
          ${t.address ? `<div>${t.address}</div>` : ''}
          <div>${[t.phone ? 'Tel: ' + t.phone : '', t.email].filter(Boolean).join(' - ')}</div>
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
        <strong>${(o.vehicle as any) ? 'Veiculo' : 'Motor'}:</strong> ${(o.vehicle as any) ? `${(o.vehicle as any)?.brand || ''} ${(o.vehicle as any)?.model || ''} - Placa ${(o.vehicle as any)?.plate || ''}` : `${o.equipmentBrand || 'Motor'} ${o.equipmentModel || 'Avulso'}${o.serialNumber ? ` - Serie ${o.serialNumber}` : ''}`}
        &nbsp;&nbsp;-&nbsp;&nbsp;
        <strong>Cliente:</strong> ${(o.customer as any)?.name || ''}
        &nbsp;&nbsp;-&nbsp;&nbsp;
        <strong>OS:</strong> ${o.id?.slice(0,8).toUpperCase() || ''}
      </div>
      <table>
        <thead><tr>
          <th style="width:80px">Cod. Interno</th>
          <th style="width:80px">Cod. Original</th>
          <th>Peca / Descricao</th>
          <th style="width:50px;text-align:center">Qtd</th>
          <th style="width:80px;text-align:right">Unitario</th>
          <th style="width:90px;text-align:right">Total</th>
          <th style="width:100px">Fornecedor</th>
          <th style="width:70px">N. OS</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="5" style="text-align:right">Total Estimado</td>
          <td style="text-align:right">R$ ${total.toFixed(2).replace('.', ',')}</td>
          <td colspan="2"></td>
        </tr></tfoot>
      </table>
      <div class="sig">Assinatura / Aprovacao: _________________________________  &nbsp;&nbsp;&nbsp; Data: ___________</div>
      <div class="doc-footer">Documento Pedido de Compra #${result.purchaseOrderNumber || '-'} gerado em ${new Date().toLocaleString('pt-BR')} via SigmaAuto ERP para oficinas.</div>
      <div class="preview-label" style="text-align:center;margin-top:8px">Gerado em ${now} - SigmaAuto</div>
    </body></html>`;
  };

  const downloadPurchaseOrderPdf = async () => {
    if (!reserveResult) return;
    try {
      const html = buildPurchaseOrderHtml({ ...reserveResult, expectedPartsDate: expectedPartsDate || null });
      const documentFileName = `${reserveResult.purchaseOrderNumber || 'pedido-compra'}.pdf`;
      const response = await pdfApi.render({
        html,
        fileName: documentFileName,
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = documentFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao gerar PDF do pedido de compra.');
    }
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
    if (!canManageItems) {
      alert('Seu perfil nao possui permissao para adicionar itens nesta O.S.');
      return;
    }
    if (itemData?.type === 'part' && !canManageStock) {
      alert('Seu perfil nao possui permissao para alterar estoque de pecas.');
      return;
    }
    try {
      await serviceOrdersApi.addItem(selectedOrder.id, itemData);
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      loadOrders();
      setCatalogMode(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao adicionar item. Verifique o estoque disponivel.');
    }
  };

  const quickAddItem = async () => {
    const price = parseFloat(quickAdd.unitPrice.replace(',', '.'));
    const qty = parseFloat(quickAdd.quantity) || 1;
    if (!quickAdd.description.trim()) { alert('Informe a descricao.'); return; }
    if (!price || price <= 0) { alert('Informe um preco valido.'); return; }
    await addItem({
      type: catalogMode,
      description: quickAdd.description.trim(),
      quantity: qty,
      unitPrice: price,
      ...(catalogMode === 'service' && quickAssignedUserId ? { assignedUserId: quickAssignedUserId } : {}),
    });
  };

  const handleAiSuggest = async () => {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const vehicle = selectedOrder?.vehicle;
      const existingItems = (selectedOrder?.items ?? []).map((i: any) => i.description);
      const res = await aiApi.suggest({
        description: aiDescription.trim(),
        vehicleBrand: vehicle?.brand ?? selectedOrder?.equipmentBrand ?? undefined,
        vehicleModel: vehicle?.model ?? selectedOrder?.equipmentModel ?? undefined,
        vehicleYear: vehicle?.year ?? undefined,
        existingItems,
      });
      setAiSuggestions(res.data ?? []);
    } catch {
      setAiSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  const updateItem = async (itemId: string, data: any) => {
    if (!selectedOrder) return;
    if (!canManageItems) {
      alert('Seu perfil nao possui permissao para editar itens nesta O.S.');
      return;
    }
    const current = selectedOrder.items?.find((i: any) => i.id === itemId);
    if (current?.type?.toLowerCase() === 'part' && !canManageStock) {
      alert('Seu perfil nao possui permissao para alterar estoque de pecas.');
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
    if (!selectedOrder || !confirm('Remover este item? O estoque sera estornado.')) return;
    if (!canManageItems) {
      alert('Seu perfil nao possui permissao para remover itens nesta O.S.');
      return;
    }
    const current = selectedOrder.items?.find((i: any) => i.id === itemId);
    if (current?.type?.toLowerCase() === 'part' && !canManageStock) {
      alert('Seu perfil nao possui permissao para alterar estoque de pecas.');
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
  const vehiclesOfSelectedCustomer = vehicles.filter((v) => v.customerId === newOrder.customerId);
  const executorOptions = executors.filter((u: any) =>
    ['MASTER', 'ADMIN', 'CHEFE_OFICINA', 'MECANICO', 'PRODUTIVO'].includes(String(u.role || '').toUpperCase())
  );
  const nextStatuses = selectedOrder ? (activeStatusFlow[selectedOrder.status] ?? []) : [];

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.vehicle?.plate?.toLowerCase().includes(search.toLowerCase()) ||
      o.vehicle?.model?.toLowerCase().includes(search.toLowerCase()) ||
      o.equipmentBrand?.toLowerCase().includes(search.toLowerCase()) ||
      o.equipmentModel?.toLowerCase().includes(search.toLowerCase()) ||
      o.serialNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
      <style>{PRINT_STYLE}</style>

      {/* PRINT DOCUMENT */}
      <div id="os-print-doc">
        {selectedOrder && (
          <div ref={printContentRef} className="os-doc">
            {/* Cabecalho: empresa (esq) + tipo/numero do documento (dir) */}
            <table className="print-header-table">
              <tbody>
                <tr>
                  <td className="print-header-left">
                    <div className="print-company-name">
                      {tenantFullData?.name || tenantFullData?.tradeName || tenantFullData?.legalName || ''}
                    </div>
                    {(tenantFullData?.taxId || tenantFullData?.document) && (
                      <div className="print-company-meta">
                        {tenantFullData?.companyType ?? 'CNPJ'}: {tenantFullData?.taxId || tenantFullData?.document}
                      </div>
                    )}
                    {tenantFullData?.address && (
                      <div className="print-company-address">{tenantFullData.address}</div>
                    )}
                    <div className="print-company-contact">
                      {tenantFullData?.phone && `Tel: ${tenantFullData.phone}`}
                      {tenantFullData?.phone && tenantFullData?.email && '  -  '}
                      {tenantFullData?.email}
                    </div>
                  </td>
                  <td className="print-header-right">
                    <div className="print-doc-type">
                      {selectedOrder.orderType === 'ORCAMENTO' ? 'Orcamento' : selectedOrder.orderType === 'RETIFICA_MOTOR' ? 'Retifica de Motor' : 'Ordem de Servico'}
                    </div>
                    <div className="print-doc-number">
                      {selectedOrder.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="print-doc-meta">
                      Abertura: {new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    {selectedOrder.scheduledDate && (
                      <div className="print-doc-meta-muted">
                        Agendamento: {new Date(selectedOrder.scheduledDate).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    <div className="print-doc-meta-muted">
                      Tipo O.S.: {selectedOrder.orderType === 'ORCAMENTO' ? 'Orcamento' : selectedOrder.orderType === 'RETIFICA_MOTOR' ? 'Retifica de Motor' : 'OS'}
                    </div>
                    {(selectedOrder.paymentMethod || edit.paymentMethod) && (
                      <div className="print-doc-meta-muted">
                        Cond. Pgto: {selectedOrder.paymentMethod || edit.paymentMethod}
                      </div>
                    )}
                    {selectedOrder.kmEntrada != null && (
                      <div className="print-doc-meta-muted">
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
                  <td colSpan={2}><strong>Nome do Cliente:</strong> {selectedOrder.customer?.name}</td>
                  <td><strong>CPF / CNPJ:</strong> {selectedOrder.customer?.document || '-'}</td>
                  <td><strong>Telefone:</strong> {selectedOrder.customer?.phone || '-'}</td>
                </tr>
                {(selectedOrder.customer?.address || selectedOrder.customer?.email) && (
                  <tr>
                    <td colSpan={3}><strong>Endereco:</strong> {selectedOrder.customer?.address || '-'}</td>
                    <td><strong>E-mail:</strong> {selectedOrder.customer?.email || '-'}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Dados do Veiculo */}
            <table>
              <tbody>
                <tr className="hdr"><td colSpan={6}>DADOS DO VEICULO</td></tr>
                <tr>
                  <td colSpan={2}><strong>Marca / Modelo:</strong> {selectedOrder.vehicle?.brand} {selectedOrder.vehicle?.model}</td>
                  <td><strong>Ano:</strong> {selectedOrder.vehicle?.year || '-'}</td>
                  <td><strong>Cor:</strong> {selectedOrder.vehicle?.color || '-'}</td>
                  <td><strong>Placa:</strong> <span className="print-plate">{selectedOrder.vehicle?.plate || '-'}</span></td>
                  <td><strong>KM:</strong> {selectedOrder.vehicle?.km ? Number(selectedOrder.vehicle.km).toLocaleString('pt-BR') : '-'}</td>
                </tr>
                {selectedOrder.vehicle?.vin && (
                  <tr><td colSpan={6}><strong>Chassi / VIN:</strong> {selectedOrder.vehicle.vin}</td></tr>
                )}
              </tbody>
            </table>

            {/* Queixa / Diagnostico / Laudo */}
            {(selectedOrder.complaint || selectedOrder.diagnosis || selectedOrder.technicalReport) && (
              <table>
                <tbody>
                  {selectedOrder.complaint && <>
                    <tr className="hdr"><td>RECLAMACAO DO CLIENTE</td></tr>
                    <tr><td className="print-pre-wrap">{selectedOrder.complaint}</td></tr>
                  </>}
                  {selectedOrder.diagnosis && <>
                    <tr className="hdr"><td>DIAGNOSTICO TECNICO</td></tr>
                    <tr><td className="print-pre-wrap">{selectedOrder.diagnosis}</td></tr>
                  </>}
                  {selectedOrder.technicalReport && <>
                    <tr className="hdr"><td>LAUDO / SOLUCAO APLICADA</td></tr>
                    <tr><td className="print-pre-wrap">{selectedOrder.technicalReport}</td></tr>
                  </>}
                </tbody>
              </table>
            )}

            {/* Servicos */}
            {serviceItems.length > 0 && (
              <table>
                <thead>
                  <tr className="hdr"><td colSpan={5}>SERVICOS / MAO DE OBRA</td></tr>
                  <tr>
                    <th className="tc print-col-28">#</th>
                    <th>Descricao</th>
                    <th className="tc print-col-60">Qtd/Hrs</th>
                    <th className="tr print-col-90">Vl. Unit.</th>
                    <th className="tr print-col-95">Vl. Total</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceItems.map((item: any, idx: number) => (
                    <tr key={item.id}>
                      <td className="tc print-serial-cell">{idx + 1}</td>
                      <td>{item.description}</td>
                      <td className="tc">{Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                      <td className="tr">R$ {fmtBR(item.unitPrice)}</td>
                      <td className="tr">R$ {fmtBR(item.totalPrice ?? item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pecas e Materiais */}
            {partItems.length > 0 && (
              <table>
                <thead>
                  <tr className="hdr"><td colSpan={6}>PECAS E MATERIAIS</td></tr>
                  <tr>
                    <th className="tc print-col-28">#</th>
                    <th className="print-col-80">Referencia</th>
                    <th>Descricao</th>
                    <th className="tc print-col-50">Qtd</th>
                    <th className="tr print-col-90">Vl. Unit.</th>
                    <th className="tr print-col-95">Vl. Total</th>
                  </tr>
                </thead>
                <tbody>
                  {partItems.map((item: any, idx: number) => (
                    <tr key={item.id}>
                      <td className="tc print-serial-cell">{idx + 1}</td>
                      <td className="print-part-cell">{item.part?.internalCode || item.internalCode || '-'}</td>
                      <td>{item.description}</td>
                      <td className="tc">{Number(item.quantity).toLocaleString('pt-BR')}</td>
                      <td className="tr">R$ {fmtBR(item.unitPrice)}</td>
                      <td className="tr">R$ {fmtBR(item.totalPrice ?? item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Observacoes + Totais lado a lado */}
            <table>
              <tbody>
                <tr className="nb">
                  {/* Esquerda: observacoes */}
                  <td className="no-border print-header-left print-observations-col">
                    <table>
                      <tbody>
                        <tr className="hdr"><td>OBSERVACOES</td></tr>
                        <tr>
                          <td className="print-observations">
                            {selectedOrder.observations || ''}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>

                  {/* Direita: totais */}
                  <td className="no-border print-totals-col">
                    <table>
                      <tbody>
                        <tr className="subtotal-row">
                          <td className="tr">Total Servicos</td>
                          <td className="tr print-col-110">R$ {fmtBR(selectedOrder.totalServices)}</td>
                        </tr>
                        <tr className="subtotal-row">
                          <td className="tr">Total Produtos</td>
                          <td className="tr">R$ {fmtBR(selectedOrder.totalParts)}</td>
                        </tr>
                        {Number(selectedOrder.totalLabor) > 0 && (
                          <tr className="subtotal-row">
                            <td className="tr">Mao de Obra</td>
                            <td className="tr">R$ {fmtBR(selectedOrder.totalLabor)}</td>
                          </tr>
                        )}
                        {Number(selectedOrder.totalDiscount) > 0 && (
                          <tr>
                            <td className="tr print-discount-label">Desconto</td>
                            <td className="tr print-discount-value">- R$ {fmtBR(selectedOrder.totalDiscount)}</td>
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

            {/* Autorizacao + Assinatura */}
            <div className="print-sign-authorize">
              Autorizo os servicos e a substituicao das pecas deste{' '}
              {selectedOrder.orderType === 'ORCAMENTO' ? 'ORCAMENTO' : 'documento'}, e o necessario
              teste de rua com o veiculo. Estou ciente que a empresa nao se responsabiliza pela perda
              ou roubo de qualquer objeto que se encontra no interior do veiculo.
            </div>
            <table className="print-sign-table">
              <tbody>
                <tr>
                  <td className="print-sign-cell">
                    <div className="print-sign-line" />
                    <br /><span className="print-sign-label">Assinatura do Cliente</span>
                    <br /><span className="print-sign-sub">Data: _____ / _____ / ____________</span>
                  </td>
                  <td className="print-sign-cell">
                    <div className="print-sign-line" />
                    <br /><span className="print-sign-label">Consultor Tecnico</span>
                    <br /><span className="print-sign-sub">Nome: _________________________________</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="print-footer">
              Documento gerado em {new Date().toLocaleString('pt-BR')} - Sigma Auto - Sistema de Gestao para Oficinas Automotivas
            </div>
          </div>
        )}
      </div>

      {/* LISTA DE OS */}
      <div className="w-80 flex flex-col bg-surface-950 border border-surface-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-surface-800/60 bg-surface-900/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-surface-100 flex items-center gap-2 uppercase text-xs tracking-tight">
              <ClipboardList size={16} /> Ordens de Servico
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Importar de orçamento PDF"
                onClick={() => {
                  setImportTargetOrderId(null);
                  setShowImportModal(true);
                }}
                className="p-1.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                title="Importar de Orcamento PDF"
              >
                <FileUp size={18} />
              </button>
              <button
                type="button"
                aria-label="Criar nova ordem de serviço"
                onClick={() => setShowCreateModal(true)}
                className="p-1.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-600" size={14} />
            <input
              aria-label="Buscar ordens de serviço"
              type="text"
              placeholder="Buscar por placa ou cliente..."
              className="w-full bg-white border border-surface-800 rounded-xl py-2 pl-9 pr-4 text-xs font-bold focus:ring-4 focus:ring-surface-100/5 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-surface-900/70">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-surface-600" />
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
                  'p-4 cursor-pointer transition-all hover:bg-surface-900/80',
                  active && 'bg-surface-900 border-l-[3px] border-l-accent'
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono font-bold text-surface-500">{'#' + order.id.slice(0, 8)}</span>
                  <span className={cn('mt-1 h-2 w-2 rounded-full', statusIndicator(statusConfig[order.status]?.tone))} />
                </div>
                <p className="font-bold text-surface-100 text-sm truncate leading-none mb-1">{order.customer?.name}</p>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider mb-2">
                  {getOrderAssetLabel(order)}
                </p>
                <div className="flex justify-between items-center">
                  <span className={cn('text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md', statusChip(statusConfig[order.status]?.tone))}>
                    {st.label}
                  </span>
                  <span className="text-xs font-bold text-surface-100">
                    R$ {fmtBR(order.totalCost)}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredOrders.length === 0 && !loading && (
            <p className="p-10 text-center text-xs font-bold uppercase tracking-wide text-surface-600">
              Nenhuma OS encontrada
            </p>
          )}
        </div>
      </div>

      {/*  DETALHE DA OS  */}
      <div className="flex-1 flex flex-col bg-white border border-surface-800 rounded-xl overflow-hidden shadow-sm">
        {!selectedOrder ? (
          <div className="flex-1 flex flex-col items-center justify-center text-surface-700 opacity-50">
            <Layout size={64} className="mb-4 stroke-[1px]" />
            <p className="font-bold uppercase tracking-wide text-xs">Selecione uma Ordem de Servico</p>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div className="p-6 border-b border-surface-800/60 bg-surface-950/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center text-white shadow-lg">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="mb-0.5">
                    <span className="text-[10px] font-bold text-surface-600 uppercase tracking-wide">OS</span>
                  </div>
                  <h1 className="text-xl font-bold text-surface-100 tracking-tight uppercase">
                    #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={viewOrderPdf}
                  className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-surface-800 bg-white text-surface-100 hover:bg-surface-950 transition-all shadow-sm"
                  title="Visualizar O.S. em PDF"
                >
                  <FileText size={15} /> Visualizar O.S.
                </button>
                {/* Botões de Checklist - verde quando ja preenchido */}
                <button type="button"
                  onClick={() => canUseChecklist && setChecklistModal('ENTRADA')}
                  disabled={!canUseChecklist}
                  className={cn(
                    'h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all',
                    !canUseChecklist
                      ? 'border-surface-800 bg-surface-900 text-surface-600 cursor-not-allowed'
                      : checklistFlags.ENTRADA
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-surface-800 bg-surface-950 text-surface-100 hover:bg-surface-900',
                  )}
                  title={!canUseChecklist ? 'Disponível no plano PRO e REDE' : checklistFlags.ENTRADA ? 'Checklist de entrada preenchido - clique para editar' : 'Preencher checklist de entrada'}
                >
                  <ClipboardCheck size={15} />
                  Entrada
                  {canUseChecklist && checklistFlags.ENTRADA && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5 shrink-0" />}
                </button>
                <button type="button"
                  onClick={() => canUseChecklist && setChecklistModal('SAIDA')}
                  disabled={!canUseChecklist}
                  className={cn(
                    'h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all',
                    !canUseChecklist
                      ? 'border-surface-800 bg-surface-900 text-surface-600 cursor-not-allowed'
                      : checklistFlags.SAIDA
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-surface-800 bg-surface-950 text-surface-100 hover:bg-surface-900',
                  )}
                  title={!canUseChecklist ? 'Disponível no plano PRO e REDE' : checklistFlags.SAIDA ? 'Checklist de saida preenchido - clique para editar' : 'Preencher checklist de saida'}
                >
                  <ClipboardCheck size={15} />
                  Saída
                  {canUseChecklist && checklistFlags.SAIDA && <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5 shrink-0" />}
                </button>
                <button type="button"
                  onClick={() => {
                    setImportTargetOrderId(selectedOrder.id);
                    setShowImportModal(true);
                  }}
                  disabled={isClosed || !canManageItems}
                  className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-surface-800 bg-white text-surface-100 hover:bg-surface-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title={isClosed ? 'OS finalizada nao pode receber importacao de orçamento' : !canManageItems ? 'Sem permissao para importar itens na O.S.' : 'Importar orçamento externo nesta O.S.'}
                >
                  <FileUp size={15} /> Importar Orcamento Externo
                </button>
                <button type="button"
                  onClick={() => navigate('/service-orders')}
                  className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-surface-800 bg-white hover:bg-surface-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X size={15} /> Fechar
                </button>
                <button type="button"
                  onClick={() => saveDetails(false)}
                  disabled={isClosed || !canEditOrderDetails}
                  className="h-10 px-5 rounded-xl text-xs font-bold flex items-center gap-2 bg-accent text-white hover:bg-accent-hover transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  title={isClosed ? 'OS finalizada nao pode ser editada' : !canEditOrderDetails ? 'Sem permissao para editar O.S.' : undefined}
                >
                  <Save size={15} /> Salvar alterações
                </button>
                {canDelete && (
                  <button type="button"
                    onClick={openDeleteModal}
                    className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                    title="Excluir O.S. permanentemente (somente MASTER)"
                  >
                    <Trash2 size={15} /> Excluir O.S.
                  </button>
                )}
              </div>
            </div>

            {/* Banner: OS reprovada + opção de diagnostico */}
            {isReprovado && showDiagBanner && canCreateDiagnostic && (
              <div className="mx-6 mt-4 p-4 bg-accent-soft border border-accent/40 rounded-lg flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl text-accent-ink">!</span>
                  <div>
                    <p className="text-sm font-bold text-ink">Orcamento reprovado pelo cliente</p>
                    <p className="text-xs text-muted mt-0.5">
                      Deseja abrir uma nova O.S. para cobrança da <strong>Taxa de Diagnostico</strong>?
                      O valor e o tempo serão preenchidos automaticamente conforme as configurações da oficina.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button type="button"
                    onClick={createDiagnosticOrder}
                    disabled={creatingDiagOrder}
                    className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent-hover transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
                  >
                    {creatingDiagOrder ? <Loader2 size={12} className="animate-spin" /> : 'OK'} Sim, criar nova O.S.
                  </button>
                  <button type="button"
                    onClick={() => setShowDiagBanner(false)}
                    className="px-4 py-2 bg-panel border border-line text-muted rounded-xl text-xs font-bold hover:bg-panel-2 transition-all whitespace-nowrap"
                  >
                    Nao, obrigado
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">

              {/* Andamento da O.S. */}
              <div className="rounded-lg border border-surface-800 bg-surface-950/70 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-wide">Andamento da O.S.</h3>
                  <span className="text-[10px] font-bold text-surface-300 uppercase tracking-wide">
                    Fase atual: {activeFlowPhases[getCurrentPhaseIndex(selectedOrder.status)]?.label || 'Abertura'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
                  {activeFlowPhases.map((phase, index) => {
                    const currentIdx = getCurrentPhaseIndex(selectedOrder.status);
                    const isCurrent = index === currentIdx;
                    const isDone = index < currentIdx;
                    const isMetrologiaPhase = isRetificaOrder && phase.key === 'ANALISE';
                    const canOpenMetrologia = isMetrologiaPhase && (
                      selectedOrder.status === 'DESMONTAGEM' || selectedOrder.status === 'METROLOGIA'
                    );
                    const inner = (
                      <p className="text-[9px] font-bold uppercase tracking-wider leading-snug">
                        {phase.label}
                        {canOpenMetrologia && (
                          <span className="block text-[8px] font-semibold normal-case tracking-normal mt-0.5 opacity-75">
                            {selectedOrder.status === 'METROLOGIA' ? 'ver / editar' : 'iniciar'}
                          </span>
                        )}
                      </p>
                    );
                    return canOpenMetrologia ? (
                      <button
                        key={phase.key}
                        type="button"
                        onClick={() => setMetrologiaOsTarget({ id: selectedOrder.id, number: selectedOrder.id.slice(-6).toUpperCase(), metrology: selectedOrder.metrology ?? null })}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-center transition-all cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-accent/40',
                          isCurrent && 'border-accent/40 bg-accent/10 text-accent-ink',
                          isDone && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                          !isCurrent && !isDone && 'border-surface-800 bg-white text-surface-600'
                        )}
                      >
                        {inner}
                      </button>
                    ) : (
                      <div key={phase.key} className={cn(
                        'rounded-xl border px-3 py-2 text-center transition-all',
                        isCurrent && 'border-accent/40 bg-accent/10 text-accent-ink',
                        isDone && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                        !isCurrent && !isDone && 'border-surface-800 bg-white text-surface-600'
                      )}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cliente + Veiculo */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-surface-950 rounded-lg p-5 border border-surface-800">
                  <h3 className="text-[10px] font-bold text-surface-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <User size={13} className="text-surface-100" /> Dados do Cliente
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-[10px] text-surface-500 font-bold uppercase mb-1">Nome do Cliente</p>
                      <p className="font-bold text-surface-100">{selectedOrder.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-surface-500 font-bold uppercase mb-1">Telefone</p>
                      <p className="font-bold text-surface-300 text-sm">{selectedOrder.customer?.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-surface-500 font-bold uppercase mb-1">Documento</p>
                      <p className="font-bold text-surface-300 text-sm">{selectedOrder.customer?.document || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-accent rounded-lg p-5 text-white shadow-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-wide flex items-center gap-2">
                      <Car size={13} /> Dados do Veiculo
                    </h3>
                    <div className="relative flex items-center gap-1" ref={statusDropdownRef}>
                      {/* Botão retroceder fase - ADMIN/MASTER em OS nao finalizadas */}
                      {canChangeStatus && ['MASTER', 'ADMIN'].includes(user?.role ?? '') &&
                       !CLOSED_STATUSES.includes(selectedOrder.status) &&
                       selectedOrder.status !== 'ABERTA' && (() => {
                        const currentPhaseIdx = activeFlowPhases.findIndex((p) => p.statuses.includes(selectedOrder.status));
                        const prevPhase = currentPhaseIdx > 0 ? activeFlowPhases[currentPhaseIdx - 1] : null;
                        if (!prevPhase) return null;
                        const prevStatus = prevPhase.statuses[0];
                        return (
                          <button type="button"
                            onClick={async () => {
                              if (!confirm(`Retroceder para "${prevPhase.label}"? Esta ação e para correção de fluxo.`)) return;
                              await changeStatus(prevStatus, true);
                            }}
                            title={`Retroceder para: ${prevPhase.label}`}
                            className="mr-1.5 text-[9px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 transition-all"
                          >
                            Voltar
                          </button>
                        );
                       })()}
                      {canChangeStatus ? (
                        <button type="button"
                          onClick={() => setShowStatusDropdown((v) => !v)}
                          title="Clique para alterar o status"
                          className={cn(
                            'text-[9px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all hover:ring-2 hover:ring-offset-1 hover:ring-surface-700 cursor-pointer',
                            statusChip(statusConfig[selectedOrder.status]?.tone)
                          )}
                        >
                          {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}
                          <ChevronDown size={9} className={cn('transition-transform', showStatusDropdown && 'rotate-180')} />
                        </button>
                      ) : (
                        <span className={cn('text-[9px] px-2 py-0.5 rounded-md font-bold', statusChip(statusConfig[selectedOrder.status]?.tone))}>
                          {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}
                        </span>
                      )}

                      {showStatusDropdown && (
                        <div className="absolute top-full right-0 mt-1.5 z-50 bg-white border border-surface-800 rounded-lg shadow-2xl p-1.5 min-w-[210px]">
                          <p className="text-[9px] font-bold text-surface-600 uppercase tracking-wide px-3 py-1.5 border-b border-surface-900 mb-1">
                            Alterar Status
                          </p>
                          {Object.entries(statusConfig)
                            .filter(([key]) => key !== selectedOrder.status && key !== 'ORCAMENTO')
                            .map(([key, cfg]) => {
                              const isNegative = key === 'CANCELADO' || key === 'REPROVADO';
                              return (
                                <button type="button"
                                  key={key}
                                  onClick={async () => {
                                    setShowStatusDropdown(false);
                                    if (isNegative && !confirm(`Confirmar mudança para: ${cfg.label}?`)) return;
                                    await changeStatus(key, true);
                                  }}
                                  className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-surface-950 text-left',
                                    isNegative ? 'text-red-600 hover:bg-red-50' : 'text-surface-300'
                                  )}
                                >
                                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusIndicator(cfg.tone))} />
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
                      <p className="text-[10px] text-white font-bold uppercase mb-1">Veiculo</p>
                      <p className="font-bold text-white">{selectedOrder.vehicle ? `${selectedOrder.vehicle?.brand || ''} ${selectedOrder.vehicle?.model || ''}` : `${selectedOrder.equipmentBrand || 'Motor'} ${selectedOrder.equipmentModel || 'Avulso'}`}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white font-bold uppercase mb-1">{selectedOrder.vehicle ? 'Placa' : 'Serie / ID'}</p>
                      <p className="font-mono font-bold text-white">{selectedOrder.vehicle?.plate || selectedOrder.serialNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white font-bold uppercase mb-1">{selectedOrder.vehicle ? 'Ano / Cor' : 'Tipo de entrada'}</p>
                      <p className="font-bold text-white text-sm">{selectedOrder.vehicle ? `${selectedOrder.vehicle?.year || '-'} / ${selectedOrder.vehicle?.color || '-'}` : 'Motor avulso'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white font-bold uppercase mb-1">KM Atual</p>
                      <p className="font-bold text-white text-sm">{selectedOrder.vehicle?.km ? Number(selectedOrder.vehicle.km).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white font-bold uppercase mb-1">KM Entrada</p>
                      <p className="font-bold text-white text-sm">{selectedOrder.kmEntrada ? Number(selectedOrder.kmEntrada).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campos texto */}
              <div className="grid grid-cols-1 gap-4">
                {(['complaint', 'diagnosis', 'technicalReport'] as const).map((field, i) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wide ml-1">
                      {['Reclamacao Inicial', 'Diagnostico Tecnico', 'Laudo / Solução'][i]}
                    </label>
                    <textarea
                      aria-label={['Reclamacao Inicial', 'Diagnostico Tecnico', 'Laudo / Solução'][i]}
                      value={edit[field]}
                      ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
                      onChange={(e) => {
                        setEdit({ ...edit, [field]: e.target.value });
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      readOnly={isReprovado}
                      className={`w-full min-h-24 bg-surface-950 border border-surface-800 rounded-xl p-3 text-xs font-bold text-surface-100 placeholder:text-surface-600 focus:bg-white focus:ring-4 focus:ring-surface-100/5 focus:border-accent transition-colors resize-y overflow-hidden ${isReprovado ? 'opacity-60 cursor-not-allowed bg-surface-900' : ''}`}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-surface-800 bg-surface-950/70 p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wide">Reserva de Pecas no Orcamento</p>
                  <p className="text-xs text-surface-400 mt-1">
                    Quando marcado, sinaliza a reserva das pecas para esta O.S. Na aprovacao do orcamento, todas as pecas pendentes serão debitadas do estoque automaticamente.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(edit.reserveStock)}
                    onChange={(e) => setEdit({ ...edit, reserveStock: e.target.checked })}
                    className="h-4 w-4 rounded border-surface-700 text-surface-100 focus:ring-surface-600"
                  />
                  <span className="text-xs font-bold text-surface-300">Reservar</span>
                </label>
              </div>

              {/* Servicos */}
              <div className="bg-white border border-surface-800 rounded-lg overflow-hidden">
                <div className="px-5 py-3 bg-surface-950 border-b border-surface-800/70 flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-surface-100 uppercase tracking-wide flex items-center gap-2">
                    <Wrench size={14} /> Servicos Realizados
                    <span className="bg-surface-800 text-surface-300 rounded-md px-1.5 py-0.5 text-[9px] font-bold">{serviceItems.length}</span>
                  </h3>
                  <button type="button"
                    onClick={() => openCatalog('service')}
                    disabled={!canManageItems}
                    className="text-[9px] font-semibold uppercase tracking-wide bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-1"
                    title={!canManageItems ? 'Sem permissao para adicionar itens' : undefined}
                  >
                    <Plus size={12} /> Adicionar Servico
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-950/60 text-surface-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3 border-b border-surface-800/70">Descricao</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-56">Executor</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-20 text-center">Qtd/Hrs</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-28">Unitário</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-28 text-right">Subtotal</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-900/70">
                    {serviceItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-surface-950/60">
                        <td className="px-5 py-3 font-bold text-surface-100">{item.description}</td>
                        <td className="px-5 py-3">
                          <select
                            aria-label={`Executor do serviço ${item.description}`}
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
                                ? 'bg-surface-900 border-surface-900 text-surface-600 cursor-not-allowed'
                                : 'bg-white border-surface-800'
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
                            aria-label={`Quantidade do serviço ${item.description}`}
                            type="number" step="0.5" min="0.5"
                            className="w-16 bg-surface-950 border border-transparent hover:border-surface-800 rounded-md px-2 py-1 text-center font-bold text-xs"
                            value={pendingQtyByItem[item.id] ?? item.quantity}
                            onChange={(e) => setPendingQtyByItem({ ...pendingQtyByItem, [item.id]: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-5 py-3 text-surface-400">R$ {fmtBR(item.unitPrice)}</td>
                        <td className="px-5 py-3 font-bold text-surface-100 text-right">R$ {fmtBR(item.totalPrice)}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            aria-label="Remover serviço"
                            onClick={() => removeItem(item.id)}
                            disabled={isClosed || !canManageItems}
                            className={cn('p-1 rounded transition-colors', isClosed || !canManageItems ? 'text-surface-800 cursor-not-allowed' : 'text-surface-700 hover:text-red-500')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {serviceItems.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-6 text-center text-surface-600 text-xs">Nenhum servico lançado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pecas */}
              <div className="bg-white border border-surface-800 rounded-lg overflow-hidden">
                <div className="px-5 py-3 bg-surface-950 border-b border-surface-800/70 flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-surface-100 uppercase tracking-wide flex items-center gap-2">
                    <Package size={14} /> Pecas e Materiais
                    <span className="bg-surface-800 text-surface-300 rounded-md px-1.5 py-0.5 text-[9px] font-bold">{partItems.length}</span>
                  </h3>
                  <button type="button"
                    onClick={() => openCatalog('part')}
                    className={cn(
                      'text-[9px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1',
                      canManageStock ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-panel-2 text-muted'
                    )}
                    title={canManageStock ? 'Lancar peca' : 'Sem permissao para alterar estoque'}
                  >
                    <Plus size={12} /> Lancar Peca
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-950/60 text-surface-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-5 py-3 border-b border-surface-800/70">Descricao</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-20 text-center">Qtd</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-28">Unitário</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-28 text-right">Subtotal</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-900/70">
                    {partItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-surface-950/60">
                        <td className="px-5 py-3 font-bold text-surface-100">
                          <div>{item.description}</div>
                          <div className="mt-1 text-[10px] text-surface-500 font-bold">
                            Estoque atual: <span className={cn('font-bold', Number(item.part?.currentStock || 0) > 0 ? 'text-emerald-600' : 'text-red-600')}>{Number(item.part?.currentStock || 0)}</span>
                            {' - '}Status: {item.applied ? 'Baixada' : 'Pendente'}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            aria-label={`Quantidade da peça ${item.description}`}
                            type="number" min="1"
                            disabled={isClosed || !canManageStock}
                            className={cn(
                              'w-16 border border-transparent rounded-md px-2 py-1 text-center font-bold text-xs',
                              isClosed || !canManageStock ? 'bg-surface-900 text-surface-600 cursor-not-allowed' : 'bg-surface-950 hover:border-surface-800'
                            )}
                            value={pendingQtyByItem[item.id] ?? item.quantity}
                            onChange={(e) => setPendingQtyByItem({ ...pendingQtyByItem, [item.id]: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-5 py-3 text-surface-400">R$ {fmtBR(item.unitPrice)}</td>
                        <td className="px-5 py-3 font-bold text-surface-100 text-right">R$ {fmtBR(item.totalPrice)}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            aria-label="Remover peça"
                            onClick={() => removeItem(item.id)}
                            disabled={isClosed || !canManageStock}
                            className={cn('p-1 rounded transition-colors', isClosed || !canManageStock ? 'text-surface-800 cursor-not-allowed' : 'text-surface-700 hover:text-red-500')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {partItems.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-6 text-center text-surface-600 text-xs">Nenhuma peca lançada</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ações + Pagamento + Totais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-surface-800/70">

                {/* Avançar status */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-surface-500 uppercase tracking-wide">Avançar Status</h4>
                  <div className="flex flex-col gap-1.5">
                    {nextStatuses.length === 0 && (
                      <p className="text-[10px] font-bold text-surface-600">Fluxo encerrado para este status.</p>
                    )}
                    {nextStatuses.map((status) => {
                      const isCancel = status === 'CANCELADO';
                      const isReprovadoBtn = status === 'REPROVADO';
                      const isNegative = isCancel || isReprovadoBtn;
                      return (
                        <button type="button"
                          key={status}
                          onClick={() => {
                            if (isNegative && !confirm(`Confirmar: ${STATUS_ACTION_LABEL[status] || status}?`)) return;
                            changeStatus(status);
                          }}
                          className={cn(
                            'w-full px-3 py-2 rounded-xl text-[10px] font-bold tracking-wide transition-all text-left',
                            isNegative
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              : 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                          )}
                        >
                          {STATUS_ACTION_LABEL[status] || statusConfig[status]?.label || status}
                        </button>
                      );
                    })}

                    {/* Botão Reservar Pecas - visível em APROVADO e AGUARDANDO_PECAS com pecas na OS */}
                    {canReserveParts && ['APROVADO', 'AGUARDANDO_PECAS'].includes(selectedOrder?.status) && partItems.length > 0 && (
                      <button type="button"
                        onClick={() => { setReserveResult(null); setExpectedPartsDate(''); setShowReserveParts(true); }}
                        className="w-full px-3 py-2 rounded-xl text-[10px] font-bold tracking-wide transition-all text-left bg-amber-500 text-white hover:bg-amber-600 shadow-sm flex items-center gap-1.5"
                      >
                        <ShoppingCart size={12} />
                        {selectedOrder?.partsReserved ? 'Rever Pedido de Pecas' : 'Verificar / Reservar Pecas'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Agendamento */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-surface-500 uppercase tracking-wide">Agendamento</h4>
                  <input
                    aria-label="Data e hora do agendamento"
                    type="datetime-local"
                    value={edit.scheduledDate}
                    onChange={(e) => setEdit({ ...edit, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold text-surface-300 focus:ring-2 focus:ring-surface-100/10 focus:border-accent transition-all"
                  />
                </div>

                {/* Forma de pagamento */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-surface-500 uppercase tracking-wide">Forma de Pagamento</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setEdit({ ...edit, paymentMethod: pm })}
                        className={cn(
                          'px-2.5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wide transition-all border text-left leading-tight',
                          edit.paymentMethod === pm
                            ? 'bg-accent text-white border-accent shadow-lg'
                            : 'bg-white border-surface-800 text-surface-400 hover:border-surface-600'
                        )}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Totais */}
                <div className="bg-accent rounded-xl p-6 text-white shadow-xl flex flex-col gap-3">
                  <button type="button"
                    onClick={recalculateTotals}
                    disabled={syncingTotals || !canSyncOrder}
                    className="mb-2 inline-flex items-center justify-center gap-2 rounded-lg border border-accent bg-accent-hover px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-accent-hover disabled:opacity-60"
                    title={!canSyncOrder ? 'Sem permissao para atualizar O.S.' : undefined}
                  >
                    {syncingTotals ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Atualizar O.S.
                  </button>
                  {[
                    { label: 'Servicos', val: selectedOrder.totalServices },
                    { label: 'Pecas', val: selectedOrder.totalParts },
                    ...(Number(selectedOrder.totalLabor) > 0 ? [{ label: 'Mao de Obra', val: selectedOrder.totalLabor }] : []),
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between text-[10px] font-bold text-white uppercase tracking-wider">
                      <span>{label}</span>
                      <span>R$ {fmtBR(val)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-accent">
                    <p className="text-[10px] font-bold text-white uppercase tracking-wide mb-1">Total da Ordem</p>
                    <p className="text-3xl font-bold tracking-tight">R$ {fmtBR(selectedOrder.totalCost)}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/*  MODAL RESERVA DE PECAS  */}
      <AnimatePresence>
        {showReserveParts && selectedOrder && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!reserveLoading) setShowReserveParts(false); }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[88vh] overflow-hidden">

              {/* Header */}
              <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-accent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ink/5 flex items-center justify-center">
                    <ShoppingCart size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">Reserva de Pecas</h3>
                    <p className="text-[10px] text-white font-semibold">OS {selectedOrder.id.slice(0,8).toUpperCase()} - {partItems.length} peca(s) na OS</p>
                  </div>
                </div>
                <button type="button" aria-label="Fechar modal de reserva de peças" onClick={() => { if (!reserveLoading) setShowReserveParts(false); }} className="text-white/80 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {!reserveResult ? (
                  <>
                    {/* Lista de pecas */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wide">Pecas desta OS</p>
                      {partItems.map((item: any) => {
                        const stock = Number(item.part?.currentStock ?? 0);
                        const needed = Math.ceil(Number(item.quantity));
                        const ok = stock >= needed;
                        return (
                          <div key={item.id} className={cn('flex items-center justify-between rounded-xl px-3 py-2 border text-xs', ok ? 'bg-accent-soft border-accent/40 text-accent-ink' : 'bg-red-50 border-red-200 text-red-800')}>
                            <div className="flex items-center gap-2">
                              {ok ? <CheckCircle2 size={14} className="text-accent-ink shrink-0" /> : <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                              <div>
                                <p className="font-bold text-surface-100 leading-tight">{item.description}</p>
                                {item.part?.internalCode && <p className="text-surface-500 text-[10px]">Cod: {item.part.internalCode}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-surface-300">Nec: {needed}</p>
                              <p className={cn('text-[10px] font-bold', ok ? 'text-accent-ink' : 'text-red-600')}>Estoque: {stock}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Data prevista chegada */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wide flex items-center gap-1.5">
                        <Calendar size={11} /> Data prevista de chegada (para pecas faltantes)
                      </label>
                      <input
                        aria-label="Data prevista de chegada"
                        type="date"
                        value={expectedPartsDate}
                        min={new Date().toISOString().slice(0,10)}
                        onChange={(e) => setExpectedPartsDate(e.target.value)}
                        className="w-full border border-surface-800 rounded-xl px-3 py-2 text-sm text-surface-300 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                      />
                      <p className="text-[10px] text-surface-500">Opcional. Pecas disponíveis serão reservadas imediatamente. Pecas faltantes gerarão um Pedido de Compra.</p>
                    </div>

                    <button type="button"
                      onClick={handleReserveParts}
                      disabled={reserveLoading}
                      className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
                      <div className="bg-accent-soft border border-accent/40 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-accent-ink">{reserveResult.reserved}</p>
                        <p className="text-[10px] font-bold text-accent-ink uppercase tracking-wide">Reservadas</p>
                        <p className="text-[9px] text-accent-ink/80 mt-0.5">Baixadas do estoque</p>
                      </div>
                      <div className={cn('border rounded-lg p-4 text-center', reserveResult.missing > 0 ? 'bg-red-50 border-red-200' : 'bg-surface-950 border-surface-800 text-surface-500')}>
                        <p className={cn('text-2xl font-bold', reserveResult.missing > 0 ? 'text-red-600' : 'text-surface-300')}>{reserveResult.missing}</p>
                        <p className={cn('text-[10px] font-bold uppercase tracking-wide', reserveResult.missing > 0 ? 'text-red-700' : 'text-surface-500')}>Faltantes</p>
                        <p className="text-[9px] text-surface-500 mt-0.5">{reserveResult.missing > 0 ? 'Pedido gerado' : 'Tudo disponivel'}</p>
                      </div>
                    </div>

                    {/* Pecas faltantes */}
                    {reserveResult.missingItems?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wide">Pedido de Compra</p>
                          <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{reserveResult.purchaseOrderNumber}</span>
                        </div>
                        {reserveResult.missingItems.map((item: any, i: number) => (
                          <div key={i} className="flex items-start justify-between rounded-xl px-3 py-2 bg-red-50 border border-red-200 text-xs">
                            <div>
                              <p className="font-bold text-surface-100">{item.description}</p>
                              <p className="text-surface-500 text-[10px]">Cod: {item.internalCode || '-'} - Orig: {item.sku || '-'} - Fornec: {item.supplierName || '-'}</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="font-bold text-red-700">Falta: {item.lacking}</p>
                              <p className="text-[10px] text-surface-500">Estoque: {item.inStock}</p>
                            </div>
                          </div>
                        ))}

                        <button type="button"
                          onClick={downloadPurchaseOrderPdf}
                          className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 hover:bg-accent-hover transition-all"
                        >
                          <Printer size={14} /> Imprimir Pedido de Compra
                        </button>
                      </div>
                    )}

                    <button type="button"
                      onClick={() => setShowReserveParts(false)}
                      className="w-full py-2.5 rounded-xl bg-surface-900 text-surface-300 font-bold text-xs tracking-wide hover:bg-surface-800 transition-all"
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

      {/*  MODAL CATÁLOGO  */}
      <AnimatePresence>
        {catalogMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCatalogMode(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[88vh]">

              {/* Header */}
              <div className="p-5 border-b border-surface-800/70 bg-surface-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-accent">
                    {catalogMode === 'service' ? <Wrench size={20} /> : <Package size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-surface-100 uppercase text-sm tracking-wide">
                      {catalogMode === 'service' ? 'Adicionar Servico' : 'Lancar Peca'}
                    </h3>
                    <p className="text-[10px] text-surface-500 font-bold uppercase">
                      {catalogMode === 'service' ? 'Catálogo ou lançamento avulso' : 'Catálogo ou peca avulsa'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => { setShowAiPanel((v) => !v); setAiSuggestions([]); setAiDescription(''); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-wide transition-all',
                      showAiPanel
                        ? 'bg-accent text-white shadow-md'
                        : 'bg-surface-900 text-surface-300 hover:bg-surface-800'
                    )}
                    title="IA Assistiva - sugestoes por sintoma"
                  >
                    <Sparkles size={13} />
                    IA
                  </button>
                  <button type="button" aria-label="Fechar catálogo" onClick={() => setCatalogMode(null)} className="text-surface-600 hover:text-red-500 transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>
              </div>

              {/* Painel IA Assistiva */}
              <AnimatePresence>
                {showAiPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-surface-800 bg-surface-950/70"
                  >
                    <div className="p-4 space-y-3">
                      <p className="text-[9px] font-bold text-surface-300 uppercase tracking-wide flex items-center gap-1">
                        <Sparkles size={11} />
                        IA Assistiva - descreva o problema e receba sugestoes
                      </p>
                      <div className="flex gap-2">
                        <input
                          aria-label="Descrição do problema para sugestão de IA"
                          type="text"
                          placeholder="Ex: motor falhando ao acelerar, barulho na suspensão..."
                          value={aiDescription}
                          onChange={(e) => setAiDescription(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAiSuggest()}
                          className="flex-1 px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold focus:ring-2 focus:ring-surface-100/10 focus:border-accent transition-all"
                        />
                        <button type="button"
                          onClick={handleAiSuggest}
                          disabled={aiLoading || !aiDescription.trim()}
                          className="h-9 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-[9px] font-semibold uppercase tracking-wide transition-all shadow flex items-center gap-1 disabled:opacity-50"
                        >
                          {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          Sugerir
                        </button>
                      </div>
                      {aiSuggestions.length > 0 && (
                        <div className="space-y-2">
                          {aiSuggestions.map((s, i) => (
                            <div key={i} className="flex items-center justify-between bg-white border border-surface-800 rounded-lg px-3 py-2.5 gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={cn('text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full', s.type === 'service' ? 'bg-surface-900 text-surface-300' : 'bg-black/50 text-surface-300')}>
                                    {s.type === 'service' ? 'Servico' : 'Peca'}
                                  </span>
                                  <span className="text-[10px] font-bold text-surface-200 truncate">{s.description}</span>
                                </div>
                                <p className="text-[9px] text-surface-500 truncate">{s.reason}</p>
                              </div>
                              <div className="text-right shrink-0">
                                {s.estimatedPrice > 0 && (
                                  <p className="text-[10px] font-bold text-surface-300">R$ {Number(s.estimatedPrice).toFixed(2).replace('.', ',')}</p>
                                )}
                                <button type="button"
                                  onClick={() => addItem({
                                    type: s.type,
                                    ...(s.id ? (s.type === 'service' ? { serviceId: s.id } : { partId: s.id }) : {}),
                                    description: s.description,
                                    quantity: s.quantity ?? 1,
                                    unitPrice: s.estimatedPrice ?? 0,
                                  })}
                                  disabled={isClosed}
                                  className="mt-0.5 text-[9px] font-bold text-accent-ink hover:text-accent-ink uppercase tracking-wider disabled:opacity-40"
                                >
                                  + Lancar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!aiLoading && aiSuggestions.length === 0 && aiDescription.trim() && (
                        <p className="text-[10px] text-surface-600 text-center py-1">Nenhuma sugestao encontrada. Tente descrever com mais detalhes.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Add */}
              <div className="p-4 border-b border-surface-800/70 bg-surface-950">
                <p className="text-[9px] font-bold text-surface-300 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Zap size={11} />
                  {catalogMode === 'service' ? 'Servico avulso (nao cadastrado)' : 'Peca avulsa (nao cadastrada)'}
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-surface-500 uppercase">Descricao *</label>
                    <input
                      aria-label="Descrição do item rápido"
                      type="text"
                      placeholder={catalogMode === 'service' ? 'Ex: Limpeza de bicos injetores' : 'Ex: Correia auxiliar Fiat Uno'}
                      value={quickAdd.description}
                      onChange={(e) => setQuickAdd({ ...quickAdd, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold focus:ring-2 focus:ring-surface-100/10 focus:border-accent transition-all"
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <label className="text-[9px] font-bold text-surface-500 uppercase">R$ *</label>
                    <input
                      aria-label="Preço unitário do item rápido"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={quickAdd.unitPrice}
                      onChange={(e) => setQuickAdd({ ...quickAdd, unitPrice: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold text-right focus:ring-2 focus:ring-surface-100/10 transition-all"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <label className="text-[9px] font-bold text-surface-500 uppercase">{catalogMode === 'service' ? 'Qtd/Hrs' : 'Qtd'}</label>
                    <input
                      aria-label="Quantidade do item rápido"
                      type="number"
                      min="0.5"
                      step={catalogMode === 'service' ? '0.5' : '1'}
                      value={quickAdd.quantity}
                      onChange={(e) => setQuickAdd({ ...quickAdd, quantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold text-center focus:ring-2 focus:ring-surface-100/10 transition-all"
                    />
                  </div>
                  <button type="button"
                    onClick={quickAddItem}
                    className="h-9 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-[9px] font-semibold uppercase tracking-wide transition-all shadow flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus size={13} /> Lancar
                  </button>
                </div>
                {catalogMode === 'service' && (
                  <div className="mt-2">
                    <label className="text-[9px] font-bold text-surface-500 uppercase">Executor do Servico</label>
                    <select
                      aria-label="Executor do serviço rápido"
                      value={quickAssignedUserId}
                      onChange={(e) => setQuickAssignedUserId(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold"
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
              <div className="px-4 py-3 border-b border-surface-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-600" size={14} />
                  <input
                    aria-label="Pesquisar no catálogo"
                    type="text"
                    placeholder={`Pesquisar no catalogo de ${catalogMode === 'service' ? 'servicos' : 'pecas'}...`}
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl py-2.5 pl-9 text-sm font-bold focus:bg-white transition-all"
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
                        <button type="button"
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
                          className="w-full p-4 bg-white border border-surface-800 rounded-lg hover:border-accent hover:shadow-md text-left transition-all group flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <div>
                            <p className="font-bold text-surface-100 text-sm">{s.name}</p>
                            <p className="text-[10px] text-surface-500 font-bold mt-0.5">
                              {s.tmo ? `TMO: ${s.tmo}h × R$ ${fmtBR(s.hourlyRate)}` : `R$ ${fmtBR(s.basePrice)}`}
                              {s.category && ` - ${s.category}`}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-xl bg-surface-900 group-hover:bg-accent group-hover:text-white flex items-center justify-center transition-all">
                            <Plus size={16} />
                          </div>
                        </button>
                      ))
                    }
                    {catalogItems.services.filter((s) => s.name.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                      <p className="text-center text-surface-600 text-xs py-8">Nenhum servico encontrado no catalogo</p>
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
                          <div key={p.id} className="p-4 bg-white border border-surface-800 rounded-lg hover:border-surface-700 transition-all flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-surface-100 text-sm truncate">{p.name}</p>
                                {p.currentStock <= (p.minStock || 0) && (
                                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-red-100 text-red-600 rounded shrink-0">Estoque Baixo</span>
                                )}
                              </div>
                              <p className="text-[10px] text-surface-500 font-bold mt-0.5">
                                {p.internalCode && `${p.internalCode} - `}
                                Estoque: <span className={cn('font-bold', p.currentStock > 0 ? 'text-emerald-600' : 'text-red-600')}>{p.currentStock}</span>
                                {' - Minimo: '}<span className="font-bold text-surface-300">{p.minStock || 0}</span>
                                {' - '}R$ {fmtBR(p.unitPrice)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center border border-surface-800 rounded-xl overflow-hidden">
                                <button type="button" onClick={() => setPartQties({ ...partQties, [p.id]: Math.max(1, qty - 1) })} className="w-7 h-8 flex items-center justify-center text-surface-400 hover:bg-surface-950 text-xs font-bold">-</button>
                                <span className="w-8 text-center text-sm font-bold">{qty}</span>
                                <button type="button" onClick={() => setPartQties({ ...partQties, [p.id]: qty + 1 })} className="w-7 h-8 flex items-center justify-center text-surface-400 hover:bg-surface-950 text-xs font-bold">+</button>
                              </div>
                              <button type="button"
                                onClick={() => addItem({ type: 'part', partId: p.id, description: p.name, quantity: qty, unitPrice: p.unitPrice })}
                                disabled={isClosed || !canManageStock || notEnoughStock}
                                title={isClosed ? 'OS finalizada nao pode ser editada' : !canManageStock ? 'Somente MASTER/ADMIN podem alterar estoque' : notEnoughStock ? 'Quantidade maior que estoque disponivel' : 'Adicionar peca'}
                                className={cn(
                                  'w-10 h-10 rounded-xl flex items-center justify-center shadow transition-all',
                                  !canManageStock || notEnoughStock
                                    ? 'bg-panel-2 text-faint cursor-not-allowed'
                                    : 'bg-accent text-white hover:bg-accent-hover'
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
                      <p className="text-center text-surface-300 bg-surface-950 border border-surface-800 rounded-xl p-2 text-[11px] font-bold">
                        Apenas MASTER e ADMIN podem adicionar/remover pecas (altera estoque).
                      </p>
                    )}
                    {catalogItems.parts.filter((p) => p.name.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                      <p className="text-center text-surface-600 text-xs py-8">Nenhuma peca encontrada no catalogo</p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/*  MODAL NOVA OS  */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-[50%] max-h-[90vh] overflow-hidden p-5 md:p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-lg md:text-xl font-bold text-surface-100 uppercase tracking-tight">Nova OS</h2>
                <button type="button" aria-label="Fechar modal de nova ordem" onClick={() => setShowCreateModal(false)} className="text-surface-600 hover:text-surface-100"><X size={24} /></button>
              </div>
              <div className="grid gap-4">
                <form className="grid gap-4" onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const payload = {
                    ...newOrder,
                    vehicleId: newOrder.vehicleId || undefined,
                    kmEntrada: newOrder.vehicleId ? newOrder.kmEntrada : undefined,
                    scheduledDate: newOrder.scheduledDate || undefined,
                    equipmentBrand: newOrder.orderType === 'RETIFICA_MOTOR' ? (newOrder.equipmentBrand || undefined) : undefined,
                    equipmentModel: newOrder.orderType === 'RETIFICA_MOTOR' ? (newOrder.equipmentModel || undefined) : undefined,
                    serialNumber: newOrder.orderType === 'RETIFICA_MOTOR' ? (newOrder.serialNumber || undefined) : undefined,
                  };
                  const res = await serviceOrdersApi.create(payload);
                  setShowCreateModal(false);
                  setNewOrder({ customerId: '', vehicleId: '', complaint: '', kmEntrada: 0, reserveStock: false, orderType: 'ORCAMENTO', equipmentBrand: '', equipmentModel: '', serialNumber: '', scheduledDate: '' });
                  loadOrders();
                  selectOrder(res.data);
                } catch (err: any) { alert('Erro ao criar OS: ' + (err?.response?.data?.message || err?.message || 'Verifique os dados.')); }
              }}>
                {/* Tipo de documento */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'ORCAMENTO', label: 'Orcamento', desc: 'Aguarda aprovacao do cliente' },
                    { value: 'ORDEM_SERVICO', label: 'Ordem de Servico', desc: 'Servico ja autorizado' },
                    ...(canUseRetificaMode ? [{ value: 'RETIFICA_MOTOR', label: 'Retifica', desc: 'Motor avulso ou fluxo tecnico especializado' }] : []),
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNewOrder({ ...newOrder, orderType: value })}
                      className={cn(
                        'flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all',
                        newOrder.orderType === value
                          ? 'border-accent bg-accent text-white'
                          : 'border-surface-800 bg-white text-surface-300 hover:border-surface-600'
                      )}
                    >
                      <span className="text-xs font-bold">{label}</span>
                      <span className={cn('text-[10px] mt-0.5', newOrder.orderType === value ? 'text-surface-700' : 'text-surface-500')}>{desc}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider ml-1">Cliente *</label>
                    <select aria-label="Cliente da nova ordem" className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" value={newOrder.customerId} onChange={(e) => {
                      setNewOrder({ ...newOrder, customerId: e.target.value, vehicleId: '' });
                      setShowQuickVehicleForm(false);
                      setQuickVehicle({ plate: '', brand: '', model: '', color: '', year: '' });
                    }} required>
                      <option value="">Selecione um cliente...</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-wider ml-1">Veiculo {newOrder.orderType === 'RETIFICA_MOTOR' ? '(opcional)' : '*'}</label>
                      {newOrder.customerId && (
                        <button
                          type="button"
                          onClick={() => setShowQuickVehicleForm((prev) => !prev)}
                          className="text-[10px] font-bold text-accent-ink bg-accent-soft border border-accent/40 px-2.5 py-1 rounded-lg hover:bg-accent-soft transition-all"
                        >
                          <Plus size={11} className="inline mr-1" /> {showQuickVehicleForm ? 'Fechar cadastro' : 'Incluir veiculo'}
                        </button>
                      )}
                    </div>
                    <select aria-label="Veículo da nova ordem" className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" value={newOrder.vehicleId} onChange={(e) => setNewOrder({ ...newOrder, vehicleId: e.target.value })} required={newOrder.orderType !== 'RETIFICA_MOTOR'}>
                      <option value="">{newOrder.orderType === 'RETIFICA_MOTOR' ? 'Motor avulso / sem veiculo' : 'Selecione um veiculo...'}</option>
                      {vehiclesOfSelectedCustomer.map((v) => <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>)}
                    </select>

                    {newOrder.customerId && vehiclesOfSelectedCustomer.length === 0 && !showQuickVehicleForm && (
                      <div className="rounded-xl bg-accent-soft border border-accent/40 px-3 py-2 text-xs text-accent-ink font-medium">
                        Este cliente ainda nao possui veiculo cadastrado. Clique em Incluir veiculo para cadastrar agora.
                      </div>
                    )}

                    {newOrder.customerId && showQuickVehicleForm && (
                      <div className="rounded-lg border border-surface-800 bg-surface-950 p-3 space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-500">Cadastro rapido de veiculo</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            aria-label="Placa do veículo"
                            className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold"
                            placeholder="Placa *"
                            value={quickVehicle.plate}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, plate: e.target.value }))}
                          />
                          <input
                            aria-label="Marca do veículo"
                            className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold"
                            placeholder="Marca *"
                            value={quickVehicle.brand}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, brand: e.target.value }))}
                          />
                          <input
                            aria-label="Modelo do veículo"
                            className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold"
                            placeholder="Modelo *"
                            value={quickVehicle.model}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, model: e.target.value }))}
                          />
                          <input
                            aria-label="Cor do veículo"
                            className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold"
                            placeholder="Cor (opcional)"
                            value={quickVehicle.color}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, color: e.target.value }))}
                          />
                          <input
                            aria-label="Ano do veículo"
                            type="number"
                            className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold"
                            placeholder="Ano (opcional)"
                            value={quickVehicle.year}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, year: e.target.value }))}
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={createQuickVehicle}
                            disabled={creatingQuickVehicle}
                            className={cn(
                              'px-4 py-2 rounded-xl text-xs font-bold transition-all',
                              creatingQuickVehicle
                                ? 'bg-surface-800 text-surface-600 cursor-not-allowed'
                                : 'bg-accent text-white hover:bg-accent-hover'
                            )}
                          >
                            {creatingQuickVehicle ? 'Salvando...' : 'Salvar veiculo'}
                          </button>
                        </div>
                      </div>
                    )}

                    {newOrder.vehicleId && (() => {
                      const CLOSED = ['FATURADO', 'ENTREGUE', 'CANCELADO', 'REPROVADO'];
                      const openForVehicle = orders.filter(
                        (o) => o.vehicleId === newOrder.vehicleId && !CLOSED.includes(o.status)
                      );
                      if (openForVehicle.length === 0) return null;
                      return (
                        <div className="rounded-xl bg-accent-soft border border-accent/40 px-3 py-2 text-xs text-accent-ink font-medium space-y-1">
                          <p>
                            Atencao: Este veiculo ja possui <strong>{openForVehicle.length}</strong> O.S/orcamento{openForVehicle.length > 1 ? 's' : ''} em aberto:
                            {openForVehicle.map((o: any) => (
                              <span key={o.id} className="ml-1 font-mono font-bold">#{o.id.slice(0, 8).toUpperCase()}</span>
                            ))}
                          </p>
                          <p className="text-accent-ink/80">Voce pode criar múltiplos orcamentos/OSs para o mesmo veiculo. Verifique se nao e duplicata.</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                {newOrder.orderType === 'RETIFICA_MOTOR' && !newOrder.vehicleId && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-wider ml-1">Marca do motor</label>
                      <input aria-label="Marca do motor" value={newOrder.equipmentBrand} onChange={(e) => setNewOrder({ ...newOrder, equipmentBrand: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" placeholder="Ex: VW" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-wider ml-1">Modelo / família</label>
                      <input aria-label="Modelo do motor" value={newOrder.equipmentModel} onChange={(e) => setNewOrder({ ...newOrder, equipmentModel: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" placeholder="Ex: AP 1.8" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-surface-500 uppercase tracking-wider ml-1">N. de serie</label>
                      <input aria-label="Número de série" value={newOrder.serialNumber} onChange={(e) => setNewOrder({ ...newOrder, serialNumber: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" placeholder="Opcional" />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider ml-1">KM Entrada</label>
                  <input aria-label="KM de entrada" type="number" className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" value={newOrder.kmEntrada} onChange={(e) => setNewOrder({ ...newOrder, kmEntrada: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider ml-1">Data / Hora do Agendamento</label>
                  <input aria-label="Data e hora do agendamento da nova ordem" type="datetime-local" className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" value={newOrder.scheduledDate} onChange={(e) => setNewOrder({ ...newOrder, scheduledDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider ml-1">Reclamacao Principal</label>
                  <textarea aria-label="Reclamação principal da nova ordem" className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all h-24 resize-none" value={newOrder.complaint} onChange={(e) => setNewOrder({ ...newOrder, complaint: e.target.value })} placeholder="O que o cliente relatou?" />
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-surface-800 bg-surface-950 px-3 py-2 text-xs font-bold text-surface-300">
                  <input
                    type="checkbox"
                    checked={Boolean(newOrder.reserveStock)}
                    onChange={(e) => setNewOrder({ ...newOrder, reserveStock: e.target.checked })}
                    className="h-4 w-4 rounded border-surface-700 text-surface-100 focus:ring-surface-600"
                  />
                  Reservar pecas para debitar automaticamente na aprovacao
                </label>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-md text-sm font-semibold text-surface-500 hover:bg-surface-950 transition-all">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-accent text-white rounded-md font-semibold hover:bg-accent-hover shadow transition-all">Criar Ordem</button>
                </div>
              </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {showImportModal && (
        <ImportOSModal 
          targetOrderId={importTargetOrderId ?? undefined}
          onClose={() => {
            setShowImportModal(false);
            setImportTargetOrderId(null);
          }} 
          onSuccess={async () => {
            await loadOrders();
            if (importTargetOrderId) {
              const updated = await serviceOrdersApi.getById(importTargetOrderId);
              setSelectedOrder(updated.data);
              alert('Orcamento externo importado na O.S. com sucesso!');
            } else {
              alert('OS Importada com sucesso!');
            }
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

      {/* Modal de Metrologia - abre ao clicar em "Metrologia" no Andamento da OS */}
      {metrologiaOsTarget && (
        <MetrologiaModal
          osId={metrologiaOsTarget.id}
          osNumber={metrologiaOsTarget.number}
          initialData={metrologiaOsTarget.metrology}
          onSave={handleMetrologiaSaveFromDetail}
          onCancel={() => setMetrologiaOsTarget(null)}
        />
      )}

      {/* Laudo de Retifica - abre automaticamente após salvar metrologia */}
      {laudoRetificaOs && (
        <LaudoRetificaModal
          os={laudoRetificaOs}
          tenant={tenant}
          onClose={() => setLaudoRetificaOs(null)}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && selectedOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <Trash2 size={22} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-100 uppercase tracking-tight">Excluir O.S.</h2>
                <p className="text-xs text-surface-500 font-medium">Esta ação e irreversível</p>
              </div>
            </div>

            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-700 font-medium space-y-1">
              <p><span className="font-bold">OS:</span> #{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              <p><span className="font-bold">Status atual:</span> {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}</p>
              <p><span className="font-bold">Total:</span> R$ {fmtBR(selectedOrder.totalCost)}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                Motivo da exclusão (opcional)
              </label>
              <textarea
                aria-label="Motivo da exclusão"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Orcamento duplicado, erro de cadastro..."
                className="w-full px-4 py-3 rounded-xl border border-surface-800 text-sm text-surface-300 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                Digite o numero da O.S. para confirmar:
                <span className="ml-2 font-mono text-surface-100">#{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
              </label>
              <input
                aria-label="Confirmação da exclusão"
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value.toUpperCase())}
                placeholder={`Digite ${selectedOrder.id.slice(0, 8).toUpperCase()}`}
                className="w-full px-4 py-3 rounded-xl border border-surface-800 font-mono font-bold text-sm text-surface-300 focus:outline-none focus:ring-2 focus:ring-red-300"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-11 rounded-xl border border-surface-800 text-sm font-bold text-surface-400 hover:bg-surface-950 transition-all"
              >
                Cancelar
              </button>
              <button type="button"
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
