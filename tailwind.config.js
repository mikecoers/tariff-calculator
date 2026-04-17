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
        // Phillies classic — powder blue BACKGROUND + maroon ACCENT
        phil: {
          maroon: '#6d1a33',
          maroonLight: '#8a2347',
          maroonDark: '#4a0e24',
          maroonDarker: '#2e0917',
          blue: '#a4c8e1',
          blueLight: '#dbeaf4',
          blueMid: '#c7dbeb',
          blueDeep: '#7fb3d1',
          cream: '#fff5e8',
          creamDim: '#e7d8c6'
        },
        ump: {
          bg: '#a4c8e1',
          bg2: '#c7dbeb',
          card: '#ffffff',
          cardHi: '#fefcf7',
          line: '#7fb3d1',
          lineStrong: '#6d1a33',
          ink: '#2e0917',
          dim: '#6d1a33',
          accent: '#6d1a33',
          accent2: '#4a0e24',
          ok: '#047857',
          ok2: '#059669',
          warn: '#b45309',
          crit: '#991b1b',
          crit2: '#b91c1c',
          info: '#1e3a8a',
          violet: '#9d174d'
        }
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        tap: '0 4px 0 0 rgba(74,14,36,0.25)',
        tapLg: '0 6px 0 0 rgba(74,14,36,0.3)',
        field: '0 10px 30px -10px rgba(34,197,94,0.55)',
        glow: '0 0 20px rgba(109,26,51,0.35)',
        glowOk: '0 0 22px rgba(4,120,87,0.55)',
        glowCrit: '0 0 22px rgba(153,27,27,0.55)',
        glowMaroon: '0 0 24px rgba(109,26,51,0.55)',
        card: '0 6px 20px -12px rgba(74,14,36,0.35)'
      },
      backgroundImage: {
        'grad-blue': 'linear-gradient(135deg, #dbeaf4 0%, #a4c8e1 45%, #7fb3d1 100%)',
        'grad-ok': 'linear-gradient(135deg, #6ee7b7 0%, #047857 100%)',
        'grad-crit': 'linear-gradient(135deg, #fca5a5 0%, #991b1b 100%)',
        'grad-violet': 'linear-gradient(135deg, #f9a8d4 0%, #9d174d 100%)',
        'grad-info': 'linear-gradient(135deg, #c7dbeb 0%, #1e3a8a 100%)',
        'grad-maroon': 'linear-gradient(180deg, #8a2347 0%, #6d1a33 60%, #4a0e24 100%)',
        'grad-amber': 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 60%, #b45309 100%)',
        'grad-card': 'linear-gradient(160deg, rgba(109,26,51,0.05), rgba(109,26,51,0) 60%)',
        'field-stripes': 'repeating-linear-gradient(90deg, rgba(34,197,94,0.18) 0 14px, rgba(34,197,94,0.1) 14px 28px)'
      }
    }
  },
  plugins: []
};
