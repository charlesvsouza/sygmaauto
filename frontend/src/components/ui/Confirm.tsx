import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva ou irreversível: botão de confirmar em vermelho. */
  danger?: boolean;
}

export interface PromptOptions extends Omit<ConfirmOptions, 'danger'> {
  /** Rótulo do campo de texto. */
  inputLabel: string;
  placeholder?: string;
  defaultValue?: string;
  /** Quando true, não deixa confirmar com o campo vazio. */
  required?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;
type PromptFn = (options: PromptOptions) => Promise<string | null>;

const ConfirmContext = createContext<ConfirmFn | null>(null);
const PromptContext = createContext<PromptFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [promptOptions, setPromptOptions] = useState<PromptOptions | null>(null);
  const [text, setText] = useState('');
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const promptResolver = useRef<((value: string | null) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalized = typeof opts === 'string' ? { message: opts } : opts;
    resolver.current?.(false); // um diálogo aberto por vez: o anterior é cancelado
    setOptions(normalized);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const prompt = useCallback<PromptFn>((opts) => {
    promptResolver.current?.(null);
    setText(opts.defaultValue ?? '');
    setPromptOptions(opts);
    return new Promise<string | null>((resolve) => {
      promptResolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const settlePrompt = useCallback((value: string | null) => {
    promptResolver.current?.(value);
    promptResolver.current = null;
    setPromptOptions(null);
  }, []);

  const cancel = useCallback(() => settle(false), [settle]);
  const cancelPrompt = useCallback(() => settlePrompt(null), [settlePrompt]);
  const canSubmitPrompt = !promptOptions?.required || text.trim().length > 0;

  return (
    <ConfirmContext.Provider value={confirm}>
     <PromptContext.Provider value={prompt}>
      {children}
      <Modal
        open={options !== null}
        onClose={cancel}
        size="sm"
        title={options?.title ?? 'Confirmar ação'}
        footer={
          <>
            <Button variant="ghost" onClick={cancel}>
              {options?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button
              data-autofocus
              variant={options?.danger ? 'danger' : 'primary'}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-surface-200">{options?.message}</p>
      </Modal>
      <Modal
        open={promptOptions !== null}
        onClose={cancelPrompt}
        size="sm"
        title={promptOptions?.title ?? 'Informe'}
        footer={
          <>
            <Button variant="ghost" onClick={cancelPrompt}>
              {promptOptions?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button disabled={!canSubmitPrompt} onClick={() => settlePrompt(text)}>
              {promptOptions?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmitPrompt) settlePrompt(text);
          }}
        >
          <p className="text-sm leading-relaxed text-surface-200">{promptOptions?.message}</p>
          <label className="block text-sm text-surface-200">
            {promptOptions?.inputLabel}
            <input
              data-autofocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={promptOptions?.placeholder}
              className="input mt-1"
            />
          </label>
        </form>
      </Modal>
     </PromptContext.Provider>
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>');
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrompt(): PromptFn {
  const ctx = useContext(PromptContext);
  if (!ctx) {
    throw new Error('usePrompt deve ser usado dentro de <ConfirmProvider>');
  }
  return ctx;
}
