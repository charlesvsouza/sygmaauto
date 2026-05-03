import { useEffect, useMemo, useState } from 'react';
import { commissionsApi, usersApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Loader2, DollarSign, CheckCircle2, Download, FileSpreadsheet, Trophy } from 'lucide-react';
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
  const { user } = useAuthStore();
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

  const load = async () => {
    setLoading(true);
    try {
      const [commRes, usersRes] = await Promise.all([
        commissionsApi.getAll({
          status: filters.status || undefined,
          userId: filters.userId || undefined,
          workshopArea: filters.workshopArea || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
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
      alert(error?.response?.data?.message || 'Não foi possível marcar como paga.');
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Comissões</h1>
          <p className="text-slate-500 font-medium">Controle por executor e por item de serviço.</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
        >
          <Download size={16} /> Exportar CSV
        </button>
        <button
          onClick={exportXlsx}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500"
        >
          <FileSpreadsheet size={16} /> Exportar XLSX
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{money(totals.total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 p-5">
          <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Pendente</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{money(totals.pending)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 p-5">
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Pago</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{money(totals.paid)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="input bg-slate-50 border-slate-200"
        >
          <option value="">Todos status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Pago</option>
        </select>

        <select
          value={filters.userId}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          className="input bg-slate-50 border-slate-200"
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
          className="input bg-slate-50 border-slate-200"
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
          className="input bg-slate-50 border-slate-200"
        />

        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="input bg-slate-50 border-slate-200"
        />

        <button onClick={load} className="btn btn-primary">Filtrar</button>
      </div>

      {leadership.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Visão de Liderança</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {leadership.slice(0, 8).map((p: any) => (
              <div key={p.userId} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-900">{p.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{p.workshopArea || 'SEM_AREA'}</p>
                <p className="text-sm font-black text-slate-900 mt-2">{money(p.total)}</p>
                <p className="text-[11px] text-slate-500">{p.count} comissões</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">Tendência Mensal de Comissões</h2>
        <p className="text-xs text-slate-500 mb-4">Valor total de comissões geradas por mês</p>
        {trendData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Sem dados suficientes para montar a tendência.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
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

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest">
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
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-bold text-slate-900">{row.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{row.user?.workshopArea || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.serviceOrderItem?.description || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">#{String(row.serviceOrderId).slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-right">{money(row.baseValue)}</td>
                  <td className="px-4 py-3 text-right font-bold">{Number(row.commissionPercent).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">{money(row.commissionValue)}</td>
                  <td className="px-4 py-3">
                    {row.status === 'PAGO' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-1 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 size={12} /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-[10px] font-black uppercase tracking-wider">
                        <DollarSign size={12} /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canMarkAsPaid && row.status !== 'PAGO' ? (
                      <button
                        onClick={() => markAsPaid(row.id)}
                        disabled={payingId === row.id}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 disabled:opacity-60"
                      >
                        {payingId === row.id ? 'Salvando...' : 'Marcar pago'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">Nenhuma comissão encontrada no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
