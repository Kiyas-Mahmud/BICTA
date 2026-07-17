import type { Config } from 'tailwindcss'

export default {
  content: [],
  theme: {
    extend: {
      colors: {
        // "Sage" identity — muted olive/sage green (inspiration #BBC8AF / #ABB9A6).
        // Light shades = accents/tiles/badges; dark shades = forest buttons.
        brand: {
          50: '#f4f7f1',
          100: '#e7ede1',
          200: '#d3ddca',
          300: '#bbc8af', // inspiration
          400: '#abb9a6', // inspiration
          500: '#93a486',
          600: '#77896b',
          700: '#5e6f54',
          800: '#4a5843',
          900: '#38432f', // deep forest (primary buttons)
        },
        // Legacy admin accent alias -> brand (keeps old admin classes working).
        accent: {
          DEFAULT: '#5e6f54',
          hover: '#4a5843',
          soft: '#f4f7f1',
        },
        ink: {
          DEFAULT: '#26302a',
          soft: '#586158',
          faint: '#98a29a',
        },
        line: '#e3e7ea',
        // Soft off-white page background (rgb 244,246,248); cards stay white.
        paper: '#f4f6f8',
        mist: {
          1: '#eef1f3',
          2: '#e6ebe6',
        },
      },
      fontFamily: {
        sans: ['Schibsted Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        site: '78rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(38,48,42,0.05), 0 8px 24px -12px rgba(38,48,42,0.14)',
        lift: '0 12px 32px -12px rgba(38,48,42,0.20)',
        glow: '0 12px 30px -10px rgba(56,67,47,0.4)',
      },
      backgroundImage: {
        // Signature sage gradient — deep forest → sage (dark enough for white text).
        'gradient-brand': 'linear-gradient(135deg, #445236 0%, #5b6d50 55%, #74886a 100%)',
        'gradient-brand-soft': 'linear-gradient(120deg, #f4f7f1 0%, #e7ede1 100%)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        liquid: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
} satisfies Config
