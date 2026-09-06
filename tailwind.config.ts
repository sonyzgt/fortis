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
        protocol: {
          bg: '#05070B',
          bg2: '#080C14',
          surface: '#0D1322',
          surface2: '#121A2D',
          text: '#E8DFCF',
          muted: '#8993A4',
          subtle: '#5A6474',
          gold: '#CDB486', // Warm Gold
          goldSoft: '#D8C6A5', // Champagne
          champagne: '#D8C6A5',
          ivory: '#E8DFCF',
          highlight: '#F5F0E6',
          blue: '#D8C6A5',
          cyan: '#CDB486',
          blueDark: '#A68D5C',
          live: '#CDB486',
        },
        parchment: '#E8DFCF',
        'parchment-deep': '#D8C6A5',
        'parchment-light': '#F5F0E6',
        vellum: '#E8DFCF',
        ink: '#05070B',
        'ink-light': '#121A2D',
        'ink-muted': '#8993A4',
        'ink-faint': '#5A6474',
        brass: '#CDB486',
        'brass-light': '#D8C6A5',
        'brass-dark': '#8A7045',
        // Warm palette keys
        'warm-gold': '#CDB486',
        champagne: '#D8C6A5',
        ivory: '#E8DFCF',
        'bright-highlight': '#F5F0E6',
        // Preserve previous keys as fallbacks
        'sage-bg': '#05070B',
        'sage-light': '#F5F0E6',
        'sage-surface': '#0D1322',
        'sage-dark': '#05070B',
        'sage-darker': '#030508',
        'sage-text': '#E8DFCF',
        'sage-muted': '#8993A4',
        'sage-cream': '#F5F0E6',
        'sage-border': 'rgba(205, 180, 134, 0.22)',
        'sage-border-subtle': 'rgba(205, 180, 134, 0.12)',
      },
      fontFamily: {
        architectural: ['"Syne"', 'sans-serif'],
        display: ['Cinzel', 'serif'],
        editorial: ['"Syne"', 'sans-serif'],
        serif: ['"EB Garamond"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'ink-subtle': '0 2px 8px -2px rgba(0, 0, 0, 0.4)',
        'ink-frame': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
        'brass-glow': '0 0 16px rgba(205, 180, 134, 0.25)',
        'cyber-glow': '0 0 20px rgba(205, 180, 134, 0.35)',
        'blue-glow': '0 0 25px rgba(216, 198, 165, 0.35)',
        'gold-glow': '0 0 24px rgba(205, 180, 134, 0.4)',
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
