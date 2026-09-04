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
        parchment: '#E8DFD1',
        'parchment-deep': '#DDD2C1',
        'parchment-light': '#F4EFE6',
        vellum: '#F0E8DC',
        ink: '#171513',
        'ink-light': '#2A2623',
        'ink-muted': '#625B51',
        'ink-faint': '#9C9385',
        brass: '#9E8055',
        'brass-light': '#C2A578',
        'brass-dark': '#6E5633',
        // Preserve previous keys as fallbacks
        'sage-bg': '#E8DFD1',
        'sage-light': '#F4EFE6',
        'sage-surface': '#F0E8DC',
        'sage-dark': '#171513',
        'sage-darker': '#100F0E',
        'sage-text': '#171513',
        'sage-muted': '#625B51',
        'sage-cream': '#FAF6EE',
        'sage-border': 'rgba(23, 21, 19, 0.22)',
        'sage-border-subtle': 'rgba(23, 21, 19, 0.12)',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        editorial: ['"Cormorant Garamond"', 'serif'],
        serif: ['"EB Garamond"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'ink-subtle': '0 2px 8px -2px rgba(23, 21, 19, 0.12)',
        'ink-frame': '0 4px 20px -2px rgba(23, 21, 19, 0.18)',
        'brass-glow': '0 0 16px rgba(158, 128, 85, 0.25)',
      },
      keyframes: {
        'spin-slow': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'float-slow': { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-4px)' } },
      },
      animation: {
        'spin-slow': 'spin-slow 20s linear infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
