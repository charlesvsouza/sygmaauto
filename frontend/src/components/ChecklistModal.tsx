import { useEffect, useRef, useState } from 'react';
import { checklistApi } from '../api/client';
import { X, Loader2, CheckCircle2, Camera, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Áreas do veículo ──────────────────────────────────────────────────────
const AREAS = [
  { key: 'PARA_CHOQUE_DIANT', label: 'Para-choque Diant.' },
  { key: 'CAPO',              label: 'Capô' },
  { key: 'PARABRISA',         label: 'Parabrisa' },
  { key: 'PORTA_LE_DIANT',    label: 'Porta Esq. Diant.' },
  { key: 'PORTA_LD_DIANT',    label: 'Porta Dir. Diant.' },
  { key: 'PORTA_LE_TRAS',     label: 'Porta Esq. Trás' },
  { key: 'PORTA_LD_TRAS',     label: 'Porta Dir. Trás' },
  { key: 'LATERAL_LE',        label: 'Lateral Esquerda' },
  { key: 'LATERAL_LD',        label: 'Lateral Direita' },
  { key: 'TETO',              label: 'Teto' },
  { key: 'VIDRO_TRASEIRO',    label: 'Vidro Traseiro' },
  { key: 'PARA_CHOQUE_TRAS',  label: 'Para-choque Tras.' },
  { key: 'INTERIOR',          label: 'Interior / Bancos' },
  { key: 'PNEUS',             label: 'Pneus' },
  { key: 'EQUIPAMENTOS',      label: 'Equipamentos (chave, estepe…)' },
];

type Condition = 'OK' | 'RISCO' | 'AMASSADO' | 'QUEBRADO' | 'AUSENTE' | '';

const CONDITIONS: { key: Condition; label: string; color: string }[] = [
  { key: 'OK',       label: 'OK',       color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { key: 'RISCO',    label: 'Risco',    color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { key: 'AMASSADO', label: 'Amassado', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'QUEBRADO', label: 'Quebrado', color: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'AUSENTE',  label: 'Ausente',  color: 'bg-slate-100 text-slate-500 border-slate-300' },
];

interface ItemState {
  condition: Condition;
  notes: string;
  photos: { data: string; mimeType: string }[];
  expanded: boolean;
}

type ItemsMap = Record<string, ItemState>;

interface Props {
  serviceOrderId: string;
  orderNumber?: number | string;
  type: 'ENTRADA' | 'SAIDA';
  onClose: () => void;
  onSaved?: () => void;
}

// Comprime imagem para ≤ 300 KB antes de armazenar como base64
async function compressImage(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        const data = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
        resolve({ data, mimeType: 'image/jpeg' });
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const FUEL_LABELS = ['Vazio', '1/8', '2/8', '3/8', '4/8 (Meio)', '5/8', '6/8', '7/8', 'Cheio'];

function defaultItems(): ItemsMap {
  return Object.fromEntries(
    AREAS.map((a) => [a.key, { condition: '' as Condition, notes: '', photos: [], expanded: false }])
  );
}

export function ChecklistModal({ serviceOrderId, orderNumber, type, onClose, onSaved }: Props) {
  const [items, setItems] = useState<ItemsMap>(defaultItems);
  const [fuelLevel, setFuelLevel] = useState(4);
  const [observations, setObservations] = useState('');
  const [completedBy, setCompletedBy] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const activeAreaRef = useRef<string | null>(null);

  // Carrega checklist existente
  useEffect(() => {
    checklistApi.get(serviceOrderId).then((res) => {
      const existing = (res.data as any[]).find((c) => c.type === type);
      if (existing) {
        setFuelLevel(existing.fuelLevel ?? 4);
        setObservations(existing.observations ?? '');
        setCompletedBy(existing.completedBy ?? '');
        const map = defaultItems();
        for (const item of existing.items ?? []) {
          if (map[item.area]) {
            map[item.area].condition = item.condition;
            map[item.area].notes = item.notes ?? '';
            map[item.area].photos = item.photos ?? [];
          }
        }
        setItems(map);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [serviceOrderId, type]);

  function setCondition(area: string, condition: Condition) {
    setItems((prev) => ({ ...prev, [area]: { ...prev[area], condition } }));
  }

  function setNotes(area: string, notes: string) {
    setItems((prev) => ({ ...prev, [area]: { ...prev[area], notes } }));
  }

  function toggleExpand(area: string) {
    setItems((prev) => ({ ...prev, [area]: { ...prev[area], expanded: !prev[area].expanded } }));
  }

  async function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const area = activeAreaRef.current;
    if (!area || !e.target.files?.length) return;
    const file = e.target.files[0];
    const compressed = await compressImage(file);
    setItems((prev) => ({
      ...prev,
      [area]: { ...prev[area], photos: [...prev[area].photos, compressed] },
    }));
    e.target.value = '';
  }

  function removePhoto(area: string, idx: number) {
    setItems((prev) => {
      const photos = prev[area].photos.filter((_, i) => i !== idx);
      return { ...prev, [area]: { ...prev[area], photos } };
    });
  }

  function openCamera(area: string) {
    activeAreaRef.current = area;
    photoInputRef.current?.click();
  }

  async function handleSave() {
    setSaving(true);
    try {
      const dto = {
        fuelLevel,
        observations,
        completedBy,
        items: AREAS
          .filter((a) => items[a.key].condition !== '')
          .map((a) => ({
            area: a.key,
            condition: items[a.key].condition,
            notes: items[a.key].notes || undefined,
            photos: items[a.key].photos.length ? items[a.key].photos : undefined,
          })),
      };
      await checklistApi.upsert(serviceOrderId, type, dto);
      setSaved(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar checklist. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const title = type === 'ENTRADA' ? '🔑 Checklist de Entrada' : '🚗 Checklist de Saída';
  const markedCount = AREAS.filter((a) => items[a.key].condition !== '').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-4 px-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {orderNumber && (
              <p className="text-xs text-slate-500 mt-0.5">OS #{orderNumber}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Responsável */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Responsável pela vistoria
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Nome do mecânico / recepcionista"
                value={completedBy}
                onChange={(e) => setCompletedBy(e.target.value)}
              />
            </div>

            {/* Nível de combustível */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Nível de Combustível
              </label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 9 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setFuelLevel(i)}
                    className={cn(
                      'flex-1 h-8 rounded-lg text-xs font-bold border transition',
                      fuelLevel === i
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100',
                    )}
                    title={FUEL_LABELS[i]}
                  >
                    {i === 0 ? 'E' : i === 8 ? 'F' : `${i}/8`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1 text-center">{FUEL_LABELS[fuelLevel]}</p>
            </div>

            {/* Itens por área */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600">
                  Condição das Áreas
                </label>
                <span className="text-xs text-slate-400">
                  {markedCount}/{AREAS.length} marcadas
                </span>
              </div>
              <div className="space-y-2">
                {AREAS.map((area) => {
                  const item = items[area.key];
                  const cond = CONDITIONS.find((c) => c.key === item.condition);
                  return (
                    <div
                      key={area.key}
                      className="border border-slate-200 rounded-xl overflow-hidden"
                    >
                      {/* Area header row */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50">
                        <span className="text-xs font-semibold text-slate-700 flex-1">
                          {area.label}
                        </span>
                        {/* Condition buttons */}
                        <div className="flex gap-1 flex-wrap justify-end">
                          {CONDITIONS.map((c) => (
                            <button
                              key={c.key}
                              onClick={() => setCondition(area.key, item.condition === c.key ? '' : c.key)}
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-lg border transition',
                                item.condition === c.key
                                  ? c.color + ' shadow-sm'
                                  : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100',
                              )}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                        {/* Expand toggle */}
                        <button
                          onClick={() => toggleExpand(area.key)}
                          className="p-1 hover:bg-slate-200 rounded transition"
                        >
                          <ChevronDown
                            size={14}
                            className={cn('transition-transform', item.expanded && 'rotate-180')}
                          />
                        </button>
                      </div>

                      {/* Expanded: notes + photos */}
                      {item.expanded && (
                        <div className="px-3 py-2 border-t border-slate-100 space-y-2 bg-white">
                          <input
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                            placeholder="Observação sobre esta área (opcional)"
                            value={item.notes}
                            onChange={(e) => setNotes(area.key, e.target.value)}
                          />
                          {/* Photos */}
                          <div className="flex flex-wrap gap-2">
                            {item.photos.map((p, idx) => (
                              <div key={idx} className="relative w-16 h-16">
                                <img
                                  src={`data:${p.mimeType};base64,${p.data}`}
                                  alt=""
                                  className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                                />
                                <button
                                  onClick={() => removePhoto(area.key, idx)}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
                                >
                                  <Trash2 size={9} />
                                </button>
                              </div>
                            ))}
                            {item.photos.length < 3 && (
                              <button
                                onClick={() => openCamera(area.key)}
                                className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:bg-slate-50 transition text-[10px] gap-1"
                              >
                                <Camera size={16} />
                                <span>Foto</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observações gerais */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Observações Gerais
              </label>
              <textarea
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                placeholder="Detalhes adicionais sobre a vistoria…"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition',
                saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60',
              )}
            >
              {saved ? (
                <><CheckCircle2 size={15} /> Salvo!</>
              ) : saving ? (
                <><Loader2 size={15} className="animate-spin" /> Salvando…</>
              ) : (
                `Salvar Checklist de ${type === 'ENTRADA' ? 'Entrada' : 'Saída'}`
              )}
            </button>
          </div>
        )}
      </div>

      {/* Input invisível para câmera/arquivo */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoAdd}
      />
    </div>
  );
}
