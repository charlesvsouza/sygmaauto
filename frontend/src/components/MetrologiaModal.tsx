import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Loader2, Ruler, CheckCircle2, ChevronDown, ChevronRight, Wrench, Package, AlertTriangle, ChevronLeft, FlaskConical } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Medidas de um cilindro */
export interface CylMeasure {
  diametroNominal: string;
  diametroMedido:  string;
  ovalização:      string;
  conicidade:      string;
  folgaPistao:     string;
}

/** Medidas de munhão principal ou moente do virabrequim */
export interface JournalMeasure {
  diametroNominal: string;
  diametroMedido:  string;
  ovalização:      string;
  conicidade:      string;
}

/** Medidas de mancal do bloco ou cabeça de biela */
export interface BoreMeasure {
  diametroNominal: string;
  diametroMedido:  string;
}

export interface MetrologiaData {
  // Empenamentos (mm)
  empenamentoCabecote: string;
  empenamentoBloco:    string;
  // Cilindros
  numeroCilindros: number;
  cilindros:       CylMeasure[];
  // Virabrequim — munhões principais
  numeroMunhoes:   number;
  munhoes:         JournalMeasure[];
  // Virabrequim — moentes (munhões de biela)
  numeroMoentes:   number;
  moentes:         JournalMeasure[];
  // Mancais de apoio do bloco
  numeroMancais:   number;
  mancaisBloco:    BoreMeasure[];
  // Cabeças de biela
  numeroBielas:    number;
  bielas:          BoreMeasure[];
  observacoes:     string;
  tecnico:         string;
  dataLeitura:     string;
}

/** Item sugerido pelo diagnóstico automático de metrologia */
export interface SuggestedItem {
  id:          string;
  description: string;
  type:        'service' | 'part';
  reason:      string;
  selected:    boolean;
  quantity:    number;
  unitPrice:   number;
}

// ─── Diagnóstico automático ───────────────────────────────────────────────────

const THR = 0.05; // tolerância padrão em mm

function parseMM(v: string | undefined): number {
  const n = parseFloat(v ?? '');
  return isNaN(n) ? 0 : n;
}

function buildDiagnosis(
  empCab: string, empBlo: string,
  cils: CylMeasure[], munhoes: JournalMeasure[], moentes: JournalMeasure[],
): SuggestedItem[] {
  const items: SuggestedItem[] = [];

  // Empenamentos
  if (parseMM(empCab) > THR) {
    items.push({
      id: 'planif-cab',
      description: 'Planificação da face do cabeçote',
      type: 'service',
      reason: `Empenamento ${empCab} mm acima do limite de ${THR} mm`,
      selected: true, quantity: 1, unitPrice: 0,
    });
  }
  if (parseMM(empBlo) > THR) {
    items.push({
      id: 'planif-blo',
      description: 'Planificação da face do bloco',
      type: 'service',
      reason: `Empenamento ${empBlo} mm acima do limite de ${THR} mm`,
      selected: true, quantity: 1, unitPrice: 0,
    });
  }

  // Cilindros
  const cilsFora = cils.filter(c =>
    parseMM(c.ovalização) > THR || parseMM(c.conicidade) > THR || parseMM(c.folgaPistao) > 0.10
  );
  if (cilsFora.length > 0) {
    items.push({
      id: 'mandril-cil',
      description: `Mandrilamento de cilindros (${cilsFora.length} de ${cils.length} fora de spec)`,
      type: 'service',
      reason: `Ovalização ou conicidade excessiva em ${cilsFora.length} cilindro(s)`,
      selected: true, quantity: 1, unitPrice: 0,
    });
    items.push({
      id: 'pistons',
      description: `Pistões e anéis sobremedida — ${cilsFora.length} cil.`,
      type: 'part',
      reason: 'Mandrilamento requer pistões/anéis sobremedida',
      selected: true, quantity: cilsFora.length, unitPrice: 0,
    });
  }

  // Munhões principais
  const munFora = munhoes.filter(m => parseMM(m.ovalização) > THR || parseMM(m.conicidade) > THR);
  if (munFora.length > 0) {
    items.push({
      id: 'ret-mun',
      description: `Retífica de munhões principais (${munFora.length} munhão/ões)`,
      type: 'service',
      reason: `${munFora.length} munhão/ões com ovalização ou conicidade acima de ${THR} mm`,
      selected: true, quantity: 1, unitPrice: 0,
    });
    items.push({
      id: 'bronz-mancal',
      description: `Bronzinas de mancal sobremedida`,
      type: 'part',
      reason: 'Retífica de munhões requer bronzinas sobremedida',
      selected: true, quantity: munFora.length * 2, unitPrice: 0,
    });
  }

  // Moentes (munhões de biela)
  const moeFora = moentes.filter(m => parseMM(m.ovalização) > THR || parseMM(m.conicidade) > THR);
  if (moeFora.length > 0) {
    items.push({
      id: 'ret-moe',
      description: `Retífica de moentes / munhões de biela (${moeFora.length} moente/s)`,
      type: 'service',
      reason: `${moeFora.length} moente/s com desgaste acima de ${THR} mm`,
      selected: true, quantity: 1, unitPrice: 0,
    });
    items.push({
      id: 'bronz-biela',
      description: `Bronzinas de biela sobremedida`,
      type: 'part',
      reason: 'Retífica de moentes requer bronzinas sobremedida',
      selected: true, quantity: moeFora.length * 2, unitPrice: 0,
    });
  }

  // Itens padrão de toda retífica
  items.push({
    id: 'juntas',
    description: 'Jogo de juntas e retentores do motor',
    type: 'part',
    reason: 'Componente de reposição obrigatório em toda retífica',
    selected: true, quantity: 1, unitPrice: 0,
  });
  items.push({
    id: 'limpeza',
    description: 'Limpeza química e inspeção geral do motor',
    type: 'service',
    reason: 'Procedimento padrão de retífica',
    selected: true, quantity: 1, unitPrice: 0,
  });

  return items;
}

