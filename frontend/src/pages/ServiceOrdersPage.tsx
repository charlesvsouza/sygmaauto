import { useEffect, useState } from 'react';
import { serviceOrdersApi, customersApi, vehiclesApi, servicesApi, inventoryApi, tenantsApi } from '../api/client';
import {
  ClipboardList, Plus, Search, Car, User, Clock, CheckCircle, XCircle,
  Wrench, Package, FileText, DollarSign, Play, Trash2, Layout, X,
  Printer, Save, Zap, Loader2, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const statusConfig: Record<string, { label: string; color: string }> = {
  ABERTA:               { label: 'Aberta',                color: 'bg-slate-100 text-slate-700' },
  ORCAMENTO:            { label: 'Orçamento',             color: 'bg-slate-100 text-slate-700' },
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

const PRINT_STYLE = `
@media screen {
  #os-print-doc { display: none; }
}
@media print {
  body * { visibility: hidden; }
  #os-print-doc, #os-print-doc * { visibility: visible; }
  #os-print-doc {
    position: absolute; left: 0; top: 0; width: 100%; background: white;
  }
  @page { size: A4; margin: 10mm 12mm; }
}
.os-doc {
  font-family: Arial, "Helvetica Neue", sans-serif;
  font-size: 10pt; color: #111; width: 100%;
}
.os-doc table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
.os-doc td, .os-doc th {
  border: 1px solid #888; padding: 4px 7px; font-size: 9pt; vertical-align: top;
}
.os-doc th { font-weight: bold; }
.os-doc .hdr td, .os-doc .hdr th {
  background: #1e293b !important; color: #fff !important;
  border-color: #1e293b !important; font-weight: bold;
  text-transform: uppercase; font-size: 9pt; letter-spacing: 0.04em;
}
.os-doc .total-final td {
  font-weight: bold; font-size: 13pt;
  background: #1e293b !important; color: #fff !important;
  border-color: #1e293b !important;
}
.os-doc .nb td, .os-doc .nb th { border-color: transparent; }
.os-doc .tr { text-align: right; }
.os-doc .tc { text-align: center; }
.os-doc hr { border: none; border-top: 1.5px solid #333; margin: 5px 0; }
`;

function fmtBR(v: number | string | undefined, dec = 2) {
  return Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function ServiceOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [tenantFullData, setTenantFullData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newOrder, setNewOrder] = useState({ customerId: '', vehicleId: '', complaint: '', kmEntrada: 0 });

  const [edit, setEdit] = useState({
    complaint: '', diagnosis: '', technicalReport: '',
    observations: '', notes: '', paymentMethod: '',
  });

  // Catalog state
  const [catalogMode, setCatalogMode] = useState<'service' | 'part' | null>(null);
  const [catalogItems, setCatalogItems] = useState<{ services: any[]; parts: any[] }>({ services: [], parts: [] });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [quickAdd, setQuickAdd] = useState({ description: '', unitPrice: '', quantity: '1' });
  const [partQties, setPartQties] = useState<Record<string, number>>({});
  const [pendingQtyByItem, setPendingQtyByItem] = useState<Record<string, number>>({});
  const [syncingTotals, setSyncingTotals] = useState(false);

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
      const [cRes, vRes, tRes] = await Promise.all([
        customersApi.getAll(),
        vehiclesApi.getAll(),
        tenantsApi.getMe(),
      ]);
      setCustomers(cRes.data);
      setVehicles(vRes.data);
      setTenantFullData(tRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectOrder = async (order: any) => {
    try {
      const res = await serviceOrdersApi.getById(order.id);
      const o = res.data;
      setSelectedOrder(o);
      setEdit({
        complaint: o.complaint || '',
        diagnosis: o.diagnosis || '',
        technicalReport: o.technicalReport || '',
        observations: o.observations || '',
        notes: o.notes || '',
        paymentMethod: o.paymentMethod || '',
      });
      setPendingQtyByItem({});
    } catch (err) {
      console.error(err);
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

    if (changedEntries.length === 0) {
      alert('Nenhuma alteracao de quantidade pendente.');
      return;
    }

    setSyncingTotals(true);
    try {
      await Promise.all(
        changedEntries.map(([itemId, newQty]) =>
          serviceOrdersApi.updateItem(selectedOrder.id, itemId, { quantity: Number(newQty) })
        )
      );

      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      setPendingQtyByItem({});
      loadOrders();
      alert('Calculos atualizados com sucesso.');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao atualizar calculos da O.S.');
    } finally {
      setSyncingTotals(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selectedOrder) return;
    try {
      await serviceOrdersApi.updateStatus(selectedOrder.id, { status });
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
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
      setQuickAdd({ description: '', unitPrice: '', quantity: '1' });
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = async (itemData: any) => {
    if (!selectedOrder) return;
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
    await addItem({ type: catalogMode, description: quickAdd.description.trim(), quantity: qty, unitPrice: price });
  };

  const updateItem = async (itemId: string, data: any) => {
    if (!selectedOrder) return;
    try {
      await serviceOrdersApi.updateItem(selectedOrder.id, itemId, data);
      const res = await serviceOrdersApi.getById(selectedOrder.id);
      setSelectedOrder(res.data);
      loadOrders();
    } catch (err) { console.error(err); }
  };

  const removeItem = async (itemId: string) => {
    if (!selectedOrder || !confirm('Remover este item? O estoque será estornado.')) return;
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
        {selectedOrder && tenantFullData && (
          <div className="os-doc">
            {/* Workshop header */}
            <table style={{ marginBottom: '5px' }}>
              <tbody>
                <tr>
                  <td style={{ border: 'none', paddingLeft: 0, verticalAlign: 'top', width: '60%' }}>
                    <div style={{ fontSize: '16pt', fontWeight: 900, lineHeight: 1.1 }}>{tenantFullData.name}</div>
                    {tenantFullData.document && (
                      <div style={{ fontSize: '9pt', marginTop: '3px' }}>
                        {tenantFullData.companyType || 'CNPJ'}: {tenantFullData.document}
                      </div>
                    )}
                    {tenantFullData.address && <div style={{ fontSize: '9pt' }}>{tenantFullData.address}</div>}
                    <div style={{ fontSize: '9pt' }}>
                      {tenantFullData.phone && `Tel: ${tenantFullData.phone}`}
                      {tenantFullData.phone && tenantFullData.email && '  |  '}
                      {tenantFullData.email}
                    </div>
                  </td>
                  <td style={{ border: '2px solid #1e293b', padding: '8px 12px', textAlign: 'right', verticalAlign: 'top', minWidth: '145px' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#555' }}>
                      Ordem de Serviço
                    </div>
                    <div style={{ fontSize: '20pt', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '2px', lineHeight: 1.1 }}>
                      {selectedOrder.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '9pt', color: '#444' }}>
                      Emitida: {new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    <div style={{ fontSize: '9pt', color: '#444' }}>
                      Status: <strong>{statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}</strong>
                    </div>
                    {selectedOrder.kmEntrada && (
                      <div style={{ fontSize: '9pt', color: '#444' }}>
                        KM Entrada: {Number(selectedOrder.kmEntrada).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <hr />

            {/* Customer */}
            <table>
              <tbody>
                <tr className="hdr"><td colSpan={4}>DADOS DO CLIENTE</td></tr>
                <tr>
                  <td colSpan={2}><strong>Nome / Razão Social:</strong> {selectedOrder.customer?.name}</td>
                  <td><strong>CPF / CNPJ:</strong> {selectedOrder.customer?.document || '—'}</td>
                  <td><strong>Telefone:</strong> {selectedOrder.customer?.phone || '—'}</td>
                </tr>
                {selectedOrder.customer?.address && (
                  <tr><td colSpan={4}><strong>Endereço:</strong> {selectedOrder.customer.address}</td></tr>
                )}
              </tbody>
            </table>

            {/* Vehicle */}
            <table>
              <tbody>
                <tr className="hdr"><td colSpan={6}>DADOS DO VEÍCULO</td></tr>
                <tr>
                  <td colSpan={2}><strong>Marca / Modelo:</strong> {selectedOrder.vehicle?.brand} {selectedOrder.vehicle?.model}</td>
                  <td><strong>Ano:</strong> {selectedOrder.vehicle?.year || '—'}</td>
                  <td><strong>Cor:</strong> {selectedOrder.vehicle?.color || '—'}</td>
                  <td><strong>Placa:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{selectedOrder.vehicle?.plate}</span></td>
                  <td><strong>KM Saída:</strong> {selectedOrder.kmSaida ? Number(selectedOrder.kmSaida).toLocaleString('pt-BR') : '—'}</td>
                </tr>
                {selectedOrder.vehicle?.vin && (
                  <tr><td colSpan={6}><strong>Chassi / VIN:</strong> {selectedOrder.vehicle.vin}</td></tr>
                )}
              </tbody>
            </table>

            {/* Complaint / Diagnosis */}
            {(selectedOrder.complaint || selectedOrder.diagnosis) && (
              <table>
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '8pt', textTransform: 'uppercase', color: '#444', marginBottom: '3px' }}>
                        Reclamação do Cliente
                      </div>
                      <div style={{ minHeight: '28px' }}>{selectedOrder.complaint || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold', fontSize: '8pt', textTransform: 'uppercase', color: '#444', marginBottom: '3px' }}>
                        Diagnóstico Técnico
                      </div>
                      <div style={{ minHeight: '28px' }}>{selectedOrder.diagnosis || '—'}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Technical report */}
            {selectedOrder.technicalReport && (
              <table>
                <tbody>
                  <tr className="hdr"><td>LAUDO / SOLUÇÃO APLICADA</td></tr>
                  <tr><td style={{ minHeight: '26px' }}>{selectedOrder.technicalReport}</td></tr>
                </tbody>
              </table>
            )}

            {/* Services */}
            {serviceItems.length > 0 && (
              <table>
                <thead>
                  <tr className="hdr"><td colSpan={4}>SERVIÇOS REALIZADOS</td></tr>
                  <tr>
                    <th>Descrição</th>
                    <th className="tc" style={{ width: '65px' }}>Qtd/Hrs</th>
                    <th className="tr" style={{ width: '90px' }}>Unitário</th>
                    <th className="tr" style={{ width: '90px' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceItems.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td className="tc">{Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                      <td className="tr">R$ {fmtBR(item.unitPrice)}</td>
                      <td className="tr">R$ {fmtBR(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Parts */}
            {partItems.length > 0 && (
              <table>
                <thead>
                  <tr className="hdr"><td colSpan={5}>PEÇAS E MATERIAIS</td></tr>
                  <tr>
                    <th style={{ width: '75px' }}>Cód. Interno</th>
                    <th>Descrição</th>
                    <th className="tc" style={{ width: '55px' }}>Qtd</th>
                    <th className="tr" style={{ width: '90px' }}>Unitário</th>
                    <th className="tr" style={{ width: '90px' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {partItems.map((item: any) => (
                    <tr key={item.id}>
                      <td style={{ fontSize: '8pt', color: '#555' }}>{item.part?.internalCode || '—'}</td>
                      <td>{item.description}</td>
                      <td className="tc">{Number(item.quantity).toLocaleString('pt-BR')}</td>
                      <td className="tr">R$ {fmtBR(item.unitPrice)}</td>
                      <td className="tr">R$ {fmtBR(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Totals + Payment side by side */}
            <table>
              <tbody>
                <tr className="nb">
                  {/* Payment / Observations — left column */}
                  <td style={{ border: 'none', width: '55%', verticalAlign: 'top', paddingRight: '8px' }}>
                    <table style={{ marginBottom: '5px' }}>
                      <tbody>
                        <tr className="hdr"><td colSpan={2}>FORMA DE PAGAMENTO</td></tr>
                        <tr>
                          <td style={{ fontSize: '11pt', fontWeight: 'bold' }}>
                            {selectedOrder.paymentMethod || edit.paymentMethod || '— Não informado —'}
                          </td>
                          <td className="tr" style={{ fontSize: '8pt', color: '#666' }}>
                            {['FATURADO', 'ENTREGUE'].includes(selectedOrder.status)
                              ? `Pago em ${selectedOrder.paidAt ? new Date(selectedOrder.paidAt).toLocaleDateString('pt-BR') : '—'}`
                              : 'Pagamento pendente'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {(selectedOrder.observations || selectedOrder.notes) && (
                      <table>
                        <tbody>
                          <tr className="hdr"><td>OBSERVAÇÕES</td></tr>
                          <tr><td style={{ minHeight: '28px', fontSize: '9pt' }}>{selectedOrder.observations || selectedOrder.notes}</td></tr>
                        </tbody>
                      </table>
                    )}
                  </td>

                  {/* Totals — right column */}
                  <td style={{ border: 'none', verticalAlign: 'top' }}>
                    <table>
                      <tbody>
                        <tr>
                          <td className="tr">Total Serviços</td>
                          <td className="tr" style={{ width: '110px' }}>R$ {fmtBR(selectedOrder.totalServices)}</td>
                        </tr>
                        <tr>
                          <td className="tr">Total Peças</td>
                          <td className="tr">R$ {fmtBR(selectedOrder.totalParts)}</td>
                        </tr>
                        {Number(selectedOrder.totalLabor) > 0 && (
                          <tr>
                            <td className="tr">Mão de Obra</td>
                            <td className="tr">R$ {fmtBR(selectedOrder.totalLabor)}</td>
                          </tr>
                        )}
                        {Number(selectedOrder.totalDiscount) > 0 && (
                          <tr>
                            <td className="tr" style={{ color: 'darkred' }}>Desconto</td>
                            <td className="tr" style={{ color: 'darkred' }}>− R$ {fmtBR(selectedOrder.totalDiscount)}</td>
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

            {/* Signatures */}
            <table style={{ marginTop: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ border: 'none', textAlign: 'center', paddingTop: '40px' }}>
                    <div style={{ borderTop: '1px solid #555', display: 'inline-block', width: '200px', marginBottom: '4px' }} />
                    <br /><span style={{ fontSize: '9pt', fontWeight: 'bold' }}>Assinatura do Cliente</span>
                    <br /><span style={{ fontSize: '8pt', color: '#555' }}>Nome: ___________________________________</span>
                    <br /><span style={{ fontSize: '8pt', color: '#555', display: 'block', marginTop: '6px' }}>Data: _____/_____/__________</span>
                  </td>
                  <td style={{ border: 'none', textAlign: 'center', paddingTop: '40px' }}>
                    <div style={{ borderTop: '1px solid #555', display: 'inline-block', width: '200px', marginBottom: '4px' }} />
                    <br /><span style={{ fontSize: '9pt', fontWeight: 'bold' }}>Responsável Técnico</span>
                    <br /><span style={{ fontSize: '8pt', color: '#555' }}>Nome: ___________________________________</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '12px', paddingTop: '6px', borderTop: '1px solid #ccc', fontSize: '7pt', color: '#999', textAlign: 'center' }}>
              Documento gerado em {new Date().toLocaleString('pt-BR')} · Oficina360 — Sistema de Gestão para Oficinas Automotivas
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
            >
              <Plus size={18} />
            </button>
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
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OS</span>
                    <span className={cn('text-[9px] px-2 py-0.5 rounded-md font-black', statusConfig[selectedOrder.status]?.color)}>
                      {statusConfig[selectedOrder.status]?.label ?? selectedOrder.status}
                    </span>
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={recalculateTotals}
                  disabled={syncingTotals}
                  className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all disabled:opacity-60"
                >
                  {syncingTotals ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  Atualizar cálculos
                </button>
                <button
                  onClick={() => window.print()}
                  className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                >
                  <Printer size={15} /> Imprimir OS
                </button>
                <button
                  onClick={() => saveDetails(true)}
                  className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                >
                  <X size={15} /> Salvar e sair
                </button>
                <button
                  onClick={() => saveDetails(false)}
                  className="h-10 px-5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg"
                >
                  <Save size={15} /> Salvar
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">

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
                  <h3 className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Car size={13} /> Dados do Veículo
                  </h3>
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
                      className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all resize-none"
                    />
                  </div>
                ))}
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
                      <tr><td colSpan={5} className="px-5 py-6 text-center text-slate-400 text-xs">Nenhum serviço lançado</td></tr>
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
                    className="text-[9px] font-black uppercase tracking-widest bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1"
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
                        <td className="px-5 py-3 font-bold text-slate-900">{item.description}</td>
                        <td className="px-5 py-3">
                          <input
                            type="number" min="1"
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
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { s: 'EM_DIAGNOSTICO', label: 'Em Diagnóstico', cls: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                      { s: 'ORCAMENTO_PRONTO', label: 'Orçamento Pronto', cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                      { s: 'APROVADO', label: 'Aprovado', cls: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                      { s: 'EM_EXECUCAO', label: 'Em Execução', cls: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' },
                      { s: 'PRONTO_ENTREGA', label: 'Pronto p/ Entrega', cls: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
                      { s: 'FATURADO', label: 'Faturado', cls: 'bg-green-50 text-green-700 hover:bg-green-100' },
                      { s: 'ENTREGUE', label: 'Entregue', cls: 'bg-slate-900 text-white hover:bg-slate-700' },
                    ].map(({ s, label, cls }) => (
                      <button key={s} onClick={() => changeStatus(s)} className={cn('px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all', cls)}>
                        {label}
                      </button>
                    ))}
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

      {/* ── MODAL CATÁLOGO ─────────────────────────────────────────── */}
      <AnimatePresence>
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
                          })}
                          className="w-full p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-900 hover:shadow-md text-left transition-all group flex items-center justify-between"
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
                                className="w-10 h-10 rounded-xl bg-primary-600 text-white hover:bg-primary-700 flex items-center justify-center shadow transition-all"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    }
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
                  loadOrders();
                  selectOrder(res.data);
                } catch { alert('Erro ao criar OS. Verifique os dados.'); }
              }}>
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
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">KM Entrada</label>
                  <input type="number" className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all" value={newOrder.kmEntrada} onChange={(e) => setNewOrder({ ...newOrder, kmEntrada: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Reclamação Principal</label>
                  <textarea className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 focus:ring-slate-900/5 transition-all h-24 resize-none" value={newOrder.complaint} onChange={(e) => setNewOrder({ ...newOrder, complaint: e.target.value })} placeholder="O que o cliente relatou?" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg active:scale-95 transition-all">Criar Ordem</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
