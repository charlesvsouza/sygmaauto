import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceOrdersApi, customersApi, vehiclesApi, servicesApi, inventoryApi, tenantsApi, usersApi, checklistApi, aiApi } from '../api/client';
import { downloadHtmlPdf, escapeHtml } from '../lib/report';
import { orderCode, orderShortCode } from '../lib/orderCode';
import { availableDocuments, type OrderDocumentKind } from '../lib/orderDocuments';
import { canMoveToStatus, FRONT_OFFICE_ROLES, STATUS_CHANGE_ROLES, TECHNICAL_ROLES } from '../lib/roles';
import {
  ClipboardList, Plus, Search, Car, User, XCircle,
  Wrench, Package, FileText, Trash2, Layout, X,
  Printer, Save, Zap, Loader2, RefreshCw, FileUp, ChevronDown,
  ClipboardCheck, ShoppingCart, ArrowRight, CheckCircle2, AlertTriangle, Calendar, Sparkles, PackagePlus,
} from 'lucide-react';

import { cn } from '../lib/utils';
import { useToast, useConfirm, usePrompt, StatusChip, STATUS_CHIP_CLASS, NumberInput } from '../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { ImportOSModal } from '../components/ImportOSModal';
import { DeliveryModal } from '../components/DeliveryModal';
import { CatalogRegisterModal } from '../components/CatalogRegisterModal';
import { ChecklistModal } from '../components/ChecklistModal';
import { MetrologiaModal, type MetrologiaData, type SuggestedItem } from '../components/MetrologiaModal';
import { LaudoRetificaModal } from '../components/LaudoRetificaModal';
import { PaymentPlanEditor, initialPaymentPlan } from '../components/PaymentPlanEditor';
import { planHasInstallments, type PaymentPlan } from '../lib/paymentPlan';
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

const STATUS_CHIPS: Record<string, string> = STATUS_CHIP_CLASS;

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
  EM_DIAGNOSTICO:       'Iniciar Diagnóstico',
  ORCAMENTO_PRONTO:     'Orçamento Pronto',
  AGUARDANDO_APROVACAO: 'Enviar para Aprovação',
  APROVADO:             'Marcar como Aprovado',
  REPROVADO:            'Marcar como Reprovado',
  AGUARDANDO_PECAS:     'Aguardar Peças',
  EM_EXECUCAO:          'Iniciar Execução',
  PRONTO_ENTREGA:       'Marcar Pronto p/ Entrega',
  FATURADO:             'Registrar Pagamento',
  ENTREGUE:             'Confirmar Entrega',
  CANCELADO:            'Cancelar O.S.',
  DESMONTAGEM:          'Iniciar Desmontagem',
  METROLOGIA:           'Enviar para Metrologia',
  ORCAMENTO_RETIFICA:   'Gerar Orçamento Técnico',
  AGUARDANDO_APROVACAO_RETIFICA: 'Enviar para Aprovação',
  EM_RETIFICA:          'Iniciar Retífica',
  MONTAGEM:             'Iniciar Montagem',
  TESTE_FINAL:          'Executar Teste Final',
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

const RETIFICA_FLOW_PHASES = [
  { key: 'ABERTURA', label: 'Abertura', statuses: ['ABERTA'] },
  { key: 'DESMONTAGEM', label: 'Desmontagem', statuses: ['DESMONTAGEM'] },
  { key: 'ANALISE', label: 'Metrologia', statuses: ['METROLOGIA'] },
  { key: 'ORCAMENTO', label: 'Orçamento', statuses: ['ORCAMENTO_RETIFICA', 'AGUARDANDO_APROVACAO_RETIFICA'] },
  { key: 'EXECUCAO', label: 'Retífica', statuses: ['APROVADO', 'EM_RETIFICA', 'MONTAGEM', 'TESTE_FINAL'] },
  { key: 'FINALIZACAO', label: 'Finalizacao', statuses: ['PRONTO_ENTREGA', 'FATURADO'] },
  { key: 'ENTREGA', label: 'Entrega', statuses: ['ENTREGUE'] },
];

