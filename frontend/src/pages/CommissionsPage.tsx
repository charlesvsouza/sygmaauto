import { useEffect, useMemo, useState } from 'react';
import { commissionsApi, usersApi } from '../api/client';
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

export function CommissionsPage() {
  const { user, tenant } = useAuthStore();
  const toast = useToast();
  const canMarkAsPaid = ['MASTER', 'ADMIN', 'FINANCEIRO'].includes(user?.role ?? '');

  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [leadership, setLeadership] = useState<any[]>([]);
  const [totals, setTotals] = useState({ total: 0, pending: 0, paid: 0 });
  const [filters, setFilters] = useState({
    status: '',
    userId: '',
    workshopArea: '',
    startDate: '',
    endDate: '',
  });

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
    } catch (error) {
      console.error('Erro ao carregar comissões', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clearFilters = () => {
    const cleared = { status: '', userId: '', workshopArea: '', startDate: '', endDate: '' };
    setFilters(cleared);
    load(cleared);
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.userId || filters.workshopArea || filters.startDate || filters.endDate
  );

  const statusLabel = (s: string) => (s === 'PAGO' ? 'Pago' : s === 'PENDENTE' ? 'Pendente' : s || '—');

  const printReport = () => {
    const empresa = tenant?.name || 'Oficina';
    const periodo =
      filters.startDate || filters.endDate
        ? `${filters.startDate ? new Date(filters.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : '...'} a ${filters.endDate ? new Date(filters.endDate + 'T00:00:00').toLocaleDateString('pt-BR') : '...'}`
        : 'Todos os períodos';
    const statusTxt = filters.status ? statusLabel(filters.status) : 'Todos';
    const rows = data
      .map(
        (r: any) => `<tr>
          <td>${r.user?.name || r.userName || '—'}</td>
          <td>${r.serviceOrder?.id ? '#' + String(r.serviceOrder.id).slice(-6).toUpperCase() : (r.osNumber || '—')}</td>
          <td>${r.description || r.serviceName || '—'}</td>
          <td style="text-align:center">${statusLabel(r.status)}</td>
          <td style="text-align:right">${money(r.amount || r.value || 0)}</td>
        </tr>`
      )
      .join('');
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast.error('Não foi possível abrir o relatório. Verifique o bloqueador de pop-ups.');
      return;
    }
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Relatório de Comissões — ${empresa}</title>
      <style>
        * { font-family: Arial, Helvetica, sans-serif; }
        body { margin: 24px; color: #1a2430; }
        h1 { font-size: 18px; margin: 0; }
        .meta { color: #5b6470; font-size: 12px; margin: 4px 0 16px; }
        .meta strong { color: #1a2430; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid #e2e5ea; padding: 8px 10px; text-align: left; }
        th { background: #f4f5f7; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color: #5b6470; }
        tfoot td { font-weight: bold; border-top: 2px solid #1a2430; }
      </style></head><body>
      <h1>${empresa}</h1>
      <div class="meta">Relatório de Comissionamento &middot; <strong>Status:</strong> ${statusTxt} &middot; <strong>Período:</strong> ${periodo} &middot; Emitido em ${new Date().toLocaleString('pt-BR')}</div>
      <table>
        <thead><tr><th>Executor</th><th>OS</th><th>Descrição</th><th style="text-align:center">Status</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#8a9aa7">Nenhum lançamento no filtro selecionado</td></tr>'}</tbody>
        <tfoot>
          <tr><td colspan="4" style="text-align:right">Total</td><td style="text-align:right">${money(totals.total)}</td></tr>
          <tr><td colspan="4" style="text-align:right">Pendente</td><td style="text-align:right">${money(totals.pending)}</td></tr>
          <tr><td colspan="4" style="text-align:right">Pago</td><td style="text-align:right">${money(totals.paid)}</td></tr>
        </tfoot>
      </table>
      <script>window.onload = function(){ window.print(); };</script>
      </body></html>`);
    win.document.close();
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
    const header = [
      'Executor',
      'Area',
      'Item',
      'OS',
      'Base',
      'Percentual',
      'Comissao',
      'Status',
      'CriadoEm',
      'PagoEm',
    ];

    const rows = data.map((row) => [
      row.user?.name || '',
      row.user?.workshopArea || '',
      row.serviceOrderItem?.description || '',
      String(row.serviceOrderId || ''),
      Number(row.baseValue || 0).toFixed(2),
      Number(row.commissionPercent || 0).toFixed(2),
      Number(row.commissionValue || 0).toFixed(2),
      row.status || '',
      row.createdAt ? new Date(row.createdAt).toISOString() : '',
      row.paidAt ? new Date(row.paidAt).toISOString() : '',
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comissoes_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportXlsx = async () => {
    const rows = data.map((row) => ({
      Executor: row.user?.name || '',
      Area: row.user?.workshopArea || '',
      Item: row.serviceOrderItem?.description || '',
      OS: String(row.serviceOrderId || '').slice(0, 8).toUpperCase(),
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
    xlsx.writeFile(wb, `comissoes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-surface-50 tracking-tight">Comissões</h1>
          <p className="text-surface-400 font-medium">Controle por executor e por item de serviço.</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover"
        >
          <Download size={16} /> Exportar CSV
        </button>
        <button
          onClick={exportXlsx}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500"
        >
          <FileSpreadsheet size={16} /> Exportar XLSX
        </button>
        <button
          onClick={printReport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-panel border border-line text-ink text-sm font-bold hover:bg-panel-2"
        >
          <Printer size={16} /> Gerar Relatório
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
        />

        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="input bg-surface-950/40 border-line"
        />

        <div className="flex gap-2">
          <button onClick={() => load()} className="btn btn-primary flex-1">Filtrar</button>
          <button
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
