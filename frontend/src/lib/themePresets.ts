export type ThemePresetId = 'light' | 'dark';

type ThemePreset = {
  id: ThemePresetId;
  label: string;
  description: string;
  swatches: string[]; // preview [fundo, painel, acento]
};

const STORAGE_KEY = 'sygmaauto-theme';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'light',
    label: 'Claro',
    description: 'Verde-água, superfícies claras (padrão)',
    swatches: ['#eef3f2', '#ffffff', '#1f9d8f'],
  },
  {
    id: 'dark',
    label: 'Escuro',
    description: 'Fundo escuro, ideal para baixa luz',
    swatches: ['#08090a', '#18181d', '#2db3a3'],
  },
];

/** Aplica o tema definindo [data-theme] no <html> (dirige as variáveis CSS). */
export function applyThemePreset(id: ThemePresetId) {
  document.documentElement.setAttribute('data-theme', id);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function getStoredThemePreset(): ThemePresetId {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as ThemePresetId | null;
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function initializeThemePreset() {
  applyThemePreset(getStoredThemePreset());
}
