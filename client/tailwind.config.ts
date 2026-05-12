import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lcars: {
          amber: '#FF9900',
          gold: '#FFCC00',
          blue: '#99CCFF',
          'blue-dark': '#4477AA',
          red: '#CC0000',
          purple: '#9966CC',
          tan: '#FFCC99',
          peach: '#FF9966',
          bg: '#0a0a0a',
          panel: '#111111',
          border: '#1a1a1a',
        },
      },
      fontFamily: {
        lcars: ['"Share Tech Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
