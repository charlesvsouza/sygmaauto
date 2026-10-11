import { forwardRef, useState, type InputHTMLAttributes } from 'react';

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

// Dígitos com um separador decimal (ponto ou vírgula) e até 2 casas.
const VALID_DRAFT = /^\d*[.,]?\d{0,2}$/;
const PREFIX = 'R$ ';

const format = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Campo de valor em reais com máscara de entrada.
 *
 * - Vazio (ou zero): sem nada no campo, só o placeholder "R$ 0,00". Ao digitar 100,00
 *   aparece "R$ 100,00" — nunca "0100,00".
 * - Fora de foco, o valor aparece formatado: "R$ 1.234,50".
 * - Aceita vírgula ou ponto; o onChange sempre recebe o valor com ponto ("100.5"),
 *   e '' quando o campo fica vazio. Mesmas props de `<input type="number">`.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onFocus, onBlur, min: _min, max: _max, step: _step, ...props }, ref) => {
    // Texto digitado enquanto o campo está em foco; null = mostrar o valor do pai.
    const [draft, setDraft] = useState<string | null>(null);

    const hasValue = value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) !== 0;
    let shown = '';
    if (draft !== null) shown = draft === '' ? '' : PREFIX + draft;
    else if (hasValue) shown = PREFIX + format(Number(value));

    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={shown}
        placeholder={props.placeholder ?? 'R$ 0,00'}
        onFocus={(e) => {
          // Em foco mostra o valor editável (sem milhar), pronto para digitar por cima.
          setDraft(hasValue ? String(Number(value)).replace('.', ',') : '');
          requestAnimationFrame(() => e.target.select?.());
          onFocus?.(e);
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/^\s*R\$\s*/i, '').replace(/\s/g, '');
          if (!VALID_DRAFT.test(raw)) return;
          setDraft(raw);
          const normalized = raw.replace(',', '.');
          e.target.value = normalized === '' || normalized === '.' ? '' : normalized;
          onChange?.(e);
        }}
        onBlur={(e) => {
          setDraft(null);
          onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);

CurrencyInput.displayName = 'CurrencyInput';
