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
        // Phillies classic retro palette — maroon + powder blue + cream
        phil: {
          maroon: '#6d1a33',
          maroonLight: '#8a2347',
          maroonDark: '#4a0e24',
          maroonDarker: '#2e0917',
          blue: '#a4c8e1',
          blueLight: '#c7dbeb',
          blueDeep: '#7fb3d1',
          cream: '#fff5e8',
          creamDim: '#e7d8c6'
        },
        ump: {
          bg: '#2e0917',
          bg2: '#1e0610',
          card: '#4a0e24',
          cardHi: '#6d1a33',
          line: '#8a2347',
          ink: '#fff5e8',
          dim: '#d4b3bc',
          accent: '#a4c8e1',
          accent2: '#7fb3d1',
          ok: '#34d399',
          ok2: '#6ee7b7',
          warn: '#fbbf24',
          crit: '#f87171',
          crit2: '#fca5a5',
          info: '#a4c8e1',
          violet: '#f9a8d4'
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
        glow: '0 0 20px rgba(164,200,225,0.55)',
        glowOk: '0 0 22px rgba(52,211,153,0.55)',
        glowCrit: '0 0 22px rgba(248,113,113,0.6)',
        glowMaroon: '0 0 24px rgba(138,35,71,0.7)'
      },
      backgroundImage: {
        'grad-blue': 'linear-gradient(135deg, #c7dbeb 0%, #a4c8e1 45%, #7fb3d1 100%)',
        'grad-ok': 'linear-gradient(135deg, #6ee7b7 0%, #10b981 100%)',
        'grad-crit': 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)',
        'grad-violet': 'linear-gradient(135deg, #f9a8d4 0%, #be185d 100%)',
        'grad-info': 'linear-gradient(135deg, #c7dbeb 0%, #7fb3d1 100%)',
        'grad-maroon': 'linear-gradient(135deg, #8a2347 0%, #4a0e24 100%)',
        'grad-card': 'linear-gradient(160deg, rgba(255,245,232,0.08), rgba(255,245,232,0) 60%)',
        'field-stripes': 'repeating-linear-gradient(90deg, rgba(34,197,94,0.18) 0 14px, rgba(34,197,94,0.1) 14px 28px)'
      }
    }
  },
  plugins: []
};
