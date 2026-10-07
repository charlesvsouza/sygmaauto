import { forwardRef, useState, type InputHTMLAttributes } from 'react';

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

// Aceita dígitos com um separador decimal (ponto ou vírgula) e sinal opcional.
const VALID_DRAFT = /^-?\d*[.,]?\d*$/;

/**
 * Campo numérico para valores, horas, quantidades e percentuais.
 *
 * - Sem o "0 morto": com valor 0 o campo abre vazio para digitar por cima, e apagar
 *   tudo deixa o campo vazio em vez de voltar para "0".
 * - Aceita vírgula ou ponto ("0,5" e "0.5"); o onChange sempre recebe o valor com ponto.
 * - É um campo de texto com teclado numérico: `type="number"` apaga o que está sendo
 *   digitado em casos como "0." e faz o campo "brigar" com quem digita.
 *
 * Troca direta de `<input type="number">`: mesmas props, mesmo onChange.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, onFocus, onBlur, min, max: _max, step: _step, ...props }, ref) => {
    // Texto digitado enquanto o campo está em foco; null = mostrar o valor do pai.
    const [draft, setDraft] = useState<string | null>(null);

    const isZero = value === 0 || value === '0';
    const shown = draft !== null ? draft : isZero ? '' : String(value ?? '');
    const allowNegative = min !== undefined && Number(min) < 0;

    return (
      <input
        ref={ref}
        type="text"
        inputMode={allowNegative ? 'text' : 'decimal'}
        autoComplete="off"
        value={shown}
        placeholder={props.placeholder ?? (isZero ? '0' : undefined)}
        onFocus={(e) => {
          if (isZero) setDraft('');
          // Seleciona o conteúdo para que digitar substitua o valor anterior.
          requestAnimationFrame(() => e.target.select?.());
          onFocus?.(e);
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (!VALID_DRAFT.test(raw) || (!allowNegative && raw.includes('-'))) return;
          setDraft(raw);
          const normalized = raw.replace(',', '.');
          // O pai lê e.target.value; entrega sempre com ponto, e '' vira ''.
          e.target.value = normalized === '-' || normalized === '.' ? '' : normalized;
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

NumberInput.displayName = 'NumberInput';
