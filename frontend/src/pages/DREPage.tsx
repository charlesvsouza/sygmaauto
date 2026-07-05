import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { financialApi, pdfApi } from '../api/client';
import { useToast } from '../components/ui';
import {
  TrendingUp,
  TrendingDown,
  BarChart4,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Printer,
  Info,
} from 'lucide-react';

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

const KPI_COLOR_CLASS: Record<string, string> = {
  emerald: 'text-emerald-400',
  blue: 'text-blue-400',
  red: 'text-red-400',
};

const DRE_PRINT_STYLE = `
@media screen { #dre-print { display: none !important; } }
@media print {
  body * { visibility: hidden; }
  #dre-print, #dre-print * { visibility: visible; }
  #dre-print { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 20px; font-family: Arial, sans-serif; font-size: 10pt; color: #111; }
  @page { size: A4; margin: 12mm 14mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  td, th { border: 1px solid #ccc; padding: 6px 10px; font-size: 10pt; }
  .hdr td { background: #1e293b !important; color: #fff !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .total-row td { background: #f0fdf4 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pos { color: #16a34a !important; font-weight: bold; }
  .neg { color: #dc2626 !important; font-weight: bold; }
  .kpi-grid { display: flex; gap: 8px; margin-bottom: 12px; }
  .kpi { flex: 1; border: 1px solid #ccc; padding: 8px 10px; text-align: center; }
  .kpi-label { font-size: 7.5pt; color: #555; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
  .kpi-value { font-size: 14pt; font-weight: 900; }
}
`;

function DRERow({ label, value, indent = 0, highlight = false, positive = true, note }: {
  label: string; value: number; indent?: number; highlight?: boolean; positive?: boolean; note?: string;
}) {
  const color = value >= 0 ? 'text-emerald-400' : 'text-red-400';
  return (
    <tr className={highlight ? 'bg-surface-950/40 font-bold' : ''}>
      <td className={`py-3 px-4 text-sm text-surface-200 border-b border-white/5 ${indent > 0 ? 'pl-' + (4 + indent * 4) : ''}`}>
        <span style={{ paddingLeft: `${indent * 16}px` }} className="flex items-center gap-1">
          {label}
          {note && <span title={note} className="text-surface-500 cursor-help"><Info className="w-3 h-3 inline" /></span>}
        </span>
      </td>
      <td className={`py-3 px-4 text-sm text-right font-mono border-b border-white/5 ${highlight ? color : value < 0 ? 'text-red-400' : 'text-surface-50'}`}>
        {fmt(value)}
      </td>
    </tr>
  );
}

