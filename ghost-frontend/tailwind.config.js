/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Warm near-black canvas ──
        night: {
          950: '#0A0908',
          900: '#0E0C0B',
          850: '#141110',
          800: '#1A1613',
          750: '#221C18',
          700: '#2E2620',
        },
        line: {
          DEFAULT: '#2A231D',
          soft: '#1C1712',
          strong: '#3C312A',
        },
        bone: {
          DEFAULT: '#F4EDE3',
          soft: '#B4A99B',
          faint: '#786E62',
        },
        // ── Sealed / hidden / supply → cool steel (the foil to orange) ──
        seal: {
          DEFAULT: '#9FB0BC',
          bright: '#C6D3DB',
          dim: '#4E5A63',
          deep: '#2B333A',
        },
        // ── Revealed / matched / active → molten orange (the hero accent) ──
        reveal: {
          DEFAULT: '#FF6A1A',
          bright: '#FF8C42',
          dim: '#7C3A14',
          deep: '#48220C',
        },
        danger: {
          DEFAULT: '#F0506E',
          dim: '#5A2230',
        },
      },
      fontFamily: {
        display: ['"Clash Display"', 'Archivo', 'system-ui', 'sans-serif'],
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 24px 48px -24px rgba(0,0,0,0.8)',
        seal: '0 0 0 1px rgba(159,176,188,0.22), 0 12px 30px -12px rgba(159,176,188,0.28)',
        reveal: '0 0 0 1px rgba(255,106,26,0.35), 0 14px 34px -12px rgba(255,106,26,0.5)',
        lift: '0 20px 50px -24px rgba(0,0,0,0.85)',
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        vault:
          'radial-gradient(115% 85% at 86% -12%, rgba(255,106,26,0.13) 0%, transparent 50%), radial-gradient(90% 70% at -5% 105%, rgba(159,176,188,0.05) 0%, transparent 46%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        rise: 'rise 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'seal-shimmer': 'sealShimmer 2.6s ease-in-out infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        materialize: 'materialize 0.7s cubic-bezier(0.16,1,0.3,1) both',
        sweep: 'sweep 2.4s linear infinite',
        ticker: 'ticker 40s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sealShimmer: {
          '0%, 100%': { opacity: '0.5', backgroundPosition: '0% 50%' },
          '50%': { opacity: '0.85', backgroundPosition: '100% 50%' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(255,106,26,0.5)' },
          '50%': { opacity: '0.6', boxShadow: '0 0 0 6px rgba(255,106,26,0)' },
        },
        materialize: {
          '0%': { opacity: '0', filter: 'blur(8px)', letterSpacing: '0.2em' },
          '100%': { opacity: '1', filter: 'blur(0)', letterSpacing: '0' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
