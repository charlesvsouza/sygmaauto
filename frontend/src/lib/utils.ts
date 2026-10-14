import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Datas: o servidor grava timestamps UTC e o <input type="date"> /
// <input type="datetime-local"> trabalham com "AAAA-MM-DD" no horário LOCAL.
// new Date("AAAA-MM-DD") é lido como UTC e, no Brasil, vira o dia anterior;
// toISOString() depois das 21h já é o dia seguinte. Use estas funções. ───

const pad2 = (n: number) => String(n).padStart(2, '0');

// "AAAA-MM-DD" (ou timestamp com essa base) → Date no horário local, sem deslocar o dia.
export function parseYmdLocal(value?: string | Date | null): Date | null {
  if (!value) return null;
  const s = value instanceof Date ? value.toISOString() : String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Data de hoje no fuso de Brasília como "AAAA-MM-DD" (independente do fuso do navegador).
export function todayBrInput(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}

// ISO/timestamp → valor para <input type="datetime-local"> no fuso de Brasília.
export function toDateTimeLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const br = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (type: string) => br.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

// Valor digitado em <input type="datetime-local"> ("AAAA-MM-DDTHH:mm", horário da oficina)
// → ISO UTC, com o offset -03:00 explícito para o backend gravar a hora pretendida.
export function dateTimeLocalToBrIso(input?: string | null): string | undefined {
  if (!input) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(input).trim());
  if (!m) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-03:00`;
}

// ─── Moeda: aceita "1.234,56", "1234.56", "R$ 1.234,56" ───

export function parseBrCurrency(value?: string | number | null): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null) return null;
  let s = String(value).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!s) return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
