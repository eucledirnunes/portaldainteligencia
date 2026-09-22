import type { Config } from 'tailwindcss';

/** Tokens do design "Terminal Editorial Intelligence" (Stitch). Cores via CSS vars em globals.css. */
const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        low: c('low'), // surface-container-low
        container: c('container'), // surface-container
        high: c('high'), // surface-container-high
        ink: c('ink'),
        navy: c('navy'), // primary-container
        muted: c('muted'),
        outline: c('outline'),
        line: c('line'),
        accent: c('accent'), // secondary (cobalt)
        ok: c('ok'), // tertiary-fixed-dim (emerald)
        okink: c('okink'), // on-tertiary-container
        alert: c('alert'),
        warn: c('warn'),
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '0.125rem', DEFAULT: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
      maxWidth: { page: '80rem', prose: '42rem' },
    },
  },
  plugins: [],
};
export default config;
