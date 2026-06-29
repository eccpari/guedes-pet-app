import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Guedes Pet - Sóbria, elegante, acolhedora
        brand: {
          50:  '#f0f7f4',
          100: '#daeee6',
          200: '#b8ddd0',
          300: '#8ac5b3',
          400: '#59a690',
          500: '#3a8a74',  // Verde principal
          600: '#2c6e5c',
          700: '#24574a',
          800: '#1e453c',
          900: '#1a3932',
          950: '#0d201d',
        },
        accent: {
          50:  '#fdf6ee',
          100: '#faebd5',
          200: '#f4d4aa',
          300: '#ecb674',
          400: '#e3913e',  // Âmbar/dourado - acolhimento pet
          500: '#dc7a28',
          600: '#ce621e',
          700: '#aa4b1b',
          800: '#883c1d',
          900: '#6e321a',
        },
        neutral: {
          50:  '#f8f8f7',
          100: '#f0efed',
          200: '#e4e2de',
          300: '#cec9c3',
          400: '#b2aba1',
          500: '#978e83',
          600: '#7d7469',
          700: '#665e55',
          800: '#544d46',
          900: '#46403b',
          950: '#262220',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 2px 12px 0 rgba(26,57,50,0.08)',
        'card-hover': '0 4px 24px 0 rgba(26,57,50,0.14)',
        'float': '0 8px 32px 0 rgba(26,57,50,0.16)',
      },
    },
  },
  plugins: [],
}
export default config