interface Props {
  osId:        string;
  osNumber:    string;
  onSave:      (data: MetrologiaData, items: SuggestedItem[]) => Promise<void>;
  onCancel:    () => void;
  initialData?: MetrologiaData | null;
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const EMPTY_CYL:     CylMeasure     = { diametroNominal: '', diametroMedido: '', ovalização: '', conicidade: '', folgaPistao: '' };
const EMPTY_JOURNAL: JournalMeasure = { diametroNominal: '', diametroMedido: '', ovalização: '', conicidade: '' };
const EMPTY_BORE:    BoreMeasure    = { diametroNominal: '', diametroMedido: '' };

function mkArr<T>(n: number, empty: T): T[] { return Array.from({ length: n }, () => ({ ...empty as any })); }
function adjustArr<T>(arr: T[], n: number, empty: T): T[] {
  if (n > arr.length) return [...arr, ...mkArr(n - arr.length, empty)];
  return arr.slice(0, n);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function NumStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))}
        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"><Minus size={12} /></button>
      <span className="w-6 text-center text-white font-black text-sm">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(16, value + 1))}
        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"><Plus size={12} /></button>
    </div>
  );
}

function Section({ title, color = 'blue', open, onToggle, children }: {
  title: string; color?: 'blue' | 'amber'; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const bg   = color === 'amber' ? 'bg-amber-500/10 text-amber-300' : 'bg-blue-500/10 text-blue-300';
  const ring = color === 'amber' ? 'border-amber-500/30' : 'border-blue-500/30';
  return (
    <div className={`rounded-xl border ${ring}`}>
      <button type="button" onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-2.5 ${bg} text-xs font-black uppercase tracking-widest rounded-xl`}>
        {title}
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && <div className="px-4 pb-4 pt-2">{children}</div>}
    </div>
  );
}

function NInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="number" step="0.001" min="0" value={value} onChange={(e) => onChange(e.target.value)} placeholder="—"
      className="w-24 bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/60 placeholder:text-slate-600" />
  );
}

function JournalTable({ rows, update, dotColor = 'blue' }: {
  rows: JournalMeasure[];
  update: (i: number, f: keyof JournalMeasure, v: string) => void;
  dotColor?: 'blue' | 'amber';
}) {
  const dot = dotColor === 'amber' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-slate-500 text-left">
          <th className="py-1.5 pr-3 w-10">#</th>
          <th className="py-1.5 pr-2">Ø Nominal (mm)</th>
          <th className="py-1.5 pr-2">Ø Medido (mm)</th>
          <th className="py-1.5 pr-2">Ovalização (mm)</th>
          <th className="py-1.5">Conicidade (mm)</th>
        </tr></thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1.5 pr-3"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${dot}`}>{i + 1}</span></td>
              <td className="py-1.5 pr-2"><NInput value={r.diametroNominal} onChange={(v) => update(i, 'diametroNominal', v)} /></td>
              <td className="py-1.5 pr-2"><NInput value={r.diametroMedido}  onChange={(v) => update(i, 'diametroMedido', v)} /></td>
              <td className="py-1.5 pr-2"><NInput value={r.ovalização}      onChange={(v) => update(i, 'ovalização', v)} /></td>
              <td className="py-1.5">    <NInput value={r.conicidade}      onChange={(v) => update(i, 'conicidade', v)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoreTable({ rows, update }: {
  rows: BoreMeasure[];
  update: (i: number, f: keyof BoreMeasure, v: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-slate-500 text-left">
          <th className="py-1.5 pr-3 w-10">#</th>
          <th className="py-1.5 pr-2">Ø Nominal (mm)</th>
          <th className="py-1.5">Ø Medido (mm)</th>
        </tr></thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1.5 pr-3"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/15 text-blue-400 font-black text-xs">{i + 1}</span></td>
              <td className="py-1.5 pr-2"><NInput value={r.diametroNominal} onChange={(v) => update(i, 'diametroNominal', v)} /></td>
              <td className="py-1.5">    <NInput value={r.diametroMedido}  onChange={(v) => update(i, 'diametroMedido', v)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
// (interface já declarada acima junto com SuggestedItem)

// ─── Componente Principal ─────────────────────────────────────────────────────
export function MetrologiaModal({ osId, osNumber, onSave, onCancel, initialData }: Props) {
  const nCylInit = initialData?.numeroCilindros ?? 4;

  const [empCab, setEmpCab] = useState(initialData?.empenamentoCabecote ?? '');
  const [empBlo, setEmpBlo] = useState(initialData?.empenamentoBloco ?? '');

  const [numCyl, setNumCyl] = useState(nCylInit);
  const [cils,   setCils]   = useState<CylMeasure[]>(initialData?.cilindros ?? mkArr(nCylInit, EMPTY_CYL));

  const [numMun, setNumMun] = useState(initialData?.numeroMunhoes ?? nCylInit + 1);
  const [munhoes, setMunhoes] = useState<JournalMeasure[]>(initialData?.munhoes ?? mkArr(nCylInit + 1, EMPTY_JOURNAL));

  const [numMoe, setNumMoe] = useState(initialData?.numeroMoentes ?? nCylInit);
  const [moentes, setMoentes] = useState<JournalMeasure[]>(initialData?.moentes ?? mkArr(nCylInit, EMPTY_JOURNAL));

  const [numMan, setNumMan] = useState(initialData?.numeroMancais ?? nCylInit + 1);
  const [mancais, setMancais] = useState<BoreMeasure[]>(initialData?.mancaisBloco ?? mkArr(nCylInit + 1, EMPTY_BORE));

  const [numBie, setNumBie] = useState(initialData?.numeroBielas ?? nCylInit);
  const [bielas,  setBielas]  = useState<BoreMeasure[]>(initialData?.bielas ?? mkArr(nCylInit, EMPTY_BORE));

  const [tecnico, setTecnico] = useState(initialData?.tecnico ?? '');
  const [obs,     setObs]     = useState(initialData?.observacoes ?? '');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Controle de steps
  const [step, setStep] = useState<1 | 2>(1);
  const [diagItems, setDiagItems] = useState<SuggestedItem[]>([]);

  const [open, setOpen] = useState({ emp: true, cil: true, mun: false, moe: false, man: false, bie: false, fin: true });
  const toggle = (k: keyof typeof open) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  // Alterar cilindros sincroniza moentes/bielas/munhões/mancais
  const handleNumCyl = (n: number) => {
    setNumCyl(n); setCils((p) => adjustArr(p, n, EMPTY_CYL));
    setNumMoe(n); setMoentes((p) => adjustArr(p, n, EMPTY_JOURNAL));
    setNumBie(n); setBielas((p) => adjustArr(p, n, EMPTY_BORE));
    setNumMun(n + 1); setMunhoes((p) => adjustArr(p, n + 1, EMPTY_JOURNAL));
    setNumMan(n + 1); setMancais((p) => adjustArr(p, n + 1, EMPTY_BORE));
  };

  const updCyl = (i: number, f: keyof CylMeasure, v: string) =>
    setCils((p) => { const a = [...p]; a[i] = { ...a[i], [f]: v }; return a; });
  const updJou = (setter: React.Dispatch<React.SetStateAction<JournalMeasure[]>>) =>
    (i: number, f: keyof JournalMeasure, v: string) =>
      setter((p) => { const a = [...p]; a[i] = { ...a[i], [f]: v }; return a; });
  const updBor = (setter: React.Dispatch<React.SetStateAction<BoreMeasure[]>>) =>
    (i: number, f: keyof BoreMeasure, v: string) =>
      setter((p) => { const a = [...p]; a[i] = { ...a[i], [f]: v }; return a; });

  const goToStep2 = () => {
    const items = buildDiagnosis(empCab, empBlo, cils, munhoes, moentes);
    setDiagItems(items);
    setStep(2);
  };

  const toggleDiagItem = (id: string) =>
    setDiagItems((p) => p.map((it) => it.id === id ? { ...it, selected: !it.selected } : it));

  const addCustomItem = (type: 'service' | 'part') => {
    const desc = window.prompt(type === 'service' ? 'Descrição do serviço:' : 'Descrição da peça:');
    if (!desc?.trim()) return;
    setDiagItems((p) => [
      ...p,
      { id: `custom-${Date.now()}`, description: desc.trim(), type, reason: 'Adicionado manualmente', selected: true, quantity: 1, unitPrice: 0 },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        {
          empenamentoCabecote: empCab, empenamentoBloco: empBlo,
          numeroCilindros: numCyl, cilindros: cils,
          numeroMunhoes: numMun, munhoes,
          numeroMoentes: numMoe, moentes,
          numeroMancais: numMan, mancaisBloco: mancais,
          numeroBielas: numBie, bielas,
          tecnico, observacoes: obs,
          dataLeitura: new Date().toISOString(),
        },
        diagItems.filter((it) => it.selected),
      );
      setSaved(true);
      setTimeout(onCancel, 900);
    } finally {
      setSaving(false);
    }
  };

  // ─── Passo 2: Diagnóstico ────────────────────────────────────────────────────
  const services = diagItems.filter((it) => it.type === 'service');
  const parts    = diagItems.filter((it) => it.type === 'part');
  const selectedCount = diagItems.filter((it) => it.selected).length;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              {step === 1
                ? <Ruler className="text-blue-400 w-5 h-5" />
                : <FlaskConical className="text-emerald-400 w-5 h-5" />}
              <div>
                <h2 className="text-white font-black text-lg">
                  {step === 1 ? 'Ficha de Metrologia' : 'Diagnóstico Técnico'}
                </h2>
                <p className="text-slate-500 text-xs">
                  {step === 1
                    ? `OS #${osNumber} · passo 1 de 2 — preencha as medidas do motor`
                    : `OS #${osNumber} · passo 2 de 2 — confirme serviços e peças sugeridos`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Progress dots */}
              <div className="flex gap-1.5">
                <div className={`w-6 h-1.5 rounded-full transition-colors ${step === 1 ? 'bg-blue-500' : 'bg-white/20'}`} />
                <div className={`w-6 h-1.5 rounded-full transition-colors ${step === 2 ? 'bg-emerald-500' : 'bg-white/20'}`} />
              </div>
              <button type="button" onClick={onCancel} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ─── STEP 1: Medições ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">

              {/* Empenamentos */}
              <Section title="Empenamentos" open={open.emp} onToggle={() => toggle('emp')}>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1.5">Empenamento — Face do cabeçote (mm)</label>
                    <input type="number" step="0.001" min="0" value={empCab} onChange={(e) => setEmpCab(e.target.value)} placeholder="ex: 0.050"
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/60 placeholder:text-slate-600" />
                    <p className="text-slate-600 text-[10px] mt-1">Limite típico: 0,05 mm</p>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1.5">Empenamento — Face do bloco (mm)</label>
                    <input type="number" step="0.001" min="0" value={empBlo} onChange={(e) => setEmpBlo(e.target.value)} placeholder="ex: 0.050"
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/60 placeholder:text-slate-600" />
                    <p className="text-slate-600 text-[10px] mt-1">Limite típico: 0,05 mm</p>
                  </div>
                </div>
              </Section>

              {/* Cilindros */}
              <Section title={`Cilindros (${numCyl})`} open={open.cil} onToggle={() => toggle('cil')}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-slate-400 text-xs font-semibold">Número de cilindros:</span>
                  <NumStepper value={numCyl} onChange={handleNumCyl} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-slate-500 text-left">
                      <th className="py-1.5 pr-3 w-10">Cil.</th>
                      <th className="py-1.5 pr-2">Ø Nominal (mm)</th>
                      <th className="py-1.5 pr-2">Ø Medido (mm)</th>
                      <th className="py-1.5 pr-2">Ovalização (mm)</th>
                      <th className="py-1.5 pr-2">Conicidade (mm)</th>
                      <th className="py-1.5">Folga Pistão (mm)</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {cils.map((c, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-3"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/15 text-blue-400 font-black text-xs">{i + 1}</span></td>
                          <td className="py-1.5 pr-2"><NInput value={c.diametroNominal} onChange={(v) => updCyl(i, 'diametroNominal', v)} /></td>
                          <td className="py-1.5 pr-2"><NInput value={c.diametroMedido}  onChange={(v) => updCyl(i, 'diametroMedido', v)} /></td>
                          <td className="py-1.5 pr-2"><NInput value={c.ovalização}      onChange={(v) => updCyl(i, 'ovalização', v)} /></td>
                          <td className="py-1.5 pr-2"><NInput value={c.conicidade}      onChange={(v) => updCyl(i, 'conicidade', v)} /></td>
                          <td className="py-1.5">    <NInput value={c.folgaPistao}     onChange={(v) => updCyl(i, 'folgaPistao', v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Munhões principais */}
              <Section title={`Munhões do Virabrequim — Principais (${numMun})`} color="amber" open={open.mun} onToggle={() => toggle('mun')}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-slate-400 text-xs font-semibold">Quantidade:</span>
                  <NumStepper value={numMun} onChange={(n) => { setNumMun(n); setMunhoes((p) => adjustArr(p, n, EMPTY_JOURNAL)); }} />
                  <span className="text-slate-600 text-[10px]">(geralmente cilindros + 1)</span>
                </div>
                <JournalTable rows={munhoes} update={updJou(setMunhoes)} dotColor="amber" />
              </Section>

              {/* Moentes */}
              <Section title={`Moentes do Virabrequim — Munhões de Biela (${numMoe})`} color="amber" open={open.moe} onToggle={() => toggle('moe')}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-slate-400 text-xs font-semibold">Quantidade:</span>
                  <NumStepper value={numMoe} onChange={(n) => { setNumMoe(n); setMoentes((p) => adjustArr(p, n, EMPTY_JOURNAL)); }} />
                </div>
                <JournalTable rows={moentes} update={updJou(setMoentes)} dotColor="amber" />
              </Section>

              {/* Mancais do bloco */}
              <Section title={`Mancais de Apoio do Bloco (${numMan})`} open={open.man} onToggle={() => toggle('man')}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-slate-400 text-xs font-semibold">Quantidade:</span>
                  <NumStepper value={numMan} onChange={(n) => { setNumMan(n); setMancais((p) => adjustArr(p, n, EMPTY_BORE)); }} />
                </div>
                <BoreTable rows={mancais} update={updBor(setMancais)} />
              </Section>

              {/* Bielas */}
              <Section title={`Diâmetro Interno das Cabeças de Biela (${numBie})`} open={open.bie} onToggle={() => toggle('bie')}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-slate-400 text-xs font-semibold">Quantidade:</span>
                  <NumStepper value={numBie} onChange={(n) => { setNumBie(n); setBielas((p) => adjustArr(p, n, EMPTY_BORE)); }} />
                </div>
                <BoreTable rows={bielas} update={updBor(setBielas)} />
              </Section>

              {/* Técnico e Observações */}
              <Section title="Técnico & Observações" open={open.fin} onToggle={() => toggle('fin')}>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1.5">Técnico responsável</label>
                    <input value={tecnico} onChange={(e) => setTecnico(e.target.value)} placeholder="Nome do técnico"
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/60 transition-colors" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1.5">Observações técnicas</label>
                    <textarea value={obs} onChange={(e) => setObs(e.target.value)}
                      placeholder="Desgaste irregular, trincas, recomendações..." rows={2}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/60 transition-colors resize-none" />
                  </div>
                </div>
              </Section>

            </div>
          )}

          {/* ─── STEP 2: Diagnóstico ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Banner de instrução */}
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3">
                <AlertTriangle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-emerald-300 text-xs leading-relaxed">
                  Com base nas medidas inseridas, o sistema identificou os serviços e peças abaixo. 
                  Marque ou desmarque conforme a decisão técnica — os itens selecionados serão 
                  adicionados automaticamente à OS.
                </p>
              </div>

              {/* Serviços sugeridos */}
              {services.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
                      <Wrench size={12} /> Serviços
                    </h3>
                    <button type="button" onClick={() => addCustomItem('service')}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors">
                      <Plus size={10} /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {services.map((it) => (
                      <label key={it.id} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                        it.selected ? 'border-blue-500/40 bg-blue-500/8' : 'border-white/5 bg-white/2 opacity-50'
                      }`}>
                        <input type="checkbox" checked={it.selected} onChange={() => toggleDiagItem(it.id)}
                          className="mt-0.5 accent-blue-500 w-3.5 h-3.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-white text-xs font-semibold leading-snug">{it.description}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 leading-snug">{it.reason}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Peças sugeridas */}
              {parts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                      <Package size={12} /> Peças
                    </h3>
                    <button type="button" onClick={() => addCustomItem('part')}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors">
                      <Plus size={10} /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {parts.map((it) => (
                      <label key={it.id} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                        it.selected ? 'border-amber-500/40 bg-amber-500/8' : 'border-white/5 bg-white/2 opacity-50'
                      }`}>
                        <input type="checkbox" checked={it.selected} onChange={() => toggleDiagItem(it.id)}
                          className="mt-0.5 accent-amber-500 w-3.5 h-3.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-xs font-semibold leading-snug">{it.description}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 leading-snug">{it.reason}</p>
                        </div>
                        {it.quantity > 1 && (
                          <span className="text-[10px] text-amber-400 font-black shrink-0 mt-0.5">× {it.quantity}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {diagItems.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhuma anomalia detectada nas medidas informadas. Você pode adicionar itens manualmente.
                  <div className="flex justify-center gap-3 mt-4">
                    <button type="button" onClick={() => addCustomItem('service')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-300 rounded-lg text-xs font-semibold"><Wrench size={12} /> Serviço</button>
                    <button type="button" onClick={() => addCustomItem('part')} className="flex items-center gap-1 px-3 py-1.5 bg-amber-600/20 text-amber-300 rounded-lg text-xs font-semibold"><Package size={12} /> Peça</button>
                  </div>
                </div>
              )}

              {/* Resumo */}
              {selectedCount > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/3 px-4 py-2.5 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <p className="text-slate-300 text-xs">
                    <span className="font-black text-white">{selectedCount}</span> ite{selectedCount > 1 ? 'ns' : 'm'} selecionado{selectedCount > 1 ? 's' : ''} para adicionar à OS
                  </p>
                </div>
              )}

            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 shrink-0">
            {step === 1 ? (
              <>
                <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={goToStep2}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition-all">
                  Próximo: Diagnóstico →
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5 px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
                  <ChevronLeft size={15} /> Voltar às medidas
                </button>
                <button type="button" onClick={handleSave} disabled={saving || saved}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-black rounded-xl transition-all">
                  {saved  ? <><CheckCircle2 size={15} /> Salvo!</> :
                   saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> :
                            <>Confirmar e avançar para Metrologia</>}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
