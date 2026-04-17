/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        field: {
          50: '#f0fdf4',
          300: '#86efac',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d'
        },
        dirt: {
          50: '#fdf8f3',
          200: '#fde7c2',
          500: '#c2854a',
          700: '#92400e'
        },
        ump: {
          bg: '#070b16',
          bg2: '#0c1424',
          card: '#131c30',
          cardHi: '#1b2740',
          line: '#2a3554',
          ink: '#f1f5f9',
          dim: '#94a3b8',
          accent: '#f59e0b',
          accent2: '#f97316',
          ok: '#22c55e',
          ok2: '#4ade80',
          warn: '#f59e0b',
          crit: '#ef4444',
          crit2: '#f87171',
          info: '#38bdf8',
          violet: '#8b5cf6'
        }
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        tap: '0 4px 0 0 rgba(0,0,0,0.45)',
        tapLg: '0 6px 0 0 rgba(0,0,0,0.45)',
        field: '0 10px 30px -10px rgba(34,197,94,0.55)',
        glow: '0 0 20px rgba(245,158,11,0.45)',
        glowOk: '0 0 22px rgba(34,197,94,0.55)',
        glowCrit: '0 0 22px rgba(239,68,68,0.6)'
      },
      backgroundImage: {
        'grad-amber': 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
        'grad-ok': 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
        'grad-crit': 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
        'grad-violet': 'linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)',
        'grad-info': 'linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)',
        'grad-card': 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 60%)',
        'field-stripes': 'repeating-linear-gradient(90deg, rgba(34,197,94,0.18) 0 14px, rgba(34,197,94,0.1) 14px 28px)'
      }
    }
  },
  plugins: []
};
