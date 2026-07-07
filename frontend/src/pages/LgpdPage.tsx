import { useEffect, useMemo, useState } from 'react';
import { complianceApi, customersApi, usersApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Button, Card, Chip, EmptyState, Modal, useToast } from '../components/ui';
import { ShieldCheck, Plus, Download, Trash2, Loader2, Lock } from 'lucide-react';

const REQUEST_TYPE_LABEL: Record<string, string> = {
  ACCESS: 'Acesso',
  CORRECTION: 'Correção',
  DELETION: 'Eliminação',
  PORTABILITY: 'Portabilidade',
};

const SUBJECT_TYPE_LABEL: Record<string, string> = {
  CUSTOMER: 'Cliente',
  USER: 'Usuário',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  REJECTED: 'Rejeitada',
};

function statusChipVariant(status: string): 'ok' | 'warn' | 'err' | 'neutral' {
  if (status === 'COMPLETED') return 'ok';
  if (status === 'IN_PROGRESS') return 'warn';
  if (status === 'REJECTED') return 'err';
  return 'neutral';
}

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function LgpdPage() {
  const { user } = useAuthStore();
  const toast = useToast();
  const canAccess = ['MASTER', 'ADMIN'].includes(user?.role ?? '');

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({
    requestType: 'ACCESS',
    subjectType: 'CUSTOMER',
    subjectId: '',
    requesterName: '',
    requesterEmail: '',
    notes: '',
  });

  const [selected, setSelected] = useState<any | null>(null);
  const [statusForm, setStatusForm] = useState({ status: 'OPEN', resolutionNotes: '' });
  const [savingStatus, setSavingStatus] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [eraseReason, setEraseReason] = useState('');
  const [showEraseConfirm, setShowEraseConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [reqRes, custRes, usersRes] = await Promise.all([
        complianceApi.listRequests(),
        customersApi.getAll(),
        usersApi.getAll(),
      ]);
      setRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      console.error('Erro ao carregar solicitações LGPD', error);
      toast.error('Não foi possível carregar as solicitações LGPD');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subjectName = (subjectType: string, subjectId: string) => {
    const list = subjectType === 'CUSTOMER' ? customers : users;
    const found = list.find((item) => item.id === subjectId);
    return found?.name || subjectId;
  };

  const subjectOptions = newForm.subjectType === 'CUSTOMER' ? customers : users;

  const openDetail = (request: any) => {
    setSelected(request);
    setStatusForm({ status: request.status, resolutionNotes: request.resolutionNotes || '' });
    setEraseReason('');
    setShowEraseConfirm(false);
  };

  const handleCreate = async () => {
    if (!newForm.subjectId || !newForm.requesterName || !newForm.requesterEmail) {
      toast.error('Preencha assunto, nome e e-mail do solicitante');
      return;
    }
    setCreating(true);
    try {
      await complianceApi.createRequest(newForm);
      toast.success('Solicitação LGPD registrada');
      setShowNew(false);
      setNewForm({ requestType: 'ACCESS', subjectType: 'CUSTOMER', subjectId: '', requesterName: '', requesterEmail: '', notes: '' });
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao registrar solicitação');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selected) return;
    setSavingStatus(true);
    try {
      await complianceApi.updateRequestStatus(selected.id, statusForm);
      toast.success('Status atualizado');
      await load();
      setSelected((prev: any) => (prev ? { ...prev, ...statusForm } : prev));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleExport = async () => {
    if (!selected) return;
    setExporting(true);
    try {
      const res = selected.subjectType === 'CUSTOMER'
        ? await complianceApi.exportCustomer(selected.subjectId)
        : await complianceApi.exportUser(selected.subjectId);
      downloadJson(`lgpd-export-${selected.protocol}.json`, res.data);
      toast.success('Exportação gerada');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const handleErase = async () => {
    if (!selected || !eraseReason.trim()) {
      toast.error('Informe o motivo da eliminação');
      return;
    }
    setErasing(true);
    try {
      if (selected.subjectType === 'CUSTOMER') {
        await complianceApi.eraseCustomer(selected.subjectId, eraseReason.trim());
      } else {
        await complianceApi.eraseUser(selected.subjectId, eraseReason.trim());
      }
      toast.success('Eliminação executada');
      setShowEraseConfirm(false);
      setSelected(null);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao executar eliminação');
    } finally {
      setErasing(false);
    }
  };

  const overdue = useMemo(
    () => (req: any) => req.status !== 'COMPLETED' && req.status !== 'REJECTED' && new Date(req.dueAt) < new Date(),
    [],
  );

  if (!canAccess) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Lock size={28} />}
          title="Acesso restrito"
          description="Somente MASTER ou ADMIN podem gerenciar solicitações LGPD."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink flex items-center gap-2">
            <ShieldCheck size={20} className="text-accent-ink" /> Solicitações LGPD
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Atendimento a titulares: acesso, correção, portabilidade e eliminação de dados.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} /> Nova solicitação
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={28} />}
            title="Nenhuma solicitação registrada"
            description="Quando um titular solicitar acesso, correção, portabilidade ou eliminação de dados, registre aqui."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-line">
                  <th className="py-2 pr-3">Protocolo</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Assunto</th>
                  <th className="py-2 pr-3">Solicitante</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => openDetail(req)}
                    className="cursor-pointer hover:bg-panel-2 transition-colors"
                  >
                    <td className="py-2.5 pr-3 font-mono text-xs">{req.protocol}</td>
                    <td className="py-2.5 pr-3">{REQUEST_TYPE_LABEL[req.requestType] || req.requestType}</td>
                    <td className="py-2.5 pr-3">
                      {SUBJECT_TYPE_LABEL[req.subjectType] || req.subjectType}: {subjectName(req.subjectType, req.subjectId)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div>{req.requesterName}</div>
                      <div className="text-xs text-muted">{req.requesterEmail}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Chip variant={statusChipVariant(req.status)}>{STATUS_LABEL[req.status] || req.status}</Chip>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={overdue(req) ? 'text-red-600 font-semibold' : ''}>
                        {new Date(req.dueAt).toLocaleDateString('pt-BR')}
                        {overdue(req) && ' (atrasado)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Nova solicitação */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Nova solicitação LGPD"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 size={14} className="animate-spin" /> : null} Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1 block">Tipo de solicitação</label>
              <select
                value={newForm.requestType}
                onChange={(e) => setNewForm((f) => ({ ...f, requestType: e.target.value }))}
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
              >
                {Object.entries(REQUEST_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1 block">Assunto</label>
              <select
                value={newForm.subjectType}
                onChange={(e) => setNewForm((f) => ({ ...f, subjectType: e.target.value, subjectId: '' }))}
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
              >
                {Object.entries(SUBJECT_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase mb-1 block">
              {newForm.subjectType === 'CUSTOMER' ? 'Cliente' : 'Usuário'}
            </label>
            <select
              value={newForm.subjectId}
              onChange={(e) => setNewForm((f) => ({ ...f, subjectId: e.target.value }))}
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {subjectOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name} {item.email ? `(${item.email})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1 block">Nome do solicitante</label>
              <input
                value={newForm.requesterName}
                onChange={(e) => setNewForm((f) => ({ ...f, requesterName: e.target.value }))}
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase mb-1 block">E-mail do solicitante</label>
              <input
                type="email"
                value={newForm.requesterEmail}
                onChange={(e) => setNewForm((f) => ({ ...f, requesterEmail: e.target.value }))}
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase mb-1 block">Observações (opcional)</label>
            <textarea
              value={newForm.notes}
              onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Detalhe / ações */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Solicitação ${selected.protocol}` : ''}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted">Tipo:</span> {REQUEST_TYPE_LABEL[selected.requestType] || selected.requestType}</div>
              <div><span className="text-muted">Assunto:</span> {SUBJECT_TYPE_LABEL[selected.subjectType]}: {subjectName(selected.subjectType, selected.subjectId)}</div>
              <div><span className="text-muted">Solicitante:</span> {selected.requesterName} ({selected.requesterEmail})</div>
              <div><span className="text-muted">Prazo (SLA):</span> {new Date(selected.dueAt).toLocaleDateString('pt-BR')}</div>
            </div>
            {selected.notes && (
              <div className="text-sm"><span className="text-muted">Observações:</span> {selected.notes}</div>
            )}

            <div className="border-t border-line pt-3 space-y-2">
              <label className="text-xs font-semibold text-muted uppercase block">Status</label>
              <select
                value={statusForm.status}
                onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <textarea
                placeholder="Notas de resolução (opcional)"
                value={statusForm.resolutionNotes}
                onChange={(e) => setStatusForm((f) => ({ ...f, resolutionNotes: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
              />
              <Button size="sm" onClick={handleSaveStatus} disabled={savingStatus}>
                {savingStatus ? <Loader2 size={14} className="animate-spin" /> : null} Salvar status
              </Button>
            </div>

            <div className="border-t border-line pt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exportar dados
              </Button>
              {!showEraseConfirm ? (
                <Button variant="danger" size="sm" onClick={() => setShowEraseConfirm(true)}>
                  <Trash2 size={14} /> Executar eliminação
                </Button>
              ) : (
                <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-xs text-red-800 font-semibold">
                    Ação irreversível. Dados históricos com dependência são anonimizados; o restante é apagado.
                  </p>
                  <textarea
                    placeholder="Motivo da eliminação (obrigatório)"
                    value={eraseReason}
                    onChange={(e) => setEraseReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowEraseConfirm(false)}>Cancelar</Button>
                    <Button variant="danger" size="sm" onClick={handleErase} disabled={erasing}>
                      {erasing ? <Loader2 size={14} className="animate-spin" /> : null} Confirmar eliminação
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
