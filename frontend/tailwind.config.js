/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f6f6f7',
          100: '#eaeaec',
          200: '#d5d5d9',
          300: '#b0b0b8',
          400: '#858590',
          500: '#6a6a76',
          600: '#52525e',
          700: '#3f3f49',
          800: '#24242c',
          900: '#16161c',
          950: '#0e0e12',
        },
        // ===== Tokens semânticos (dirigidos por variáveis CSS, tema-switchável) =====
        app: 'rgb(var(--app) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        'panel-2': 'rgb(var(--panel-2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'rgb(var(--sidebar) / <alpha-value>)',
          ink: 'rgb(var(--sidebar-ink) / <alpha-value>)',
          active: 'rgb(var(--sidebar-active) / <alpha-value>)',
        },
        // ===== Compat: surface/gold/base agora seguem o tema (invertidos p/ claro) =====
        // Mantém milhares de usos existentes funcionando ao trocar o tema.
        gold: {
          300: 'rgb(var(--accent) / <alpha-value>)',
          400: 'rgb(var(--accent) / <alpha-value>)',
          500: 'rgb(var(--accent) / <alpha-value>)',
          600: 'rgb(var(--accent-hover) / <alpha-value>)',
          700: 'rgb(var(--accent-hover) / <alpha-value>)',
        },
        surface: {
          50: 'rgb(var(--surface-50) / <alpha-value>)',
          100: 'rgb(var(--surface-100) / <alpha-value>)',
          200: 'rgb(var(--surface-200) / <alpha-value>)',
          300: 'rgb(var(--surface-300) / <alpha-value>)',
          400: 'rgb(var(--surface-400) / <alpha-value>)',
          500: 'rgb(var(--surface-500) / <alpha-value>)',
          600: 'rgb(var(--surface-600) / <alpha-value>)',
          700: 'rgb(var(--surface-700) / <alpha-value>)',
          800: 'rgb(var(--surface-800) / <alpha-value>)',
          900: 'rgb(var(--surface-900) / <alpha-value>)',
          950: 'rgb(var(--surface-950) / <alpha-value>)',
        },
        base: 'rgb(var(--app) / <alpha-value>)',
        // Cores semânticas — estados de feedback
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#2563eb',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 12px 18px -6px rgba(0,0,0,0.16), 0 4px 8px -4px rgba(0,0,0,0.10)',
        'soft': '0 2px 10px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        'card': '14px',
      },
      animation: {
        'fade-in': 'fadeIn 0.28s ease-out',
        'slide-up': 'slideUp 0.28s ease-out',
        'slide-in': 'slideIn 0.22s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