function fmtBR(v: number | string | undefined, dec = 2) {
  return Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function itemDiscountPercent(item: any): number {
  const base = Number(item.unitPrice || 0) * Number(item.quantity || 0);
  if (base <= 0) return 0;
  return Math.round(((Number(item.discount || 0) / base) * 100) * 100) / 100;
}

export function ServiceOrdersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const { user, tenant } = useAuthStore();
  const navigate = useNavigate();
  const userRole = String(user?.role ?? '').toUpperCase();
  const planName = tenant?.subscription?.plan?.name || 'START';
  const canUseChecklist = canAccessFeature(planName, 'CHECKLIST');
  const canUseRetificaMode = canAccessRetificaMode(planName);
  // Regras em lib/roles.ts (espelho do backend).
  const canManageItems = TECHNICAL_ROLES.includes(userRole);
  const canManageStock = canManageItems;
  const canEditOrderDetails = FRONT_OFFICE_ROLES.includes(userRole);
  const canGrantOrderDiscount = ['MASTER', 'ADMIN', 'GERENTE'].includes(userRole);
  const canCreateDiagnostic = TECHNICAL_ROLES.includes(userRole);
  const canSyncOrder = TECHNICAL_ROLES.includes(userRole);
  const canReserveParts = ['MASTER', 'ADMIN', 'GERENTE', 'CHEFE_OFICINA', 'SECRETARIA'].includes(userRole);
  const canDelete = userRole === 'MASTER';
  // Cadastro de peças/serviços é restrito ao admin (mesma regra das telas de Estoque e Serviços).
  const canRegisterCatalog = userRole === 'MASTER' || userRole === 'ADMIN';
  // Cada perfil só vê as etapas que pode aplicar (nextStatuses é filtrado por canMoveToStatus).
  const canChangeStatus = STATUS_CHANGE_ROLES.includes(userRole);
  const canAssignExecutor = canManageItems;
  const CLOSED_STATUSES = ['FATURADO', 'ENTREGUE', 'CANCELADO', 'REPROVADO'];
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
    scheduledDate: '', discountPartsPercent: 0, discountServicesPercent: 0,
    paymentPlan: null as PaymentPlan | null,
  });
  // Qualquer parcela depois do ato bloqueia desconto (mesma regra do backend).
  const isInstallmentPayment = edit.paymentPlan
    ? planHasInstallments(edit.paymentPlan)
    : edit.paymentMethod === 'A Prazo / Parcelado';

  // Catalog state
  const [catalogMode, setCatalogMode] = useState<'service' | 'part' | null>(null);
  const [catalogItems, setCatalogItems] = useState<{ services: any[]; parts: any[] }>({ services: [], parts: [] });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [quickAdd, setQuickAdd] = useState({ description: '', unitPrice: '', quantity: '1', discountPercent: '0' });
  const [partQties, setPartQties] = useState<Record<string, number>>({});
  const [quickAssignedUserId, setQuickAssignedUserId] = useState('');
  const [pendingQtyByItem, setPendingQtyByItem] = useState<Record<string, number>>({});
  const [pendingDiscountPctByItem, setPendingDiscountPctByItem] = useState<Record<string, number>>({});
  const [syncingTotals, setSyncingTotals] = useState(false);
  // IA Assistiva
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [registerItem, setRegisterItem] = useState<any>(null);
  const [deliveryModal, setDeliveryModal] = useState<{ mode: 'confirm' | 'edit'; override: boolean } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetOrderId, setImportTargetOrderId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checklistModal, setChecklistModal] = useState<'ENTRADA' | 'SAIDA' | null>(null);
  const [showDocsMenu, setShowDocsMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [checklistFlags, setChecklistFlags] = useState<{ ENTRADA: boolean; SAIDA: boolean }>({ ENTRADA: false, SAIDA: false });
  const [showQuickVehicleForm, setShowQuickVehicleForm] = useState(false);
  const [creatingQuickVehicle, setCreatingQuickVehicle] = useState(false);
  const [quickVehicle, setQuickVehicle] = useState({ plate: '', vin: '', brand: '', model: '', color: '', year: '' });
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
      return `${order.vehicle.plate || 'Sem placa'} - ${order.vehicle.model || 'Veículo'}`;
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
        discountPartsPercent: Number(o.discountPartsPercent || 0),
        discountServicesPercent: Number(o.discountServicesPercent || 0),
        paymentPlan: initialPaymentPlan(o),
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
      toast.warning('Seu perfil não possui permissão para criar O.S. de diagnóstico.');
      return;
    }
    setCreatingDiagOrder(true);
    try {
      const res = await serviceOrdersApi.createDiagnosticOrder(selectedOrder.id);
      setShowDiagBanner(false);
      await loadOrders();
      await selectOrder(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao criar OS de diagnóstico');
    } finally {
      setCreatingDiagOrder(false);
    }
  };

  const saveDetails = async (closeAfterSave = false) => {
    if (!selectedOrder) return;
    if (!canEditOrderDetails) {
      toast.warning('Seu perfil não possui permissão para editar os dados da O.S.');
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
      toast.success('Salvo com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar. Verifique o status da OS.');
    }
  };

  const recalculateTotals = async () => {
    if (!selectedOrder) return;
    if (!canSyncOrder) {
      toast.warning('Seu perfil não possui permissão para atualizar esta O.S.');
      return;
    }

    const qtyChanges: Record<string, number> = {};
    Object.entries(pendingQtyByItem).forEach(([itemId, newQty]) => {
      const current = selectedOrder.items?.find((i: any) => i.id === itemId);
      if (current && Number(newQty) > 0 && Number(newQty) !== Number(current.quantity)) {
        qtyChanges[itemId] = Number(newQty);
      }
    });

    const discountChanges: Record<string, number> = {};
    Object.entries(pendingDiscountPctByItem).forEach(([itemId, pct]) => {
      const current = selectedOrder.items?.find((i: any) => i.id === itemId);
      if (current && Number(pct) !== itemDiscountPercent(current)) {
        discountChanges[itemId] = Number(pct);
      }
    });

    const changedItemIds = Array.from(new Set([...Object.keys(qtyChanges), ...Object.keys(discountChanges)]));

    const hasPartChangeWithoutPermission = changedItemIds.some((itemId) => {
      const current = selectedOrder.items?.find((i: any) => i.id === itemId);
      return current?.type?.toLowerCase() === 'part' && !canManageStock;
    });

    if (hasPartChangeWithoutPermission) {
      toast.warning('Seu perfil não possui permissão para alterar quantidade/desconto de peças.');
      return;
    }

    setSyncingTotals(true);
    try {
      // 1. Aplica alterações de quantidade/desconto pendentes (mescladas por item)
      if (changedItemIds.length > 0) {
        await Promise.all(
          changedItemIds.map((itemId) => {
            const current = selectedOrder.items.find((i: any) => i.id === itemId);
            const finalQty = qtyChanges[itemId] ?? current.quantity;
            const data: any = {};
            if (itemId in qtyChanges) data.quantity = finalQty;
            if (itemId in discountChanges) {
              const pct = Math.min(100, Math.max(0, discountChanges[itemId]));
              data.discount = Number(current.unitPrice) * finalQty * (pct / 100);
            }
            return serviceOrdersApi.updateItem(selectedOrder.id, itemId, data);
          })
        );
        setPendingQtyByItem({});
        setPendingDiscountPctByItem({});
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
      toast.error(err?.response?.data?.message || 'Erro ao atualizar a O.S.');
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
    const expectedCode = orderShortCode(selectedOrder).toUpperCase();
    if (deleteConfirmInput.trim().toUpperCase() !== expectedCode) return;
    setDeleting(true);
    try {
      await serviceOrdersApi.delete(selectedOrder.id, deleteReason.trim() || undefined);
      setShowDeleteModal(false);
      setSelectedOrder(null);
      loadOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir a O.S.');
    } finally {
      setDeleting(false);
    }
  };

  const createQuickVehicle = async () => {
    if (!newOrder.customerId) {
      toast.warning('Selecione um cliente antes de cadastrar o veículo.');
      return;
    }

    const plate = quickVehicle.plate.trim().toUpperCase();
    const vin = quickVehicle.vin.trim().toUpperCase();
    const brand = quickVehicle.brand.trim();
    const model = quickVehicle.model.trim();

    if (!plate || !brand || !model) {
      toast.warning('Preencha placa, marca e modelo para cadastrar o veículo.');
      return;
    }

    setCreatingQuickVehicle(true);
    try {
      const parsedYear = Number(quickVehicle.year);
      const payload = {
        customerId: newOrder.customerId,
        plate,
        vin: vin || undefined,
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
      setQuickVehicle({ plate: '', vin: '', brand: '', model: '', color: '', year: '' });
      setShowQuickVehicleForm(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao cadastrar veículo.');
    } finally {
      setCreatingQuickVehicle(false);
    }
  };

  const openOrderDocument = async (kind: OrderDocumentKind, warranty?: boolean) => {
    if (!selectedOrder) return;
    setShowDocsMenu(false);
    try {
      const response = await serviceOrdersApi.downloadDocument(selectedOrder.id, kind, { warranty });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.URL.revokeObjectURL(url);
        toast.warning('Não foi possível abrir a visualização. Verifique o bloqueador de pop-ups.');
        return;
      }
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Erro ao gerar o documento.');
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
      toast.error(err.response?.data?.message || 'Erro ao reservar peças');
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
        <td>${escapeHtml(item.internalCode || '-')}</td>
        <td>${escapeHtml(item.sku || '-')}</td>
        <td>${escapeHtml(item.description)}</td>
        <td style="text-align:center">${item.lacking}</td>
        <td style="text-align:right">R$ ${Number(item.costPrice ?? item.unitPrice ?? 0).toFixed(2).replace('.', ',')}</td>
        <td style="text-align:right">R$ ${(Number(item.costPrice ?? item.unitPrice ?? 0) * item.lacking).toFixed(2).replace('.', ',')}</td>
        <td>${escapeHtml(item.supplierName || '-')}</td>
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
      .doc-box .doc-type { font-size: 7.5pt; font-weight: 700; text-transform:; letter-spacing: 1.5px; color: #666; }
      .doc-box .doc-num { font-size: 16pt; font-weight: 900; font-family: monospace; letter-spacing: 2px; }
      hr { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #1e293b; color: #fff; font-size: 7.5pt; text-transform:; letter-spacing: .5px; padding: 4px 6px; text-align: left; }
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
          <div class="company-name">${escapeHtml(t.name || t.tradeName || t.legalName || '')}</div>
          ${t.document ? `<div>${escapeHtml(t.document)}</div>` : ''}
          ${t.address ? `<div>${escapeHtml(t.address)}</div>` : ''}
          <div>${escapeHtml([t.phone ? 'Tel: ' + t.phone : '', t.email].filter(Boolean).join(' - '))}</div>
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
        <strong>${(o.vehicle as any) ? 'Veículo' : 'Motor'}:</strong> ${escapeHtml((o.vehicle as any) ? `${(o.vehicle as any)?.brand || ''} ${(o.vehicle as any)?.model || ''} - Placa ${(o.vehicle as any)?.plate || ''}` : `${o.equipmentBrand || 'Motor'} ${o.equipmentModel || 'Avulso'}${o.serialNumber ? ` - Serie ${o.serialNumber}` : ''}`)}
        &nbsp;&nbsp;-&nbsp;&nbsp;
        <strong>Cliente:</strong> ${escapeHtml((o.customer as any)?.name || '')}
        &nbsp;&nbsp;-&nbsp;&nbsp;
        <strong>OS:</strong> ${o.id?.slice(0,8).toUpperCase() || ''}
      </div>
      <table>
        <thead><tr>
          <th style="width:80px">Cod. Interno</th>
          <th style="width:80px">Cod. Original</th>
          <th>Peça / Descrição</th>
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
      <div class="sig">Assinatura / Aprovação: _________________________________  &nbsp;&nbsp;&nbsp; Data: ___________</div>
      <div class="doc-footer">Documento Pedido de Compra #${result.purchaseOrderNumber || '-'} gerado em ${new Date().toLocaleString('pt-BR')} via SigmaAuto ERP para oficinas.</div>
      <div class="preview-label" style="text-align:center;margin-top:8px">Gerado em ${now} - SigmaAuto</div>
    </body></html>`;
  };

  const downloadPurchaseOrderPdf = async () => {
    if (!reserveResult) return;
    try {
      const html = buildPurchaseOrderHtml({ ...reserveResult, expectedPartsDate: expectedPartsDate || null });
      await downloadHtmlPdf(html, {
        title: `Pedido de Compra ${reserveResult.purchaseOrderNumber || ''}`.trim(),
        fileName: reserveResult.purchaseOrderNumber || 'Pedido-compra',
      });
    } catch {
      toast.error('Erro ao gerar PDF do pedido de compra.');
    }
  };

  const changeStatus = async (status: string, adminOverride = false, extra: Record<string, any> = {}) => {
    if (!selectedOrder) return;
    try {
      await serviceOrdersApi.updateStatus(selectedOrder.id, { status, ...extra, ...(adminOverride && { adminOverride: true }) });
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      setShowDiagBanner(res.data.status === 'REPROVADO');
      loadOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status');
    }
  };

  // Desfaz a aprovação para o cliente aprovar de novo (novo link/QR code).
  const revokeApproval = async () => {
    if (!selectedOrder) return;
    const reason = await prompt({
      title: 'Revogar aprovação',
      message: 'A O.S. volta a ser orçamento aguardando aprovação, com o mesmo número e um link novo para o cliente. Peças baixadas na aprovação voltam ao estoque.',
      inputLabel: 'Motivo (opcional)',
      confirmLabel: 'Revogar aprovação',
    });
    if (reason === null) return;
    try {
      const res = await serviceOrdersApi.revokeApproval(selectedOrder.id, reason.trim() || undefined);
      const fresh = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(fresh.data);
      loadOrders();
      const returned = Number(res.data?.partsReturned || 0);
      toast.success(`Aprovação revogada. Envie o orçamento (Documentos → Orçamento) ou o link ao cliente.${returned ? `\n${returned} peça(s) devolvida(s) ao estoque.` : ''}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao revogar a aprovação');
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
      setQuickAdd({ description: '', unitPrice: '', quantity: '1', discountPercent: '0' });
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = async (itemData: any) => {
    if (!selectedOrder) return;
    if (!canManageItems) {
      toast.warning('Seu perfil não possui permissão para adicionar itens nesta O.S.');
      return;
    }
    if (itemData?.type === 'part' && !canManageStock) {
      toast.warning('Seu perfil não possui permissão para alterar estoque de peças.');
      return;
    }
    try {
      await serviceOrdersApi.addItem(selectedOrder.id, itemData);
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      loadOrders();
      setCatalogMode(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao adicionar item. Verifique o estoque disponível.');
    }
  };

  const quickAddItem = async () => {
    const price = parseFloat(quickAdd.unitPrice.replace(',', '.'));
    const qty = parseFloat(quickAdd.quantity) || 1;
    if (!quickAdd.description.trim()) { toast.warning('Informe a descrição.'); return; }
    if (!price || price <= 0) { toast.warning('Informe um preço válido.'); return; }
    const discountPct = Math.min(100, Math.max(0, parseFloat(quickAdd.discountPercent) || 0));
    const discountValue = (price * qty) * (discountPct / 100);
    await addItem({
      type: catalogMode,
      description: quickAdd.description.trim(),
      quantity: qty,
      unitPrice: price,
      ...(discountValue > 0 ? { discount: discountValue } : {}),
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
      toast.warning('Seu perfil não possui permissão para editar itens nesta O.S.');
      return;
    }
    const current = selectedOrder.items?.find((i: any) => i.id === itemId);
    if (current?.type?.toLowerCase() === 'part' && !canManageStock) {
      toast.warning('Seu perfil não possui permissão para alterar estoque de peças.');
      return;
    }
    try {
      await serviceOrdersApi.updateItem(selectedOrder.id, itemId, data);
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      loadOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar item.');
    }
  };

  // Vincula o item da O.S. ao registro recém-incluído (ou já existente) no cadastro.
  const linkItemToCatalog = async (item: any, record: any) => {
    if (!selectedOrder) return;
    const isPart = item.type?.toLowerCase() === 'part';
    await serviceOrdersApi.updateItem(selectedOrder.id, item.id, isPart
      ? { partId: record.id, description: record.name, unitPrice: Number(record.unitPrice) }
      : { serviceId: record.id, description: record.name });
    const res = await serviceOrdersApi.getById(selectedOrder.id);
    setSelectedOrder(res.data);
    loadOrders();
    setRegisterItem(null);
    toast.success(isPart ? 'Peça incluída no cadastro e vinculada à O.S.' : 'Serviço incluído no cadastro e vinculado à O.S.');
  };

  const submitDelivery = async (data: { deliveredAt: string; deliveredTo: string }) => {
    if (!selectedOrder || !deliveryModal) return;
    try {
      if (deliveryModal.mode === 'edit') {
        await serviceOrdersApi.setDelivery(selectedOrder.id, data);
        const res = await serviceOrdersApi.getById(selectedOrder.id);
        setSelectedOrder(res.data);
        loadOrders();
        toast.success('Dados da entrega salvos.');
      } else {
        await changeStatus('ENTREGUE', deliveryModal.override, data);
      }
      setDeliveryModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao registrar a entrega.');
    }
  };

  const removeItem = async (itemId: string) => {
    if (!selectedOrder) return;
    if (!canManageItems) {
      toast.warning('Seu perfil não possui permissão para remover itens nesta O.S.');
      return;
    }
    const current = selectedOrder.items?.find((i: any) => i.id === itemId);
    if (current?.type?.toLowerCase() === 'part' && !canManageStock) {
      toast.warning('Seu perfil não possui permissão para alterar estoque de peças.');
      return;
    }
    if (!(await confirm({ title: 'Remover item', message: 'Remover este item? O estoque será estornado.', confirmLabel: 'Remover', danger: true }))) return;
    try {
      await serviceOrdersApi.removeItem(selectedOrder.id, itemId);
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      loadOrders();
    } catch (err) { console.error(err); }
  };

  // Normalise type to lowercase for filtering (seed uses)
  const itemsOf = (type: string) =>
    (selectedOrder?.items ?? []).filter((i: any) => i.type?.toLowerCase() === type);

  const serviceItems = [...itemsOf('service'), ...itemsOf('labor')];
  const partItems = itemsOf('part');
  const vehiclesOfSelectedCustomer = vehicles.filter((v) => v.customerId === newOrder.customerId);
  const executorOptions = executors.filter((u: any) =>
    ['MASTER', 'ADMIN', 'CHEFE_OFICINA', 'MECANICO', 'PRODUTIVO'].includes(String(u.role || '').toUpperCase())
  );
  const nextStatuses = selectedOrder
    ? (activeStatusFlow[selectedOrder.status] ?? []).filter((status) => canMoveToStatus(userRole, status))
    : [];

  // Próxima ação da O.S.: primeira transição positiva do fluxo, destacada no topo da tela.
  const primaryNext = nextStatuses.find((status) => status !== 'CANCELADO' && status !== 'REPROVADO');
  const runStatusAction = async (status: string) => {
    if (status === 'ENTREGUE') { setDeliveryModal({ mode: 'confirm', override: false }); return; }
    changeStatus(status);
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      orderCode(o).toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.vehicle?.plate?.toLowerCase().includes(search.toLowerCase()) ||
      o.vehicle?.model?.toLowerCase().includes(search.toLowerCase()) ||
      o.equipmentBrand?.toLowerCase().includes(search.toLowerCase()) ||
      o.equipmentModel?.toLowerCase().includes(search.toLowerCase()) ||
      o.serialNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-120px)] gap-6 lg:overflow-hidden">
      {/* LISTA DE OS */}
      <div className="w-full lg:w-80 max-h-[22rem] lg:max-h-none shrink-0 flex flex-col bg-surface-950 border border-surface-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-surface-800/60 bg-surface-900/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-surface-100 flex items-center gap-2 text-sm">
              <ClipboardList size={16} /> Ordens de Serviço
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
                title="Importar orçamento em PDF"
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
                  <span className="text-[11px] font-mono font-bold text-surface-500">{'#' + orderCode(order)}</span>
                  <span className={cn('mt-1 h-2 w-2 rounded-full', statusIndicator(statusConfig[order.status]?.tone))} />
                </div>
                <p className="font-bold text-surface-100 text-sm truncate leading-none mb-1">{order.customer?.name}</p>
                <p className="text-xs text-surface-500 font-semibold mb-2">
                  {getOrderAssetLabel(order)}
                </p>
                <div className="flex justify-between items-center">
                  <StatusChip tone={statusConfig[order.status]?.tone}>{st.label}</StatusChip>
                  <span className="text-xs font-bold text-surface-100">
                    R$ {fmtBR(order.totalCost)}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredOrders.length === 0 && !loading && (
            <p className="p-10 text-center text-sm font-semibold text-surface-600">
              Nenhuma O.S. encontrada
            </p>
          )}
        </div>
      </div>

      {/*  DETALHE DA OS  */}
      <div className="flex-1 flex flex-col bg-white border border-surface-800 rounded-xl overflow-hidden shadow-sm">
        {!selectedOrder ? (
          <div className="flex-1 flex flex-col items-center justify-center text-surface-700 opacity-50">
            <Layout size={64} className="mb-4 stroke-[1px]" />
            <p className="font-semibold text-sm">Selecione uma ordem de serviço</p>
          </div>
        ) : (
          <>
            {/* Top bar: uma ação principal (Salvar); o resto em dois menus */}
            <div className="p-6 border-b border-surface-800/60 bg-surface-950/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center text-white shrink-0">
                  <FileText size={24} />
                </div>
                <h1 className="text-xl font-bold text-surface-100 tracking-tight truncate">
                  O.S. #{orderCode(selectedOrder)}
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {primaryNext && (
                  <button type="button"
                    onClick={() => runStatusAction(primaryNext)}
                    className="h-12 px-6 rounded-lg text-sm font-semibold flex items-center gap-2 bg-accent text-white hover:bg-accent-hover transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2"
                    title="Próxima etapa desta O.S."
                  >
                    {STATUS_ACTION_LABEL[primaryNext] || statusConfig[primaryNext]?.label || primaryNext}
                    <ArrowRight size={16} />
                  </button>
                )}
                <div className="relative">
                  <button type="button"
                    onClick={() => { setShowDocsMenu((v) => !v); setShowMoreMenu(false); }}
                    className="h-11 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 border border-surface-800 bg-white text-surface-100 hover:bg-surface-950 transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={showDocsMenu}
                  >
                    <FileText size={16} /> Documentos <ChevronDown size={14} />
                  </button>
                  {showDocsMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowDocsMenu(false)} />
                      <div role="menu" className="absolute right-0 mt-2 w-72 z-30 bg-surface-900 border border-line rounded-lg shadow-xl py-1">
                        {availableDocuments(selectedOrder).map((d) => (
                          <button type="button" role="menuitem" key={`${d.kind}-${d.warranty ?? ''}`}
                            onClick={() => { setShowDocsMenu(false); openOrderDocument(d.kind, d.warranty); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-ink/5 transition-colors"
                          >
                            <div className="text-sm font-semibold text-surface-100">{d.label}</div>
                            <div className="text-xs text-surface-500">{d.hint}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="relative">
                  <button type="button"
                    onClick={() => { setShowMoreMenu((v) => !v); setShowDocsMenu(false); }}
                    className="h-11 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 border border-surface-800 bg-white text-surface-100 hover:bg-surface-950 transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={showMoreMenu}
                  >
                    Mais ações <ChevronDown size={14} />
                  </button>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowMoreMenu(false)} />
                      <div role="menu" className="absolute right-0 mt-2 w-80 z-30 bg-surface-900 border border-line rounded-lg shadow-xl py-1">
                        {(['ENTRADA', 'SAIDA'] as const).map((kind) => {
                          const label = kind === 'ENTRADA' ? 'Checklist de entrada' : 'Checklist de saída';
                          const filled = checklistFlags[kind];
                          return (
                            <button type="button" role="menuitem" key={kind}
                              disabled={!canUseChecklist}
                              onClick={() => { setShowMoreMenu(false); setChecklistModal(kind); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-ink/5 transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                              <div className={cn('flex items-center gap-2 text-sm font-semibold', canUseChecklist ? 'text-surface-100' : 'text-surface-500')}>
                                <ClipboardCheck size={16} /> {label}
                                {canUseChecklist && filled && <span className="ml-auto text-xs font-semibold text-accent-ink">Preenchido</span>}
                              </div>
                              {!canUseChecklist && <div className="text-xs text-surface-500 pl-6">Disponível nos planos PRO e REDE.</div>}
                            </button>
                          );
                        })}
                        <button type="button" role="menuitem"
                          disabled={isClosed || !canManageItems}
                          onClick={() => {
                            setShowMoreMenu(false);
                            setImportTargetOrderId(selectedOrder.id);
                            setShowImportModal(true);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-ink/5 transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <div className={cn('flex items-center gap-2 text-sm font-semibold', isClosed || !canManageItems ? 'text-surface-500' : 'text-surface-100')}>
                            <FileUp size={16} /> Importar orçamento externo
                          </div>
                          {(isClosed || !canManageItems) && (
                            <div className="text-xs text-surface-500 pl-6">
                              {isClosed ? 'O.S. finalizada não recebe importação.' : 'Seu perfil não pode importar itens nesta O.S.'}
                            </div>
                          )}
                        </button>
                        {canDelete && (
                          <button type="button" role="menuitem"
                            onClick={() => { setShowMoreMenu(false); openDeleteModal(); }}
                            className="w-full text-left px-4 py-2.5 border-t border-line hover:bg-red-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                              <Trash2 size={16} /> Excluir O.S.
                            </div>
                            <div className="text-xs text-surface-500 pl-6">Remove de vez. Só o MASTER pode.</div>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <button type="button"
                  onClick={() => saveDetails(false)}
                  disabled={isClosed || !canEditOrderDetails}
                  className={cn('h-11 px-5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed', primaryNext ? 'border border-surface-800 bg-white text-surface-100 hover:bg-surface-950' : 'bg-accent text-white hover:bg-accent-hover')}
                  title={isClosed ? 'O.S. finalizada não pode ser editada.' : !canEditOrderDetails ? 'Seu perfil não pode editar esta O.S.' : undefined}
                >
                  <Save size={16} /> Salvar alterações
                </button>
                <button type="button"
                  onClick={() => navigate('/service-orders')}
                  className="h-11 w-11 rounded-lg flex items-center justify-center border border-surface-800 bg-white text-surface-300 hover:bg-surface-950 transition-colors"
                  aria-label="Fechar O.S."
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Banner: dados da entrega (O.S. entregue = fluxo encerrado e travado) */}
            {selectedOrder.status === 'ENTREGUE' && (() => {
              const registered = Boolean(selectedOrder.deliveredAt && selectedOrder.deliveredTo);
              const pending = selectedOrder.paidAt ? 0 : Number(selectedOrder.totalCost || 0);
              return (
                <div className="mx-6 mt-4 p-4 bg-accent-soft border border-accent/40 rounded-lg flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-surface-100 space-y-1">
                    {!registered && <p className="font-bold">Data e recebedor da entrega ainda não foram registrados.</p>}
                    {pending > 0 && <p className="text-amber-700 font-bold">Saldo pendente: R$ {fmtBR(pending)}</p>}
                    {registered && (
                      <p className="text-[12px] font-medium text-surface-500">
                        O.S. encerrada e travada para edição. Para alterar, mude o status e ajuste novamente.
                      </p>
                    )}
                  </div>
                  {!registered && ['MASTER', 'ADMIN'].includes(userRole) && (
                    <button type="button"
                      onClick={() => setDeliveryModal({ mode: 'edit', override: false })}
                      className="shrink-0 min-h-[40px] px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors"
                    >
                      Registrar entrega
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Banner: OS reprovada + opção de diagnostico */}
            {isReprovado && showDiagBanner && canCreateDiagnostic && (
              <div className="mx-6 mt-4 p-4 bg-accent-soft border border-accent/40 rounded-lg flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={22} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden />
                  <div>
                    <p className="text-sm font-bold text-ink">Orçamento reprovado pelo cliente</p>
                    <p className="text-xs text-muted mt-0.5">
                      Deseja abrir uma nova O.S. para cobrança da <strong>Taxa de Diagnóstico</strong>?
                      O valor e o tempo serão preenchidos automaticamente conforme as configurações da oficina.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button type="button"
                    onClick={createDiagnosticOrder}
                    disabled={creatingDiagOrder}
                    className="min-h-[44px] px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
                  >
                    {creatingDiagOrder ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Sim, criar nova O.S.
                  </button>
                  <button type="button"
                    onClick={() => setShowDiagBanner(false)}
                    className="min-h-[44px] px-4 py-2 bg-panel border border-line text-muted rounded-lg text-sm font-semibold hover:bg-panel-2 transition-colors whitespace-nowrap"
                  >
                    Não, obrigado
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">

              {/* Andamento da O.S. */}
              <div className="rounded-lg border border-surface-800 bg-surface-950/70 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-surface-500">Andamento da O.S.</h3>
                  <span className="text-[11px] font-bold text-surface-300">
                    Fase atual: {activeFlowPhases[getCurrentPhaseIndex(selectedOrder.status)]?.label || 'Abertura'}
                    {primaryNext ? ` · Próxima ação: ${STATUS_ACTION_LABEL[primaryNext] || primaryNext}` : ''}
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
                      <p className="text-[11px] font-bold leading-snug">
                        {phase.label}
                        {canOpenMetrologia && (
                          <span className="block text-[11px] font-semibold normal-case tracking-normal mt-0.5 opacity-75">
                            {selectedOrder.status === 'METROLOGIA' ? 'ver / editar' : 'iniciar'}
                          </span>
                        )}
                      </p>
                    );
                    return canOpenMetrologia ? (
                      <button
                        key={phase.key}
                        type="button"
                        onClick={() => setMetrologiaOsTarget({ id: selectedOrder.id, number: orderCode(selectedOrder), metrology: selectedOrder.metrology ?? null })}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-center transition-all cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-accent/40',
                          isCurrent && 'border-accent bg-accent text-white',
                          isDone && 'border-accent/30 bg-accent-soft text-accent-ink',
                          !isCurrent && !isDone && index === currentIdx + 1 && 'border-accent/50 bg-white text-accent-ink',
                          !isCurrent && !isDone && index !== currentIdx + 1 && 'border-surface-800 bg-white text-surface-600'
                        )}
                      >
                        {inner}
                      </button>
                    ) : (
                      <div key={phase.key} className={cn(
                        'rounded-xl border px-3 py-2 text-center transition-all',
                        isCurrent && 'border-accent bg-accent text-white',
                        isDone && 'border-accent/30 bg-accent-soft text-accent-ink',
                        !isCurrent && !isDone && index === currentIdx + 1 && 'border-accent/50 bg-white text-accent-ink',
                          !isCurrent && !isDone && index !== currentIdx + 1 && 'border-surface-800 bg-white text-surface-600'
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
                  <h3 className="text-[11px] font-bold text-surface-500 mb-4 flex items-center gap-2">
                    <User size={13} className="text-surface-100" /> Dados do Cliente
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-[11px] text-surface-500 font-bold mb-1">Nome do Cliente</p>
                      <p className="font-bold text-surface-100">{selectedOrder.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-surface-500 font-bold mb-1">Telefone</p>
                      <p className="font-bold text-surface-300 text-sm">{selectedOrder.customer?.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-surface-500 font-bold mb-1">Documento</p>
                      <p className="font-bold text-surface-300 text-sm">{selectedOrder.customer?.document || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-accent rounded-lg p-5 text-white shadow-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-[11px] font-bold text-white flex items-center gap-2">
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
                              if (!(await confirm({ title: 'Voltar etapa', message: `Voltar a O.S. para "${prevPhase.label}"? Use só para corrigir o fluxo.`, confirmLabel: 'Voltar etapa' }))) return;
                              await changeStatus(prevStatus, true);
                            }}
                            title={`Retroceder para: ${prevPhase.label}`}
                            className="mr-1.5 text-[11px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 transition-all"
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
                            'text-[11px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all hover:ring-2 hover:ring-offset-1 hover:ring-surface-700 cursor-pointer',
                            statusChip(statusConfig[selectedOrder.status]?.tone)
                          )}
                        >
                          {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}
                          <ChevronDown size={9} className={cn('transition-transform', showStatusDropdown && 'rotate-180')} />
                        </button>
                      ) : (
                        <span className={cn('text-[11px] px-2 py-0.5 rounded-md font-bold', statusChip(statusConfig[selectedOrder.status]?.tone))}>
                          {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}
                        </span>
                      )}

                      {showStatusDropdown && (
                        <div className="absolute top-full right-0 mt-1.5 z-50 bg-white border border-surface-800 rounded-lg shadow-2xl p-1.5 min-w-[210px]">
                          <p className="text-[11px] font-bold text-surface-600 px-3 py-1.5 border-b border-surface-900 mb-1">
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
                                    if (isNegative && !(await confirm({ title: 'Mudar status', message: `Mudar a O.S. para "${cfg.label}"?`, confirmLabel: 'Mudar status', danger: true }))) return;
                                    if (key === 'ENTREGUE') { setDeliveryModal({ mode: 'confirm', override: true }); return; }
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
                      <p className="text-[11px] text-white font-bold mb-1">Veículo</p>
                      <p className="font-bold text-white">{selectedOrder.vehicle ? `${selectedOrder.vehicle?.brand || ''} ${selectedOrder.vehicle?.model || ''}` : `${selectedOrder.equipmentBrand || 'Motor'} ${selectedOrder.equipmentModel || 'Avulso'}`}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-white font-bold mb-1">{selectedOrder.vehicle ? 'Placa' : 'Serie / ID'}</p>
                      <p className="font-mono font-bold text-white">{selectedOrder.vehicle?.plate || selectedOrder.serialNumber || '-'}</p>
                    </div>
                    {selectedOrder.vehicle && (
                      <div>
                        <p className="text-[11px] text-white font-bold mb-1">Chassi / VIN</p>
                        <p className="font-mono font-bold text-white text-sm">{selectedOrder.vehicle?.vin || '-'}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] text-white font-bold mb-1">{selectedOrder.vehicle ? 'Ano / Cor' : 'Tipo de entrada'}</p>
                      <p className="font-bold text-white text-sm">{selectedOrder.vehicle ? `${selectedOrder.vehicle?.year || '-'} / ${selectedOrder.vehicle?.color || '-'}` : 'Motor avulso'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-white font-bold mb-1">KM Atual</p>
                      <p className="font-bold text-white text-sm">{selectedOrder.vehicle?.km ? Number(selectedOrder.vehicle.km).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-white font-bold mb-1">KM Entrada</p>
                      <p className="font-bold text-white text-sm">{selectedOrder.kmEntrada ? Number(selectedOrder.kmEntrada).toLocaleString('pt-BR') : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Entrega: fica registrada na O.S. após a retirada do veículo */}
              {(selectedOrder.status === 'ENTREGUE' || selectedOrder.deliveredAt || selectedOrder.deliveredTo) && (
                <div className="bg-surface-950 rounded-lg px-5 py-4 border border-surface-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-bold text-surface-500 mb-1">Data da entrega</p>
                    <p className="font-bold text-surface-100">
                      {selectedOrder.deliveredAt
                        ? new Date(selectedOrder.deliveredAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                        : 'Não registrada'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-surface-500 mb-1">Recebido por</p>
                    <p className="font-bold text-surface-100">{selectedOrder.deliveredTo || 'Não registrado'}</p>
                  </div>
                </div>
              )}

              {/* Campos texto */}
              <div className="grid grid-cols-1 gap-4">
                {(['complaint', 'diagnosis', 'technicalReport'] as const).map((field, i) => (
                  <div key={field} className="space-y-1.5">
                    <label htmlFor="fld-serviceorderspage-1" className="block text-sm font-semibold text-muted">
                      {['Reclamação Inicial', 'Diagnóstico Técnico', 'Laudo / Solução'][i]}
                    </label>
                    <textarea id="fld-serviceorderspage-1"
                      aria-label={['Reclamação Inicial', 'Diagnóstico Técnico', 'Laudo / Solução'][i]}
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
                  <p className="text-[11px] font-bold text-surface-500">Reserva de Peças no Orçamento</p>
                  <p className="text-xs text-surface-400 mt-1">
                    Quando marcado, sinaliza a reserva das peças para esta O.S. Na aprovação do orçamento, todas as peças pendentes serão debitadas do estoque automaticamente.
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
                  <h3 className="text-[11px] font-bold text-surface-100 flex items-center gap-2">
                    <Wrench size={14} /> Serviços realizados
                    <span className="bg-surface-800 text-surface-300 rounded-md px-1.5 py-0.5 text-[11px] font-bold">{serviceItems.length}</span>
                  </h3>
                  <button type="button"
                    onClick={() => openCatalog('service')}
                    disabled={!canManageItems}
                    className="text-[11px] font-semibold bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-1"
                    title={!canManageItems ? 'Sem permissão para adicionar itens' : undefined}
                  >
                    <Plus size={12} /> Adicionar serviço
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-950/60 text-surface-500 font-bold text-[11px]">
                    <tr>
                      <th className="px-5 py-3 border-b border-surface-800/70">Descrição</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-56">Executor</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-20 text-center">Qtd/Hrs</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-20 text-center">Desc. %</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-28">Unitário</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-28 text-right">Subtotal</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-900/70">
                    {serviceItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-surface-950/60">
                        <td className="px-5 py-3 font-bold text-surface-100">
                          <div>{item.description}</div>
                          {!item.serviceId && <div className="mt-1 text-[11px] font-bold text-amber-600">Fora do cadastro de serviços</div>}
                        </td>
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
                              'w-full rounded-lg border px-2 py-1.5 text-[12px] font-bold',
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
                          <NumberInput
                            aria-label={`Quantidade do serviço ${item.description}`} step="0.5" min="0.5"
                            className="w-16 bg-surface-950 border border-transparent hover:border-surface-800 rounded-md px-2 py-1 text-center font-bold text-xs"
                            value={pendingQtyByItem[item.id] ?? item.quantity}
                            onChange={(e) => setPendingQtyByItem({ ...pendingQtyByItem, [item.id]: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <NumberInput
                            aria-label={`Desconto percentual do serviço ${item.description}`} step="1" min="0" max="100"
                            disabled={isClosed || !canManageItems}
                            className={cn(
                              'w-16 border border-transparent rounded-md px-2 py-1 text-center font-bold text-xs',
                              isClosed || !canManageItems ? 'bg-surface-900 text-surface-600 cursor-not-allowed' : 'bg-surface-950 hover:border-surface-800'
                            )}
                            value={pendingDiscountPctByItem[item.id] ?? itemDiscountPercent(item)}
                            onChange={(e) => setPendingDiscountPctByItem({ ...pendingDiscountPctByItem, [item.id]: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-5 py-3 text-surface-400">R$ {fmtBR(item.unitPrice)}</td>
                        <td className="px-5 py-3 font-bold text-surface-100 text-right">R$ {fmtBR(item.totalPrice)}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {canRegisterCatalog && !isClosed && !item.serviceId && (
                            <button
                              type="button"
                              aria-label="Incluir serviço no cadastro"
                              title="Incluir no cadastro"
                              onClick={() => setRegisterItem(item)}
                              className="p-1 rounded text-accent-ink hover:text-accent-hover transition-colors"
                            >
                              <PackagePlus size={15} />
                            </button>
                          )}
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
                      <tr><td colSpan={7} className="px-5 py-6 text-center text-surface-600 text-xs">Nenhum serviço lançado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pecas */}
              <div className="bg-white border border-surface-800 rounded-lg overflow-hidden">
                <div className="px-5 py-3 bg-surface-950 border-b border-surface-800/70 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-surface-100 flex items-center gap-2">
                    <Package size={14} /> Peças e materiais
                    <span className="bg-surface-800 text-surface-300 rounded-md px-1.5 py-0.5 text-[11px] font-bold">{partItems.length}</span>
                  </h3>
                  <button type="button"
                    onClick={() => openCatalog('part')}
                    className={cn(
                      'text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1',
                      canManageStock ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-panel-2 text-muted'
                    )}
                    title={canManageStock ? 'Lançar peça' : 'Sem permissão para alterar estoque'}
                  >
                    <Plus size={12} /> Lançar peça
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-950/60 text-surface-500 font-bold text-[11px]">
                    <tr>
                      <th className="px-5 py-3 border-b border-surface-800/70">Descrição</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-20 text-center">Qtd</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-20 text-center">Desc. %</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-28">Unitário</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-28 text-right">Subtotal</th>
                      <th className="px-5 py-3 border-b border-surface-800/70 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-900/70">
                    {partItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-surface-950/60">
                        <td className="px-5 py-3 font-bold text-surface-100">
                          <div>{item.description}</div>
                          {!item.partId && (
                            <div className="mt-1 text-[11px] font-bold text-amber-600">
                              Fora do cadastro de peças{item.internalCode ? ` · Cód. ${item.internalCode}` : ''}
                            </div>
                          )}
                          <div className="mt-1 text-[11px] text-surface-500 font-bold">
                            Estoque atual: <span className={cn('font-bold', Number(item.part?.currentStock || 0) > 0 ? 'text-emerald-600' : 'text-red-600')}>{Number(item.part?.currentStock || 0)}</span>
                            {' - '}Status: {item.applied ? 'Baixada' : 'Pendente'}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <NumberInput
                            aria-label={`Quantidade da peça ${item.description}`} min="1"
                            disabled={isClosed || !canManageStock}
                            className={cn(
                              'w-16 border border-transparent rounded-md px-2 py-1 text-center font-bold text-xs',
                              isClosed || !canManageStock ? 'bg-surface-900 text-surface-600 cursor-not-allowed' : 'bg-surface-950 hover:border-surface-800'
                            )}
                            value={pendingQtyByItem[item.id] ?? item.quantity}
                            onChange={(e) => setPendingQtyByItem({ ...pendingQtyByItem, [item.id]: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <NumberInput
                            aria-label={`Desconto percentual da peça ${item.description}`} step="1" min="0" max="100"
                            disabled={isClosed || !canManageStock}
                            className={cn(
                              'w-16 border border-transparent rounded-md px-2 py-1 text-center font-bold text-xs',
                              isClosed || !canManageStock ? 'bg-surface-900 text-surface-600 cursor-not-allowed' : 'bg-surface-950 hover:border-surface-800'
                            )}
                            value={pendingDiscountPctByItem[item.id] ?? itemDiscountPercent(item)}
                            onChange={(e) => setPendingDiscountPctByItem({ ...pendingDiscountPctByItem, [item.id]: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-5 py-3 text-surface-400">R$ {fmtBR(item.unitPrice)}</td>
                        <td className="px-5 py-3 font-bold text-surface-100 text-right">R$ {fmtBR(item.totalPrice)}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {canRegisterCatalog && !isClosed && !item.partId && (
                            <button
                              type="button"
                              aria-label="Incluir peça no cadastro"
                              title="Incluir no cadastro"
                              onClick={() => setRegisterItem(item)}
                              className="p-1 rounded text-accent-ink hover:text-accent-hover transition-colors"
                            >
                              <PackagePlus size={15} />
                            </button>
                          )}
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
                      <tr><td colSpan={6} className="px-5 py-6 text-center text-surface-600 text-xs">Nenhuma peça lançada</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ações + Pagamento + Totais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-surface-800/70">

                {/* Avançar status */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-surface-500">Avançar Status</h4>
                  <div className="flex flex-col gap-1.5">
                    {nextStatuses.length === 0 && (
                      <p className="text-[11px] font-bold text-surface-600">Fluxo encerrado para este status.</p>
                    )}
                    {selectedOrder.status === 'ENTREGUE' && (
                      <div className="rounded-lg border border-surface-800 bg-surface-950/70 p-3 text-[11px] font-bold text-surface-300 space-y-1">
                        <p>Entregue em: <span className="text-surface-100">{selectedOrder.deliveredAt ? new Date(selectedOrder.deliveredAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'não registrado'}</span></p>
                        <p>Recebido por: <span className="text-surface-100">{selectedOrder.deliveredTo || 'não registrado'}</span></p>
                        {!(selectedOrder.deliveredTo && selectedOrder.deliveredAt) && ['MASTER', 'ADMIN'].includes(userRole) && (
                          <button type="button"
                            onClick={() => setDeliveryModal({ mode: 'edit', override: false })}
                            className="mt-1 text-accent-ink hover:text-accent-hover underline"
                          >
                            Registrar dados da entrega
                          </button>
                        )}
                      </div>
                    )}
                    {['MASTER', 'ADMIN'].includes(userRole) && selectedOrder.status === 'PRONTO_ENTREGA' && (
                      <button type="button"
                        onClick={() => setDeliveryModal({ mode: 'confirm', override: true })}
                        className="w-full px-3 py-2 rounded-xl text-[11px] font-bold transition-all text-left bg-amber-500/15 text-amber-700 border border-amber-500/30 hover:bg-amber-500/25"
                        title="Registra a entrega sem a quitação; o saldo segue em aberto"
                      >
                        Entregar sem quitação
                      </button>
                    )}
                    {nextStatuses.map((status) => {
                      const isCancel = status === 'CANCELADO';
                      const isReprovadoBtn = status === 'REPROVADO';
                      const isNegative = isCancel || isReprovadoBtn;
                      return (
                        <button type="button"
                          key={status}
                          onClick={async () => {
                            if (isNegative && !(await confirm({ title: 'Confirmar ação', message: `${STATUS_ACTION_LABEL[status] || status}?`, confirmLabel: 'Confirmar', danger: true }))) return;
                            if (status === 'ENTREGUE') { setDeliveryModal({ mode: 'confirm', override: false }); return; }
                            changeStatus(status);
                          }}
                          className={cn(
                            'w-full px-3 py-2 rounded-xl text-[11px] font-bold transition-all text-left',
                            isNegative
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              : 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                          )}
                        >
                          {STATUS_ACTION_LABEL[status] || statusConfig[status]?.label || status}
                        </button>
                      );
                    })}

                    {/* Revogar aprovação - MASTER/ADMIN, antes do início da execução */}
                    {['MASTER', 'ADMIN'].includes(userRole) && selectedOrder?.approvalStatus === 'APPROVED'
                      && ['APROVADO', 'AGUARDANDO_PECAS'].includes(selectedOrder?.status) && (
                      <button type="button"
                        onClick={revokeApproval}
                        className="w-full px-3 py-2 rounded-xl text-[11px] font-bold transition-all text-left bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        title="Volta a orçamento aguardando aprovação, com link novo para o cliente"
                      >
                        Revogar Aprovação
                      </button>
                    )}

                    {/* Botão Reservar Pecas - visível em APROVADO e AGUARDANDO_PECAS com pecas na OS */}
                    {canReserveParts && ['APROVADO', 'AGUARDANDO_PECAS'].includes(selectedOrder?.status) && partItems.length > 0 && (
                      <button type="button"
                        onClick={() => { setReserveResult(null); setExpectedPartsDate(''); setShowReserveParts(true); }}
                        className="w-full px-3 py-2 rounded-xl text-[11px] font-bold transition-all text-left bg-amber-500 text-white hover:bg-amber-600 shadow-sm flex items-center gap-1.5"
                      >
                        <ShoppingCart size={12} />
                        {selectedOrder?.partsReserved ? 'Rever Pedido de Peças' : 'Verificar / Reservar Peças'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Agendamento */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-surface-500">Agendamento</h4>
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
                  <h4 className="text-[11px] font-bold text-surface-500">Forma de Pagamento</h4>
                  <PaymentPlanEditor
                    plan={edit.paymentPlan}
                    onChange={(paymentPlan) => setEdit({ ...edit, paymentPlan })}
                    order={selectedOrder}
                    legacyMethod={edit.paymentMethod}
                    disabled={isClosed}
                  />
                </div>

                {/* Desconto */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-surface-500">Desconto</h4>
                  {isInstallmentPayment && (
                    <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      Desconto não é válido para pagamento a prazo parcelado.
                    </p>
                  )}
                  {!canGrantOrderDiscount && (
                    <p className="text-[11px] font-bold text-surface-500">Seu perfil não pode conceder desconto.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label htmlFor="fld-serviceorderspage-2" className="block text-sm font-semibold text-muted">Peças (%)</label>
                      <NumberInput id="fld-serviceorderspage-2"
                        aria-label="Desconto percentual em peças" min="0" max="100" step="1"
                        disabled={isClosed || !canGrantOrderDiscount || isInstallmentPayment}
                        value={edit.discountPartsPercent}
                        onChange={(e) => setEdit({ ...edit, discountPartsPercent: Number(e.target.value) })}
                        style={{ color: (isClosed || !canGrantOrderDiscount || isInstallmentPayment) ? undefined : '#0f172a' }}
                        className={cn(
                          'w-full px-3 py-2 rounded-xl border text-xs font-bold text-center transition-all',
                          (isClosed || !canGrantOrderDiscount || isInstallmentPayment)
                            ? 'bg-surface-900 border-surface-900 text-surface-600 cursor-not-allowed'
                            : 'bg-white border-surface-800'
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="fld-serviceorderspage-3" className="block text-sm font-semibold text-muted">Serviços (%)</label>
                      <NumberInput id="fld-serviceorderspage-3"
                        aria-label="Desconto percentual em serviços" min="0" max="100" step="1"
                        disabled={isClosed || !canGrantOrderDiscount || isInstallmentPayment}
                        value={edit.discountServicesPercent}
                        onChange={(e) => setEdit({ ...edit, discountServicesPercent: Number(e.target.value) })}
                        style={{ color: (isClosed || !canGrantOrderDiscount || isInstallmentPayment) ? undefined : '#0f172a' }}
                        className={cn(
                          'w-full px-3 py-2 rounded-xl border text-xs font-bold text-center transition-all',
                          (isClosed || !canGrantOrderDiscount || isInstallmentPayment)
                            ? 'bg-surface-900 border-surface-900 text-surface-600 cursor-not-allowed'
                            : 'bg-white border-surface-800'
                        )}
                      />
                    </div>
                  </div>
                  {userRole === 'GERENTE' && (
                    <p className="text-[11px] text-surface-500">
                      Seu limite: {Number(tenantFullData?.maxDiscountPercentParts ?? 0)}% em peças, {Number(tenantFullData?.maxDiscountPercentServices ?? 0)}% em serviços.
                    </p>
                  )}
                  {canGrantOrderDiscount && (
                    <p className="text-[11px] text-surface-600">Clique em "Salvar alterações" para aplicar o desconto.</p>
                  )}
                </div>

                {/* Totais */}
                <div className="bg-accent rounded-xl p-6 text-white shadow-xl flex flex-col gap-3">
                  <button type="button"
                    onClick={recalculateTotals}
                    disabled={syncingTotals || !canSyncOrder}
                    className="mb-2 inline-flex items-center justify-center gap-2 rounded-lg border border-accent bg-accent-hover px-4 py-2 text-[12px] font-bold text-white transition-all hover:bg-accent-hover disabled:opacity-60"
                    title={!canSyncOrder ? 'Sem permissão para atualizar O.S.' : undefined}
                  >
                    {syncingTotals ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Atualizar O.S.
                  </button>
                  {[
                    { label: 'Serviços', val: selectedOrder.totalServices },
                    { label: 'Peças', val: selectedOrder.totalParts },
                    ...(Number(selectedOrder.totalLabor) > 0 ? [{ label: 'Mao de Obra', val: selectedOrder.totalLabor }] : []),
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between text-[11px] font-bold text-white">
                      <span>{label}</span>
                      <span>R$ {fmtBR(val)}</span>
                    </div>
                  ))}
                  {(() => {
                    const totalGeral = Number(selectedOrder.totalParts) + Number(selectedOrder.totalServices) + Number(selectedOrder.totalLabor);
                    const discountPartsValue = Number(selectedOrder.totalParts) * (Number(selectedOrder.discountPartsPercent || 0) / 100);
                    const discountServicesValue = (Number(selectedOrder.totalServices) + Number(selectedOrder.totalLabor)) * (Number(selectedOrder.discountServicesPercent || 0) / 100);
                    return (
                      <>
                        <div className="pt-3 mt-1 border-t border-white/25 flex justify-between text-[11px] font-bold text-white/90">
                          <span>Total Geral</span>
                          <span>R$ {fmtBR(totalGeral)}</span>
                        </div>
                        {discountPartsValue > 0 && (
                          <div className="flex justify-between text-[11px] font-bold text-white/80">
                            <span>Desconto em peças ({fmtBR(selectedOrder.discountPartsPercent, 0)}%)</span>
                            <span>- R$ {fmtBR(discountPartsValue)}</span>
                          </div>
                        )}
                        {discountServicesValue > 0 && (
                          <div className="flex justify-between text-[11px] font-bold text-white/80">
                            <span>Desconto em serviços ({fmtBR(selectedOrder.discountServicesPercent, 0)}%)</span>
                            <span>- R$ {fmtBR(discountServicesValue)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="pt-3 border-t border-accent">
                    <p className="text-[11px] font-bold text-white mb-1">Total Geral com Desconto</p>
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
                    <h3 className="font-bold text-white text-sm">Reserva de Peças</h3>
                    <p className="text-[11px] text-white font-semibold">OS {orderCode(selectedOrder)} - {partItems.length} peca(s) na OS</p>
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
                      <p className="text-[11px] font-bold text-surface-500">Peças desta OS</p>
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
                                {item.part?.internalCode && <p className="text-surface-500 text-[11px]">Cod: {item.part.internalCode}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-surface-300">Nec: {needed}</p>
                              <p className={cn('text-[11px] font-bold', ok ? 'text-accent-ink' : 'text-red-600')}>Estoque: {stock}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Data prevista chegada */}
                    <div className="space-y-1.5">
                      <label htmlFor="fld-serviceorderspage-4" className="block text-sm font-semibold text-muted">
                        <Calendar size={11} /> Data prevista de chegada (para pecas faltantes)
                      </label>
                      <input id="fld-serviceorderspage-4"
                        aria-label="Data prevista de chegada"
                        type="date"
                        value={expectedPartsDate}
                        min={new Date().toISOString().slice(0,10)}
                        onChange={(e) => setExpectedPartsDate(e.target.value)}
                        className="w-full border border-surface-800 rounded-xl px-3 py-2 text-sm text-surface-300 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                      />
                      <p className="text-[11px] text-surface-500">Opcional. Peças disponíveis serão reservadas imediatamente. Peças faltantes gerarão um Pedido de Compra.</p>
                    </div>

                    <button type="button"
                      onClick={handleReserveParts}
                      disabled={reserveLoading}
                      className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
                        <p className="text-[11px] font-bold text-accent-ink">Reservadas</p>
                        <p className="text-[11px] text-accent-ink/80 mt-0.5">Baixadas do estoque</p>
                      </div>
                      <div className={cn('border rounded-lg p-4 text-center', reserveResult.missing > 0 ? 'bg-red-50 border-red-200' : 'bg-surface-950 border-surface-800 text-surface-500')}>
                        <p className={cn('text-2xl font-bold', reserveResult.missing > 0 ? 'text-red-600' : 'text-surface-300')}>{reserveResult.missing}</p>
                        <p className={cn('text-[11px] font-bold', reserveResult.missing > 0 ? 'text-red-700' : 'text-surface-500')}>Faltantes</p>
                        <p className="text-[11px] text-surface-500 mt-0.5">{reserveResult.missing > 0 ? 'Pedido gerado' : 'Tudo disponível'}</p>
                      </div>
                    </div>

                    {/* Pecas faltantes */}
                    {reserveResult.missingItems?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-surface-500">Pedido de Compra</p>
                          <span className="bg-accent text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{reserveResult.purchaseOrderNumber}</span>
                        </div>
                        {reserveResult.missingItems.map((item: any, i: number) => (
                          <div key={i} className="flex items-start justify-between rounded-xl px-3 py-2 bg-red-50 border border-red-200 text-xs">
                            <div>
                              <p className="font-bold text-surface-100">{item.description}</p>
                              <p className="text-surface-500 text-[11px]">Cod: {item.internalCode || '-'} - Orig: {item.sku || '-'} - Fornec: {item.supplierName || '-'}</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="font-bold text-red-700">Falta: {item.lacking}</p>
                              <p className="text-[11px] text-surface-500">Estoque: {item.inStock}</p>
                            </div>
                          </div>
                        ))}

                        <button type="button"
                          onClick={downloadPurchaseOrderPdf}
                          className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent-hover transition-all"
                        >
                          <Printer size={14} /> Imprimir Pedido de Compra
                        </button>
                      </div>
                    )}

                    <button type="button"
                      onClick={() => setShowReserveParts(false)}
                      className="w-full py-2.5 rounded-xl bg-surface-900 text-surface-300 font-bold text-xs hover:bg-surface-800 transition-all"
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
                    <h3 className="font-bold text-surface-100 text-sm">
                      {catalogMode === 'service' ? 'Adicionar Serviço' : 'Lançar Peça'}
                    </h3>
                    <p className="text-[11px] text-surface-500 font-bold">
                      {catalogMode === 'service' ? 'Catálogo ou lançamento avulso' : 'Catálogo ou peça avulsa'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => { setShowAiPanel((v) => !v); setAiSuggestions([]); setAiDescription(''); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all',
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
                      <p className="text-[11px] font-bold text-surface-300 flex items-center gap-1">
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
                          className="h-9 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-[11px] font-semibold transition-all shadow flex items-center gap-1 disabled:opacity-50"
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
                                  <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded-full', s.type === 'service' ? 'bg-surface-900 text-surface-300' : 'bg-black/50 text-surface-300')}>
                                    {s.type === 'service' ? 'Serviço' : 'Peça'}
                                  </span>
                                  <span className="text-[11px] font-bold text-surface-200 truncate">{s.description}</span>
                                </div>
                                <p className="text-[11px] text-surface-500 truncate">{s.reason}</p>
                              </div>
                              <div className="text-right shrink-0">
                                {s.estimatedPrice > 0 && (
                                  <p className="text-[11px] font-bold text-surface-300">R$ {Number(s.estimatedPrice).toFixed(2).replace('.', ',')}</p>
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
                                  className="mt-0.5 text-[11px] font-bold text-accent-ink hover:text-accent-ink disabled:opacity-40"
                                >
                                  + Lançar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!aiLoading && aiSuggestions.length === 0 && aiDescription.trim() && (
                        <p className="text-[11px] text-surface-600 text-center py-1">Nenhuma sugestao encontrada. Tente descrever com mais detalhes.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Add */}
              <div className="p-4 border-b border-surface-800/70 bg-surface-950">
                <p className="text-[11px] font-bold text-surface-300 mb-2 flex items-center gap-1">
                  <Zap size={11} />
                  {catalogMode === 'service' ? 'Serviço avulso (não cadastrado)' : 'Peça avulsa (não cadastrada)'}
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <label htmlFor="fld-serviceorderspage-5" className="block text-sm font-semibold text-muted">Descrição *</label>
                    <input id="fld-serviceorderspage-5"
                      aria-label="Descrição do item rápido"
                      type="text"
                      placeholder={catalogMode === 'service' ? 'Ex: Limpeza de bicos injetores' : 'Ex: Correia auxiliar Fiat Uno'}
                      value={quickAdd.description}
                      onChange={(e) => setQuickAdd({ ...quickAdd, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold focus:ring-2 focus:ring-surface-100/10 focus:border-accent transition-all"
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <label htmlFor="fld-serviceorderspage-6" className="block text-sm font-semibold text-muted">R$ *</label>
                    <input id="fld-serviceorderspage-6"
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
                    <label htmlFor="fld-serviceorderspage-7" className="block text-sm font-semibold text-muted">{catalogMode === 'service' ? 'Qtd/Hrs' : 'Qtd'}</label>
                    <NumberInput id="fld-serviceorderspage-7"
                      aria-label="Quantidade do item rápido"
                      min="0.5"
                      step={catalogMode === 'service' ? '0.5' : '1'}
                      value={quickAdd.quantity}
                      onChange={(e) => setQuickAdd({ ...quickAdd, quantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold text-center focus:ring-2 focus:ring-surface-100/10 transition-all"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <label htmlFor="fld-serviceorderspage-8" className="block text-sm font-semibold text-muted">Desc. %</label>
                    <NumberInput id="fld-serviceorderspage-8"
                      aria-label="Desconto percentual do item rápido"
                      min="0"
                      max="100"
                      step="1"
                      value={quickAdd.discountPercent}
                      onChange={(e) => setQuickAdd({ ...quickAdd, discountPercent: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-surface-800 bg-white text-xs font-bold text-center focus:ring-2 focus:ring-surface-100/10 transition-all"
                    />
                  </div>
                  <button type="button"
                    onClick={quickAddItem}
                    className="h-9 px-4 bg-accent hover:bg-accent-hover text-white rounded-xl text-[11px] font-semibold transition-all shadow flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus size={13} /> Lançar
                  </button>
                </div>
                {catalogMode === 'service' && (
                  <div className="mt-2">
                    <label htmlFor="fld-serviceorderspage-9" className="block text-sm font-semibold text-muted">Executor do Serviço</label>
                    <select id="fld-serviceorderspage-9"
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
                    placeholder={`Pesquisar no catálogo de ${catalogMode === 'service' ? 'serviços' : 'peças'}...`}
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
                            quantity: s.tmo > 0 && s.hourlyRate > 0 ? s.tmo : 1,
                            unitPrice: s.tmo > 0 && s.hourlyRate > 0 ? s.hourlyRate : (s.basePrice || s.hourlyRate || 0),
                            ...(quickAssignedUserId ? { assignedUserId: quickAssignedUserId } : {}),
                          })}
                          disabled={isClosed}
                          className="w-full p-4 bg-white border border-surface-800 rounded-lg hover:border-accent hover:shadow-md text-left transition-all group flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <div>
                            <p className="font-bold text-surface-100 text-sm">{s.name}</p>
                            <p className="text-[11px] text-surface-500 font-bold mt-0.5">
                              {s.tmo > 0 && s.hourlyRate > 0 ? `TMO:${s.tmo}h × R$ ${fmtBR(s.hourlyRate)}` : `R$ ${fmtBR(s.basePrice)}`}
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
                      <p className="text-center text-surface-600 text-xs py-8">Nenhum serviço encontrado no catálogo</p>
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
                                  <span className="text-[11px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded shrink-0">Estoque Baixo</span>
                                )}
                              </div>
                              <p className="text-[11px] text-surface-500 font-bold mt-0.5">
                                {p.internalCode && `${p.internalCode} - `}
                                Estoque: <span className={cn('font-bold', p.currentStock > 0 ? 'text-emerald-600' : 'text-red-600')}>{p.currentStock}</span>
                                {' - Mínimo: '}<span className="font-bold text-surface-300">{p.minStock || 0}</span>
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
                                title={isClosed ? 'O.S. finalizada não pode ser editada' : !canManageStock ? 'Somente MASTER/ADMIN podem alterar estoque' : notEnoughStock ? 'Quantidade maior que estoque disponível' : 'Adicionar peça'}
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
                      <p className="text-center text-surface-300 bg-surface-950 border border-surface-800 rounded-xl p-2 text-[12px] font-bold">
                        Apenas MASTER e ADMIN podem adicionar/remover pecas (altera estoque).
                      </p>
                    )}
                    {catalogItems.parts.filter((p) => p.name.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                      <p className="text-center text-surface-600 text-xs py-8">Nenhuma peça encontrada no catálogo</p>
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-[50%] max-h-[90vh] overflow-hidden p-3 md:p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-lg md:text-xl font-bold text-surface-100 tracking-tight">Nova OS</h2>
                <button type="button" aria-label="Fechar modal de nova ordem" onClick={() => setShowCreateModal(false)} className="text-surface-600 hover:text-surface-100"><X size={24} /></button>
              </div>
              <div className="grid gap-2">
                <form className="grid gap-2" onSubmit={async (e) => {
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
                } catch (err: any) { toast.error('Erro ao criar OS: ' + (err?.response?.data?.message || err?.message || 'Verifique os dados.')); }
              }}>
                {/* Tipo de documento */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'ORCAMENTO', label: 'Orçamento', desc: 'Aguarda aprovação do cliente' },
                    { value: 'ORDEM_SERVICO', label: 'Ordem de Serviço', desc: 'Serviço já autorizado' },
                    ...(canUseRetificaMode ? [{ value: 'RETIFICA_MOTOR', label: 'Retífica', desc: 'Motor avulso ou fluxo técnico especializado' }] : []),
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
                      <span className={cn('text-[11px] mt-0.5', newOrder.orderType === value ? 'text-surface-700' : 'text-surface-500')}>{desc}</span>
                    </button>
                  ))}
                </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label htmlFor="fld-serviceorderspage-10" className="block text-sm font-semibold text-muted">Cliente *</label>
                    <select id="fld-serviceorderspage-10" aria-label="Cliente da nova ordem" className="w-full px-3 py-2 rounded-md border border-surface-800 bg-white text-xs font-semibold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" value={newOrder.customerId} onChange={(e) => {
                      setNewOrder({ ...newOrder, customerId: e.target.value, vehicleId: '' });
                      setShowQuickVehicleForm(false);
                      setQuickVehicle({ plate: '', vin: '', brand: '', model: '', color: '', year: '' });
                    }} required>
                      <option value="">Selecione um cliente...</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-sm font-semibold text-muted">Veiculo {newOrder.orderType === 'RETIFICA_MOTOR' ? '(opcional)' : '*'}</label>
                      {newOrder.customerId && (
                        <button
                          type="button"
                          onClick={() => setShowQuickVehicleForm((prev) => !prev)}
                          className="text-[11px] font-bold text-accent-ink bg-accent-soft border border-accent/40 px-2.5 py-1 rounded-lg hover:bg-accent-soft transition-all"
                        >
                          <Plus size={11} className="inline mr-1" /> {showQuickVehicleForm ? 'Fechar cadastro' : 'Incluir veículo'}
                        </button>
                      )}
                    </div>
                    <select aria-label="Veículo da nova ordem" className="w-full px-3 py-2 rounded-md border border-surface-800 bg-white text-xs font-semibold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" value={newOrder.vehicleId} onChange={(e) => setNewOrder({ ...newOrder, vehicleId: e.target.value })} required={newOrder.orderType !== 'RETIFICA_MOTOR'}>
                      <option value="">{newOrder.orderType === 'RETIFICA_MOTOR' ? 'Motor avulso / sem veículo' : 'Selecione um veículo...'}</option>
                      {vehiclesOfSelectedCustomer.map((v) => <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>)}
                    </select>

                    {newOrder.customerId && vehiclesOfSelectedCustomer.length === 0 && !showQuickVehicleForm && (
                      <div className="rounded-xl bg-accent-soft border border-accent/40 px-3 py-2 text-xs text-accent-ink font-medium">
                        Este cliente ainda não possui veículo cadastrado. Clique em Incluir veículo para cadastrar agora.
                      </div>
                    )}

                    {newOrder.customerId && showQuickVehicleForm && (
                      <div className="rounded-lg border border-surface-800 bg-surface-950 p-2 space-y-2">
                        <p className="text-[11px] font-semibold text-surface-500">Cadastro rápido de veículo</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          <input
                            aria-label="Placa do veículo"
                            className="w-full px-2 py-1 rounded-md border border-surface-800 bg-white text-xs font-semibold"
                            placeholder="Placa *"
                            value={quickVehicle.plate}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, plate: e.target.value }))}
                          />
                          <input
                            aria-label="Chassi (VIN) do veículo"
                            className="w-full px-2 py-1 rounded-md border border-surface-800 bg-white text-xs font-semibold"
                            placeholder="Chassi / VIN (opcional)"
                            maxLength={17}
                            value={quickVehicle.vin}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, vin: e.target.value.toUpperCase() }))}
                          />
                          <input
                            aria-label="Marca do veículo"
                            className="w-full px-2 py-1 rounded-md border border-surface-800 bg-white text-xs font-semibold"
                            placeholder="Marca *"
                            value={quickVehicle.brand}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, brand: e.target.value }))}
                          />
                          <input
                            aria-label="Modelo do veículo"
                            className="w-full px-2 py-1 rounded-md border border-surface-800 bg-white text-xs font-semibold"
                            placeholder="Modelo *"
                            value={quickVehicle.model}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, model: e.target.value }))}
                          />
                          <input
                            aria-label="Cor do veículo"
                            className="w-full px-2 py-1 rounded-md border border-surface-800 bg-white text-xs font-semibold"
                            placeholder="Cor (opcional)"
                            value={quickVehicle.color}
                            onChange={(e) => setQuickVehicle((prev) => ({ ...prev, color: e.target.value }))}
                          />
                          <NumberInput
                            aria-label="Ano do veículo"
                            className="w-full px-2 py-1 rounded-md border border-surface-800 bg-white text-xs font-semibold"
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
                              'px-2 py-1 rounded-md text-xs font-semibold transition-all',
                              creatingQuickVehicle
                                ? 'bg-surface-800 text-surface-600 cursor-not-allowed'
                                : 'bg-accent text-white hover:bg-accent-hover'
                            )}
                          >
                            {creatingQuickVehicle ? 'Salvando...' : 'Salvar veículo'}
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
                              <span key={o.id} className="ml-1 font-mono font-bold">#{orderCode(o)}</span>
                            ))}
                          </p>
                          <p className="text-accent-ink/80">Você pode criar múltiplos orcamentos/OSs para o mesmo veículo. Verifique se não e duplicata.</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                {newOrder.orderType === 'RETIFICA_MOTOR' && !newOrder.vehicleId && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="fld-serviceorderspage-11" className="block text-sm font-semibold text-muted">Marca do motor</label>
                      <input id="fld-serviceorderspage-11" aria-label="Marca do motor" value={newOrder.equipmentBrand} onChange={(e) => setNewOrder({ ...newOrder, equipmentBrand: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" placeholder="Ex: VW" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="fld-serviceorderspage-12" className="block text-sm font-semibold text-muted">Modelo / família</label>
                      <input id="fld-serviceorderspage-12" aria-label="Modelo do motor" value={newOrder.equipmentModel} onChange={(e) => setNewOrder({ ...newOrder, equipmentModel: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" placeholder="Ex: AP 1.8" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="fld-serviceorderspage-13" className="block text-sm font-semibold text-muted">N. de serie</label>
                      <input id="fld-serviceorderspage-13" aria-label="Número de série" value={newOrder.serialNumber} onChange={(e) => setNewOrder({ ...newOrder, serialNumber: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-surface-800 bg-white text-sm font-bold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" placeholder="Opcional" />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label htmlFor="fld-serviceorderspage-14" className="block text-sm font-semibold text-muted">KM Entrada</label>
                  <NumberInput id="fld-serviceorderspage-14" aria-label="KM de entrada" className="w-full px-2.5 py-1.5 rounded-md border border-surface-800 bg-white text-xs font-semibold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" value={newOrder.kmEntrada} onChange={(e) => setNewOrder({ ...newOrder, kmEntrada: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="fld-serviceorderspage-15" className="block text-sm font-semibold text-muted">Data / Hora do Agendamento</label>
                  <input id="fld-serviceorderspage-15" aria-label="Data e hora do agendamento da nova ordem" type="datetime-local" className="w-full px-2.5 py-1.5 rounded-md border border-surface-800 bg-white text-xs font-semibold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all" value={newOrder.scheduledDate} onChange={(e) => setNewOrder({ ...newOrder, scheduledDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="fld-serviceorderspage-16" className="block text-sm font-semibold text-muted">Reclamação Principal</label>
                  <textarea id="fld-serviceorderspage-16" aria-label="Reclamação principal da nova ordem" className="w-full px-2.5 py-1.5 rounded-md border border-surface-800 bg-white text-xs font-semibold text-surface-300 focus:ring-4 focus:ring-surface-100/5 transition-all h-16 resize-none" value={newOrder.complaint} onChange={(e) => setNewOrder({ ...newOrder, complaint: e.target.value })} placeholder="O que o cliente relatou?" />
                </div>
                <label className="block text-sm font-semibold text-muted">
                  <input
                    type="checkbox"
                    checked={Boolean(newOrder.reserveStock)}
                    onChange={(e) => setNewOrder({ ...newOrder, reserveStock: e.target.checked })}
                    className="h-4 w-4 rounded border-surface-700 text-surface-100 focus:ring-surface-600"
                  />
                  Reservar peças para debitar automaticamente na aprovação
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-2 py-1 rounded-md text-xs font-semibold text-surface-500 hover:bg-surface-950 transition-all">Cancelar</button>
                  <button type="submit" className="px-2 py-1 bg-accent text-white rounded-md font-semibold hover:bg-accent-hover shadow transition-all">Criar Ordem</button>
                </div>
              </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {deliveryModal && selectedOrder && (
        <DeliveryModal
          mode={deliveryModal.mode}
          initialDate={deliveryModal.mode === 'edit' ? selectedOrder.deliveredAt : null}
          initialName={deliveryModal.mode === 'edit' ? selectedOrder.deliveredTo : null}
          unpaid={deliveryModal.mode === 'confirm' && selectedOrder.status !== 'FATURADO'}
          onClose={() => setDeliveryModal(null)}
          onSubmit={submitDelivery}
        />
      )}

      {registerItem && (
        <CatalogRegisterModal
          type={registerItem.type?.toLowerCase() === 'part' ? 'part' : 'service'}
          item={registerItem}
          onClose={() => setRegisterItem(null)}
          onSaved={(record) => linkItemToCatalog(registerItem, record)}
        />
      )}

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
              toast.success('Orçamento externo importado na O.S. com sucesso!');
            } else {
              toast.success('OS Importada com sucesso!');
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
                <h2 className="text-lg font-bold text-surface-100 tracking-tight">Excluir O.S.</h2>
                <p className="text-xs text-surface-500 font-medium">Esta ação e irreversível</p>
              </div>
            </div>

            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-700 font-medium space-y-1">
              <p><span className="font-bold">OS:</span> #{orderCode(selectedOrder)}</p>
              <p><span className="font-bold">Status atual:</span> {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}</p>
              <p><span className="font-bold">Total:</span> R$ {fmtBR(selectedOrder.totalCost)}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="fld-serviceorderspage-17" className="block text-sm font-semibold text-muted">
                Motivo da exclusão (opcional)
              </label>
              <textarea id="fld-serviceorderspage-17"
                aria-label="Motivo da exclusão"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Ex: Orçamento duplicado, erro de cadastro..."
                className="w-full px-4 py-3 rounded-xl border border-surface-800 text-sm text-surface-300 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="fld-serviceorderspage-18" className="block text-sm font-semibold text-muted">
                Digite o numero da O.S. para confirmar:
                <span className="ml-2 font-mono text-surface-100">{orderShortCode(selectedOrder)}</span>
              </label>
              <input id="fld-serviceorderspage-18"
                aria-label="Confirmação da exclusão"
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value.toUpperCase())}
                placeholder={`Digite ${orderShortCode(selectedOrder)}`}
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
                disabled={deleteConfirmInput.trim().toUpperCase() !== orderShortCode(selectedOrder).toUpperCase() || deleting}
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
