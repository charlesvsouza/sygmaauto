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
        gold: {
          300: '#f3d486',
          400: '#e6bc5e',
          500: '#d4a843',
          600: '#b8912f',
          700: '#8c6d23',
        },
        surface: {
          50: '#f7f7f8',
          100: '#ececf0',
          200: '#e0e0e6',
          300: '#cdcdd3',
          400: '#a4a4ad',
          500: '#8a8a93',
          600: '#73737c',
          700: '#5b5b64',
          800: '#3e3e45',
          900: '#28282f',
          950: '#18181d',
        },
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
