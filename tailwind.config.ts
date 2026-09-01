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
        // Cyberpunk Primary Neon Palette
        'cyber-cyan': '#00f0ff',
        'cyber-cyan-dark': '#00b8c4',
        'cyber-pink': '#ff007a',
        'cyber-pink-dark': '#c7005f',
        'cyber-green': '#00ff88',
        'cyber-green-dark': '#00c466',
        'cyber-purple': '#8b5cf6',
        'cyber-yellow': '#facc15',
        'cyber-amber': '#ff9900',
        
        // Deep Space & HUD Surfaces
        'cyber-bg': '#040711',
        'cyber-canvas': '#070c18',
        'cyber-surface': '#0c1322',
        'cyber-panel': '#0f172a',
        'cyber-card': '#131d33',
        'cyber-border': 'rgba(0, 240, 255, 0.25)',
        'cyber-border-pink': 'rgba(255, 0, 122, 0.3)',
        'cyber-border-green': 'rgba(0, 255, 136, 0.3)',
        'cyber-border-subtle': 'rgba(255, 255, 255, 0.08)',
        'cyber-text': '#f8fafc',
        'cyber-muted': '#94a3b8',
        'cyber-dim': '#64748b',

        // Legacy compatibility
        'sage-bg': '#070c18',
        'sage-light': '#0f172a',
        'sage-surface': '#0c1322',
        'sage-dark': '#00f0ff',
        'sage-darker': '#00b8c4',
        'sage-text': '#f8fafc',
        'sage-muted': '#94a3b8',
        'sage-cream': '#0c1322',
        'sage-border': 'rgba(0, 240, 255, 0.25)',
        'sage-border-subtle': 'rgba(255, 255, 255, 0.08)',
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 240, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
        'neon-cyan-lg': '0 0 35px rgba(0, 240, 255, 0.6), 0 0 15px rgba(0, 240, 255, 0.35)',
        'neon-pink': '0 0 20px rgba(255, 0, 122, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
        'neon-green': '0 0 20px rgba(0, 255, 136, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
        'cyber-panel': '0 12px 40px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'cyber-card': '0 8px 30px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(0, 240, 255, 0.15)',
        'cyber-inset': 'inset 0 2px 8px rgba(0, 0, 0, 0.8), inset 0 0 1px rgba(0, 240, 255, 0.2)',
        'sage-soft': '0 0 20px rgba(0, 240, 255, 0.2)',
        'sage-card': '0 8px 30px rgba(0, 0, 0, 0.6)',
        'sage-btn': '0 0 20px rgba(0, 240, 255, 0.4)',
      },
      keyframes: {
        'spin-slow': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'neon-pulse': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.7))' },
          '50%': { opacity: '0.8', filter: 'drop-shadow(0 0 20px rgba(0,240,255,0.9))' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        'laser-sweep': {
          '0%': { left: '-100%' },
          '100%': { left: '200%' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 6s linear infinite',
        'neon-pulse': 'neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'laser-sweep': 'laser-sweep 3s ease-in-out infinite',
      },

    },
  },
  plugins: [],
};

export default config;
