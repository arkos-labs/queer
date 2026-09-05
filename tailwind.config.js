/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Primary: Violet ── */
        primary: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        /* ── Secondary: Rose ── */
        secondary: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        /* ── Accent: Amber ── */
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        /* ── Success: Emerald ── */
        success: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          600: '#059669',
          700: '#047857',
        },
        /* ── Error: Red ── */
        error: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        /* ── Neutrals (backgrounds, borders, text) ── */
        neutral: {
          0:   '#ffffff',
          50:  '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
        /* ── Legacy aliases (backward-compat with existing components) ── */
        kinpaku: {
          gold: '#8b5cf6',
          pale: '#c4b5fd',
          rich: '#7c3aed',
          rule: '#6d28d9',
          'hairline-strong': 'rgba(139,92,246,0.25)',
        },
        patina: {
          verdigris: '#8b5cf6',
          pale: '#c4b5fd',
          deep: '#7c3aed',
        },
        lacquer: {
          black: '#18181b',
          deep: '#09090b',
          raised: '#27272a',
        },
        paper: {
          base: '#ede9fe',
          deep: '#ddd6fe',
          raised: '#ffffff',
        },
        ink: {
          dark: '#18181b',
          base: '#27272a',
        },
        text: {
          champagne: '#f9fafb',
          warm: '#f3f4f6',
          muted: '#9ca3af',
          faint: '#d1d5db',
          'light-base': '#18181b',
          'light-muted': '#52525b',
          'light-faint': '#a1a1aa',
        },
        gold: {
          hairline: 'rgba(0,0,0,0.08)',
        },
      },
      fontFamily: {
        sans: ['Quicksand', 'system-ui', 'sans-serif'],
        display: ['Quicksand', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        lift: '0 4px 16px -4px rgba(0,0,0,0.12), 0 2px 6px -2px rgba(0,0,0,0.08)',
        modal: '0 20px 60px -12px rgba(0,0,0,0.18)',
        'primary-glow': '0 4px 20px -4px rgba(124,58,237,0.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'gradient-x': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-up': 'slide-up 0.25s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
        float: 'float 3s ease-in-out infinite',
        'gradient-x': 'gradient-x 2s ease infinite',
      },
    },
  },
  plugins: [],
};
