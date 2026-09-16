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
        // === AUTHENTIC STAKE.COM PALETTE ===
        stake: {
          bg:           '#071824',   // authentic Stake deepest background
          sidebar:      '#0F212E',   // Stake sidebar & topbar
          card:         '#1A2C38',   // Stake card/panel surface
          hover:        '#213743',   // Stake hover state
          border:       '#213743',   // Stake border
          'border-subtle': '#1E3341',// subtle border
          green:        '#00E701',   // neon green accent (CTA)
          'green-dark': '#00C800',   // green hover
          'green-dim':  '#154A20',   // dimmed green
          gold:         '#FFC432',   // gold/yellow accent
          blue:         '#1475E1',   // Stake blue accent
          red:          '#E74C3C',   // red
          text:         '#FFFFFF',   // primary text
          muted:        '#B1BAD3',   // Stake signature slate-grey text
          dim:          '#557086',   // very muted text
        },
        // Legacy fallbacks for existing components
        protocol: {
          bg:        '#071824',
          bg2:       '#0F212E',
          surface:   '#1A2C38',
          surface2:  '#213743',
          text:      '#FFFFFF',
          muted:     '#B1BAD3',
          subtle:    '#557086',
          gold:      '#FFC432',
          goldSoft:  '#FFD166',
          champagne: '#FFD166',
          ivory:     '#FFFFFF',
          highlight: '#FFFFFF',
          blue:      '#1475E1',
          cyan:      '#00E701',
          blueDark:  '#213743',
          live:      '#00E701',
        },
        parchment:          '#FFFFFF',
        'parchment-deep':   '#B1BAD3',
        'parchment-light':  '#FFFFFF',
        vellum:             '#FFFFFF',
        ink:                '#071824',
        'ink-light':        '#1A2C38',
        'ink-muted':        '#B1BAD3',
        'ink-faint':        '#557086',
        brass:              '#FFC432',
        'brass-light':      '#FFD166',
        'brass-dark':       '#CC9900',
        'warm-gold':        '#FFC432',
        champagne:          '#FFD166',
        ivory:              '#FFFFFF',
        'bright-highlight': '#FFFFFF',
        'sage-bg':          '#071824',
        'sage-light':       '#FFFFFF',
        'sage-surface':     '#1A2C38',
        'sage-dark':        '#071824',
        'sage-darker':      '#05111B',
        'sage-text':        '#FFFFFF',
        'sage-muted':       '#B1BAD3',
        'sage-cream':       '#FFFFFF',
        'sage-border':      'rgba(33, 55, 67, 0.8)',
        'sage-border-subtle': 'rgba(33, 55, 67, 0.4)',
      },
      fontFamily: {
        heading:      ['"Inter"', 'sans-serif'],
        architectural:['"Inter"', 'sans-serif'],
        display:      ['"Inter"', 'sans-serif'],
        editorial:    ['"Inter"', 'sans-serif'],
        serif:        ['"Inter"', 'sans-serif'],
        sans:         ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:         ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'stake-card':  '0 2px 6px rgba(0,0,0,0.5)',
        'stake-hover': '0 6px 16px rgba(0,0,0,0.6)',
        'green-glow':  '0 0 20px rgba(0,231,1,0.25)',
        'gold-glow':   '0 0 20px rgba(255,196,50,0.3)',
      },
      keyframes: {
        'spin-slow': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'slide-in-up': {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        'ticker': {
          '0%':   { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
      },
      animation: {
        'spin-slow':    'spin-slow 20s linear infinite',
        'float-slow':   'float-slow 6s ease-in-out infinite',
        'slide-in-up':  'slide-in-up 0.2s ease-out',
        'ticker':       'ticker 15s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
