import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sage-bg': '#B0C5AD',
        'sage-light': '#C3D5C1',
        'sage-surface': '#A4BAA2',
        'sage-dark': '#718D76',
        'sage-darker': '#5E7A63',
        'sage-text': '#243329',
        'sage-muted': '#526256',
        'sage-cream': '#F5F8F3',
        'sage-border': 'rgba(255, 255, 255, 0.65)',
        'sage-border-subtle': 'rgba(113, 141, 118, 0.25)',
      },
      boxShadow: {
        'sage-soft': '0 8px 30px 0 rgba(36, 51, 41, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
        'sage-card': '0 4px 18px 0 rgba(36, 51, 41, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        'sage-btn': '0 4px 14px rgba(94, 122, 99, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      },
      keyframes: {
        'spin-slow': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
      },
      animation: {
        'spin-slow': 'spin-slow 4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
