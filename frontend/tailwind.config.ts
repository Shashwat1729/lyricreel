import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0C0C11',
        panel: '#15151C',
        raised: '#1C1C25',
        line: { DEFAULT: '#22222C', strong: '#2A2A36', bright: '#3A3A48' },
        fg: '#F2F1EC',
        muted: '#A09FAE',
        soft: '#CFCED8',
        accent: { DEFAULT: '#3DF2B0', hover: '#7FF7CC', soft: '#1F3D33' },
        danger: { DEFAULT: '#FF7A7A', soft: '#3A1D22' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        eq: { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        eq: 'eq 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
