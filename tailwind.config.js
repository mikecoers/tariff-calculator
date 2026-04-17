/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        field: {
          50: '#f0fdf4',
          500: '#22c55e',
          700: '#15803d',
          900: '#14532d'
        },
        dirt: {
          50: '#fdf8f3',
          500: '#b45309',
          700: '#92400e'
        },
        ump: {
          bg: '#0f172a',
          card: '#1e293b',
          line: '#334155',
          ink: '#e2e8f0',
          dim: '#94a3b8',
          accent: '#f59e0b',
          ok: '#22c55e',
          warn: '#f59e0b',
          crit: '#ef4444',
          info: '#38bdf8'
        }
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        tap: '0 4px 0 0 rgba(0,0,0,0.35)',
        field: '0 10px 30px -10px rgba(34,197,94,0.4)'
      }
    }
  },
  plugins: []
};
