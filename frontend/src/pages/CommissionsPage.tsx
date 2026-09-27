import { useEffect, useMemo, useRef, useState } from 'react';
import { commissionsApi, tenantsApi, usersApi } from '../api/client';
import { downloadReportPdf, periodLabel, ReportHeader, REPORT_CSS, todayInput } from '../lib/report';
import { csvNumber, downloadCsv } from '../lib/csv';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui';
import { Loader2, DollarSign, CheckCircle2, Download, FileSpreadsheet, Trophy, Printer } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const AREA_LABEL: Record<string, string> = {
  MECANICA: 'Mecânica',
  ELETRICA: 'Elétrica',
  FUNILARIA_PINTURA: 'Funilaria e Pintura',
  LAVACAO: 'Lavação',
  HIGIENIZACAO_EMBELEZAMENTO: 'Higienização e Embelezamento',
};

const EMPTY_FILTERS = { status: '', userId: '', workshopArea: '', startDate: '', endDate: '' };

export function CommissionsPage() {
  const { user } = useAuthStore();
  const toast = useToast();
  const canMarkAsPaid = ['MASTER', 'ADMIN', 'FINANCEIRO'].includes(user?.role ?? '');

  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [leadership, setLeadership] = useState<any[]>([]);
  const [totals, setTotals] = useState({ total: 0, pending: 0, paid: 0 });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Filtros da última consulta: o PDF/CSV descrevem o que está na tabela.
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [tenantData, setTenantData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const canFilterByUser = ['MASTER', 'ADMIN', 'FINANCEIRO', 'CHEFE_OFICINA'].includes(user?.role ?? '');

  const load = async (f = filters) => {
    setLoading(true);
    try {
      const [commRes, usersRes] = await Promise.all([
        commissionsApi.getAll({
          status: f.status || undefined,
          userId: f.userId || undefined,
          workshopArea: f.workshopArea || undefined,
          startDate: f.startDate || undefined,
          endDate: f.endDate || undefined,
        }),
        usersApi.getAll(),
      ]);
      setData(Array.isArray(commRes.data?.data) ? commRes.data.data : []);
      setLeadership(Array.isArray(commRes.data?.leadership?.leaderboard) ? commRes.data.leadership.leaderboard : []);
      setTotals(commRes.data?.totals || { total: 0, pending: 0, paid: 0 });
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setAppliedFilters(f);
    } catch (error) {
      console.error('Erro ao carregar comissões', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    tenantsApi.getMe().then((r) => setTenantData(r.data)).catch(() => undefined);
  }, []);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    load(EMPTY_FILTERS);
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.userId || filters.workshopArea || filters.startDate || filters.endDate
  );

  const statusLabel = (s: string) => (s === 'PAGO' ? 'Pago' : s === 'PENDENTE' ? 'Pendente' : s || '—');

  const osRef = (row: any) => (row.serviceOrderId ? String(row.serviceOrderId).slice(0, 8).toUpperCase() : '—');
  const fileBase = () =>
    `Comissoes-${appliedFilters.startDate || 'inicio'}_a_${appliedFilters.endDate || todayInput()}`;
  const appliedDetails = () => {
    const f = appliedFilters;
    const executor = f.userId ? users.find((u) => u.id === f.userId)?.name ?? '—' : 'Todos';
    return [
      `Período: ${periodLabel(f.startDate, f.endDate)}`,
      `Status: ${f.status ? statusLabel(f.status) : 'Todos'}`,
      `Executor: ${executor}`,
      `Área: ${f.workshopArea ? AREA_LABEL[f.workshopArea] ?? f.workshopArea : 'Todas'}`,
    ];
  };

  const printReport = async () => {
    if (!printRef.current) return;
    try {
      await downloadReportPdf(printRef.current, { title: 'Relatório de Comissões', fileName: fileBase() });
    } catch {
      toast.error('Erro ao gerar o PDF de comissões.');
    }
  };

  const filteredUsers = useMemo(
    () => users.filter((u) => u.isActive),
    [users],
  );

  const trendData = useMemo(() => {
    const buckets: Record<string, { mes: string; valor: number; quantidade: number }> = {};

    data.forEach((row: any) => {
      if (!row.createdAt) return;
      const d = new Date(row.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) {
        buckets[key] = {
          mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          valor: 0,
          quantidade: 0,
        };
      }
      buckets[key].valor += Number(row.commissionValue || 0);
      buckets[key].quantidade += 1;
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [data]);

  const markAsPaid = async (id: string) => {
    if (!canMarkAsPaid) return;
    setPayingId(id);
    try {
      await commissionsApi.markAsPaid(id);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Não foi possível marcar como paga.');
    } finally {
      setPayingId('');
    }
  };

  const exportCsv = () => {
    downloadCsv(fileBase(),
      ['Executor', 'Área', 'Item', 'O.S.', 'Base', 'Percentual', 'Comissão', 'Status', 'Criado em', 'Pago em'],
      data.map((row) => [
        row.user?.name || '',
        AREA_LABEL[row.user?.workshopArea] ?? row.user?.workshopArea ?? '',
        row.serviceOrderItem?.description || '',
        osRef(row),
        csvNumber(row.baseValue),
        csvNumber(row.commissionPercent),
        csvNumber(row.commissionValue),
        statusLabel(row.status),
        row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : '',
        row.paidAt ? new Date(row.paidAt).toLocaleString('pt-BR') : '',
      ]));
  };

  const exportXlsx = async () => {
    const rows = data.map((row) => ({
      Executor: row.user?.name || '',
      Area: row.user?.workshopArea || '',
      Item: row.serviceOrderItem?.description || '',
      OS: osRef(row),
      Base: Number(row.baseValue || 0),
      Percentual: Number(row.commissionPercent || 0),
      Comissao: Number(row.commissionValue || 0),
      Status: row.status || '',
      CriadoEm: row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : '',
      PagoEm: row.paidAt ? new Date(row.paidAt).toLocaleString('pt-BR') : '',
    }));

    const xlsx = await import('xlsx');
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Comissoes');
    xlsx.writeFile(wb, `${fileBase()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <style>{REPORT_CSS}</style>

      {/* Documento enviado ao servidor para gerar o PDF (oculto na tela) */}
      <div hidden ref={printRef}>
        <div className="rpt">
          <ReportHeader tenant={tenantData} title="Relatório de Comissões" details={appliedDetails()} />
          <table>
            <thead>
              <tr className="sub-hdr">
                <td>Executor</td>
                <td style={{ width: '70px' }}>O.S.</td>
                <td>Item</td>
                <td style={{ width: '85px', textAlign: 'right' }}>Base</td>
                <td style={{ width: '45px', textAlign: 'right' }}>%</td>
                <td style={{ width: '65px', textAlign: 'center' }}>Status</td>
                <td style={{ width: '90px', textAlign: 'right' }}>Comissão</td>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>{row.user?.name || '—'}</td>
                  <td>{osRef(row)}</td>
                  <td>{row.serviceOrderItem?.description || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{money(row.baseValue)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(row.commissionPercent || 0).toLocaleString('pt-BR')}</td>
                  <td style={{ textAlign: 'center' }}>{statusLabel(row.status)}</td>
                  <td style={{ textAlign: 'right' }}>{money(row.commissionValue)}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>Nenhum lançamento no filtro selecionado</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="total-row"><td colSpan={6} style={{ textAlign: 'right' }}>Total</td><td style={{ textAlign: 'right' }}>{money(totals.total)}</td></tr>
              <tr><td colSpan={6} style={{ textAlign: 'right' }}>Pendente</td><td style={{ textAlign: 'right' }}>{money(totals.pending)}</td></tr>
              <tr><td colSpan={6} style={{ textAlign: 'right' }}>Pago</td><td style={{ textAlign: 'right' }}>{money(totals.paid)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-surface-50 tracking-tight">Comissões</h1>
          <p className="text-surface-400 font-medium">Controle por executor e por item de serviço.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover"
        >
          <Download size={16} /> Exportar CSV
        </button>
        <button
          type="button"
          onClick={exportXlsx}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500"
        >
          <FileSpreadsheet size={16} /> Exportar XLSX
        </button>
        <button
          type="button"
          onClick={printReport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-panel border border-line text-ink text-sm font-bold hover:bg-panel-2"
        >
          <Printer size={16} /> Baixar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-900 rounded-lg border border-line p-5">
          <p className="text-xs text-surface-400 font-bold uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-surface-50 mt-1">{money(totals.total)}</p>
        </div>
        <div className="bg-surface-900 rounded-lg border border-amber-500/30 p-5">
          <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Pendente</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{money(totals.pending)}</p>
        </div>
        <div className="bg-surface-900 rounded-lg border border-emerald-500/30 p-5">
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Pago</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{money(totals.paid)}</p>
        </div>
      </div>

      <div className="bg-surface-900 rounded-lg border border-line p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="input bg-surface-950/40 border-line"
          aria-label="Status da comissão"
        >
          <option value="">Todos status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Pago</option>
        </select>

        <select
          value={filters.userId}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          className="input bg-surface-950/40 border-line"
          disabled={!canFilterByUser}
          aria-label="Executor"
        >
          <option value="">Todos executores</option>
          {filteredUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select
          value={filters.workshopArea}
          onChange={(e) => setFilters({ ...filters, workshopArea: e.target.value })}
          className="input bg-surface-950/40 border-line"
          aria-label="Área da oficina"
        >
          <option value="">Todas áreas</option>
          <option value="MECANICA">Mecânica</option>
          <option value="ELETRICA">Elétrica</option>
          <option value="FUNILARIA_PINTURA">Funilaria e Pintura</option>
          <option value="LAVACAO">Lavação</option>
          <option value="HIGIENIZACAO_EMBELEZAMENTO">Higienização e Embelezamento</option>
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="input bg-surface-950/40 border-line"
          aria-label="Data inicial"
        />

        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="input bg-surface-950/40 border-line"
          aria-label="Data final"
        />

        <div className="flex gap-2">
          <button type="button" onClick={() => load()} className="btn btn-primary flex-1">Filtrar</button>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Limpar filtros"
          >
            Limpar
          </button>
        </div>
      </div>

      {leadership.length > 0 && (
        <div className="bg-surface-900 rounded-lg border border-line p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-surface-50 uppercase tracking-wider">Visão de Liderança</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {leadership.slice(0, 8).map((p: any) => (
              <div key={p.userId} className="rounded-xl border border-line bg-surface-950/40 p-3">
                <p className="text-xs font-bold text-surface-50">{p.name}</p>
                <p className="text-[10px] text-surface-400 mt-0.5">{p.workshopArea || 'SEM_AREA'}</p>
                <p className="text-sm font-bold text-surface-50 mt-2">{money(p.total)}</p>
                <p className="text-[11px] text-surface-400">{p.count} comissões</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface-900 rounded-lg border border-line p-5">
        <h2 className="text-sm font-bold text-surface-50 uppercase tracking-wider mb-1">Tendência Mensal de Comissões</h2>
        <p className="text-xs text-surface-400 mb-4">Valor total de comissões geradas por mês</p>
        {trendData.length === 0 ? (
          <p className="text-sm text-surface-500 py-8 text-center">Sem dados suficientes para montar a tendência.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 700, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }}
                formatter={(v: any, key: any) => {
                  if (key === 'valor') return [money(Number(v)), 'Comissões'];
                  return [Number(v), 'Quantidade'];
                }}
              />
              <Line type="monotone" dataKey="valor" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, fill: '#0f172a' }} />
              <Line type="monotone" dataKey="quantidade" stroke="#16a34a" strokeWidth={2} dot={{ r: 3, fill: '#16a34a' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-surface-900 rounded-lg border border-line overflow-x-auto">
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-surface-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-950/40 text-surface-400 uppercase text-[10px] tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Executor</th>
                <th className="px-4 py-3 text-left">Área</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">OS</th>
                <th className="px-4 py-3 text-right">Base</th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-right">Comissão</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3 font-bold text-surface-50">{row.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-surface-400 text-xs">{row.user?.workshopArea || '—'}</td>
                  <td className="px-4 py-3 text-surface-300">{row.serviceOrderItem?.description || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-surface-300">#{String(row.serviceOrderId).slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-right">{money(row.baseValue)}</td>
                  <td className="px-4 py-3 text-right font-bold">{Number(row.commissionPercent).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-bold text-surface-50">{money(row.commissionValue)}</td>
                  <td className="px-4 py-3">
                    {row.status === 'PAGO' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 size={12} /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                        <DollarSign size={12} /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canMarkAsPaid && row.status !== 'PAGO' ? (
                      <button
                        type="button"
                        onClick={() => markAsPaid(row.id)}
                        disabled={payingId === row.id}
                        className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-bold hover:bg-surface-700 disabled:opacity-60"
                      >
                        {payingId === row.id ? 'Salvando...' : 'Marcar pago'}
                      </button>
                    ) : (
                      <span className="text-xs text-surface-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-surface-500">Nenhuma comissão encontrada no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