function BarMini({ label, receita, despesa, resultado }: { label: string; receita: number; despesa: number; resultado: number }) {
  const max = Math.max(receita, despesa, 1);
  return (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
      <div className="flex items-end gap-1 h-20">
        <div
          className="w-5 bg-emerald-400 rounded-t transition-all"
          style={{ height: `${(receita / max) * 80}px` }}
          title={`Receita: ${fmt(receita)}`}
        />
        <div
          className="w-5 bg-red-300 rounded-t transition-all"
          style={{ height: `${(despesa / max) * 80}px` }}
          title={`Despesa: ${fmt(despesa)}`}
        />
      </div>
      <span className="text-[10px] text-surface-400 font-medium">{label}</span>
      <span className={`text-[10px] font-bold ${resultado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {resultado >= 0 ? '+' : ''}{fmt(resultado)}
      </span>
    </div>
  );
}

export function DREPage() {
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const load = async (y: number, m: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await financialApi.getDRE(y, m);
      setData(res.data);
    } catch {
      setError('Não foi possível carregar o DRE. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(year, month); }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const max = year === now.getFullYear() && month === now.getMonth() + 1;
    if (max) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const handlePrint = async () => {
    if (!printRef.current) return;
    try {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${DRE_PRINT_STYLE}</style></head><body><div id="dre-print">${printRef.current.innerHTML}</div></body></html>`;
      const response = await pdfApi.render({
        html,
        fileName: `dre-${year}-${String(month).padStart(2, '0')}.pdf`,
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `dre-${year}-${String(month).padStart(2, '0')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar PDF da DRE com Puppeteer.');
    }
  };

  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const dre = data?.dre;
  const historico = data?.historico ?? [];
  const detalhes = data?.detalhes;

  return (
    <div className="space-y-6">
      <style>{DRE_PRINT_STYLE}</style>

      {/* Hidden print div — must always be in DOM for window.print() to work */}
      <div id="dre-print" ref={printRef}>
        <h2 style={{ textAlign: 'center', fontSize: '16pt', marginBottom: 4, fontFamily: 'Arial, sans-serif' }}>
          Demonstrativo de Resultado do Exercício — DRE
        </h2>
        <p style={{ textAlign: 'center', marginBottom: 16, color: '#555', fontSize: '11pt', fontFamily: 'Arial, sans-serif' }}>
          {new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
        {dre && detalhes && (
          <>
            <div className="kpi-grid">
              {[
                ['Receita Bruta', dre.receitaBruta],
                ['Receita Líquida', dre.receitaLiquida],
                ['Margem Bruta', dre.margemBruta],
                ['EBITDA', dre.ebitda],
              ].map(([label, val]) => (
                <div key={label as string} className="kpi">
                  <div className="kpi-label">{label}</div>
                  <div className="kpi-value" style={{ color: (val as number) >= 0 ? '#16a34a' : '#dc2626' }}>
                    {fmt(val as number)}
                  </div>
                </div>
              ))}
            </div>
            <table>
              <thead>
                <tr className="hdr"><td colSpan={2}>ESTRUTURA DO DRE</td></tr>
              </thead>
              <tbody>
                {([
                  { label: '(+) Receita Bruta', val: dre.receitaBruta },
                  { label: '    Receita de OS (serviços)', val: detalhes.receitaBrutaOS, indent: true },
                  { label: '    Receita Manual (lançamentos)', val: detalhes.receitaManual, indent: true },
                  { label: '(-) Deduções (impostos estimados ~8%)', val: -dre.deducoes },
                  { label: '(=) Receita Líquida', val: dre.receitaLiquida, bold: true },
                  { label: '(-) CMV — Custo das Peças Utilizadas', val: -dre.cmv },
                  { label: '(=) Margem Bruta', val: dre.margemBruta, bold: true },
                  { label: '(-) Total de Despesas Operacionais', val: -dre.despesasOperacionais },
                  { label: '(=) EBITDA', val: dre.ebitda, bold: true },
                  { label: '(=) Resultado Líquido do Período', val: dre.resultadoLiquido, bold: true },
                ] as Array<{ label: string; val: number; bold?: boolean; indent?: boolean }>).map((r) => (
                  <tr key={r.label} style={{ background: r.bold ? '#f8fafc' : 'transparent' }}>
                    <td style={{ fontWeight: r.bold ? 'bold' : 'normal', paddingLeft: r.indent ? 24 : undefined }}>
                      {r.label.trim()}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: r.bold ? 'bold' : 'normal', color: r.val >= 0 ? '#16a34a' : '#dc2626' }}>
                      {fmt(Math.abs(r.val))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Object.keys(detalhes.despesasPorCategoria).length > 0 && (
              <table style={{ marginTop: 8, maxWidth: 360 }}>
                <thead><tr className="hdr"><td colSpan={2}>DESPESAS POR CATEGORIA</td></tr></thead>
                <tbody>
                  {Object.entries(detalhes.despesasPorCategoria as Record<string, number>).map(([cat, val]) => (
                    <tr key={cat}><td>{cat}</td><td style={{ textAlign: 'right' }}>{fmt(val)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {historico.length > 0 && (
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr className="hdr"><td colSpan={4}>HISTÓRICO MENSAL (últimos 6 meses)</td></tr>
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    <td>Mês</td><td style={{ textAlign: 'right' }}>Receita</td>
                    <td style={{ textAlign: 'right' }}>Despesa</td><td style={{ textAlign: 'right' }}>Resultado</td>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h: any) => (
                    <tr key={h.mes}>
                      <td>{h.mes}</td>
                      <td style={{ textAlign: 'right', color: '#16a34a' }}>{fmt(h.receita)}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626' }}>{fmt(h.despesa)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: h.resultado >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(h.resultado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ fontSize: '8pt', color: '#888', marginTop: 12 }}>
              * Estimativas para fins gerenciais. Consulte seu contador para o DRE oficial. — Gerado em {new Date().toLocaleString('pt-BR')}
            </p>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-50 tracking-tight">DRE</h1>
          <p className="text-surface-400 font-medium">Demonstrativo de Resultado do Exercício</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletores de mês e ano */}
          <div className="flex items-center gap-1 bg-surface-900 border border-white/10 rounded-2xl px-2 py-1.5 shadow-sm">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white/5 rounded-xl transition-colors">
              <ChevronLeft className="w-4 h-4 text-surface-300" />
            </button>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="text-sm font-bold text-surface-100 bg-transparent border-none outline-none cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}
                  disabled={year === currentYear && i + 1 > now.getMonth() + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="text-sm font-bold text-surface-100 bg-transparent border-none outline-none cursor-pointer"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={nextMonth}
              disabled={year === currentYear && month === now.getMonth() + 1}
              className="p-1.5 hover:bg-white/5 rounded-xl transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-surface-300" />
            </button>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-surface-950 text-sm font-bold rounded-xl hover:bg-gold-400 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-surface-50" />
          <p className="text-surface-400 font-medium animate-pulse">Calculando DRE...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red-400 font-medium">{error}</div>
      ) : dre && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Receita Bruta', value: dre.receitaBruta, icon: TrendingUp, color: 'emerald' },
              { label: 'Receita Líquida', value: dre.receitaLiquida, icon: BarChart4, color: 'blue' },
              { label: 'Margem Bruta', value: dre.margemBruta, icon: TrendingUp, color: dre.margemBruta >= 0 ? 'emerald' : 'red' },
              { label: 'EBITDA', value: dre.ebitda, icon: dre.ebitda >= 0 ? TrendingUp : TrendingDown, color: dre.ebitda >= 0 ? 'emerald' : 'red' },
            ].map((card) => (
              <div key={card.label} className={`bg-surface-900 rounded-3xl border border-white/10 shadow-sm p-5`}>
                <div className={`flex items-center gap-2 ${KPI_COLOR_CLASS[card.color] ?? 'text-surface-300'} mb-2`}>
                  <card.icon className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">{card.label}</span>
                </div>
                <p className={`text-2xl font-black ${card.value >= 0 ? 'text-surface-50' : 'text-red-400'}`}>
                  {fmt(card.value)}
                </p>
                {card.label === 'Margem Bruta' && (
                  <p className="text-xs text-surface-400 mt-1">{pct(dre.margemBrutaPerc)} da receita líquida</p>
                )}
                {card.label === 'EBITDA' && (
                  <p className="text-xs text-surface-400 mt-1">{pct(dre.ebitdaPerc)} da receita líquida</p>
                )}
                {card.label === 'Receita Bruta' && (
                  <p className="text-xs text-surface-400 mt-1">{detalhes?.osEntregues} OS entregues</p>
                )}
              </div>
            ))}
          </div>

          {/* Tabela DRE + Gráfico */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tabela DRE */}
            <div className="lg:col-span-2 bg-surface-900 rounded-3xl border border-white/10 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-surface-950/40 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-bold text-surface-50">Estrutura do DRE</h2>
                <span className="text-xs text-surface-400 font-medium capitalize">
                  {new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    <tr className="bg-gold-500 text-surface-950">
                      <td colSpan={2} className="py-2 px-4 text-xs font-bold uppercase tracking-wider">Receita</td>
                    </tr>
                    <DRERow label="(+) Receita Bruta" value={dre.receitaBruta} />
                    <DRERow label="Receita de OS (serviços)" value={detalhes.receitaBrutaOS} indent={1} />
                    <DRERow label="Receita Manual (lançamentos)" value={detalhes.receitaManual} indent={1} />
                    <DRERow label="(-) Deduções (impostos estimados ~8%)" value={-dre.deducoes} note="Estimativa simplificada." />
                    <DRERow label="(=) Receita Líquida" value={dre.receitaLiquida} highlight />
                    <tr className="bg-gold-500 text-surface-950">
                      <td colSpan={2} className="py-2 px-4 text-xs font-bold uppercase tracking-wider">Custo dos Produtos</td>
                    </tr>
                    <DRERow label="(-) CMV — Custo das Peças Utilizadas" value={-dre.cmv} note="Custo de compra das peças usadas nas OS entregues." />
                    <DRERow label="(=) Margem Bruta" value={dre.margemBruta} highlight />
                    <tr className="bg-gold-500 text-surface-950">
                      <td colSpan={2} className="py-2 px-4 text-xs font-bold uppercase tracking-wider">Despesas Operacionais</td>
                    </tr>
                    <DRERow label="(-) Total de Despesas" value={-dre.despesasOperacionais} />
                    {Object.entries(detalhes.despesasPorCategoria as Record<string, number>).map(([cat, val]) => (
                      <DRERow key={cat} label={cat} value={-(val as number)} indent={1} />
                    ))}
                    <DRERow label="(=) EBITDA" value={dre.ebitda} highlight />
                    <tr className="bg-gold-500 text-surface-950">
                      <td colSpan={2} className="py-2 px-4 text-xs font-bold uppercase tracking-wider">Resultado</td>
                    </tr>
                    <DRERow label="(=) Resultado Líquido do Período" value={dre.resultadoLiquido} highlight />
                  </tbody>
                </table>
              </div>
              <p className="px-6 py-3 text-xs text-surface-500 border-t border-white/5">
                * Deduções fiscais e CMV são estimativas. Consulte seu contador para o DRE oficial.
              </p>
            </div>

            {/* Gráfico de histórico + breakdown despesas */}
            <div className="space-y-4">
              <div className="bg-surface-900 rounded-3xl border border-white/10 shadow-sm p-5">
                <h3 className="font-bold text-surface-50 text-sm mb-4">Histórico 6 meses</h3>
                <div className="flex items-end justify-between gap-1 px-2">
                  {historico.map((h: any) => (
                    <BarMini key={h.mes} label={h.mes} receita={h.receita} despesa={h.despesa} resultado={h.resultado} />
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 justify-center text-xs text-surface-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Receita</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300 inline-block" /> Despesa</span>
                </div>
              </div>

              {Object.keys(detalhes.despesasPorCategoria).length > 0 && (
                <div className="bg-surface-900 rounded-3xl border border-white/10 shadow-sm p-5">
                  <h3 className="font-bold text-surface-50 text-sm mb-3">Despesas por Categoria</h3>
                  <div className="space-y-2">
                    {Object.entries(detalhes.despesasPorCategoria as Record<string, number>)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([cat, val]) => {
                        const pctVal = dre.despesasOperacionais > 0 ? ((val as number) / dre.despesasOperacionais) * 100 : 0;
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-surface-200 font-medium">{cat}</span>
                              <span className="text-surface-400">{fmt(val as number)} ({pctVal.toFixed(0)}%)</span>
                            </div>
                            <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                              <div className="h-full bg-red-400 rounded-full" style={{ width: `${pctVal}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}