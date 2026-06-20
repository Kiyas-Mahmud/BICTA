import type { Config } from 'tailwindcss'

export default {
  content: [],
  theme: {
    extend: {
      colors: {
        // Primary brand blue (public + admin share it now).
        brand: {
          50: '#eff5ff',
          100: '#dbe8fe',
          200: '#bfd7fe',
          300: '#93bbfd',
          400: '#609afa',
          500: '#3b7df6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Legacy admin accent alias -> brand blue (keeps old classes working).
        accent: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          soft: '#eff5ff',
        },
        ink: {
          DEFAULT: '#0f172a',
          soft: '#475569',
          faint: '#94a3b8',
        },
        line: '#e2e8f0',
        paper: '#ffffff',
        mist: {
          1: '#f8fafc',
          2: '#f1f5f9',
        },
      },
      fontFamily: {
        sans: ['Schibsted Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        site: '78rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.12)',
        lift: '0 12px 32px -12px rgba(15,23,42,0.18)',
        glow: '0 12px 30px -10px rgba(37,99,235,0.45)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        liquid: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
} satisfies Config
