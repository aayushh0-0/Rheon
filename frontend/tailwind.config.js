/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          sage: '#9EB8B6',
          'sage-dark': '#8EA9A7',
          'sage-light': '#ADC8C6',
        },
        shell: {
          bg: '#F0F8F7',
          card: '#FFFFFF',
          'card-subtle': '#F8FCFB',
          border: '#E1ECE9',
          'border-dark': '#CBDDD9',
        },
        teal: {
          brand: '#063D3F',
          'brand-hover': '#094B4D',
          'brand-light': '#0F5F62',
          muted: '#E6F2F0',
        },
        ink: {
          primary: '#092C2D',
          secondary: '#6F7F80',
          tertiary: '#94A3B8',
          inverted: '#FFFFFF',
        },
        pastel: {
          rose: {
            bg: '#FCEAEB',
            accent: '#F1B4B9',
            text: '#8A2E3B',
            border: '#F7D0D4',
          },
          lime: {
            bg: '#EBF7D8',
            accent: '#D8F1B6',
            text: '#345C1D',
            border: '#DDF4BC',
          },
          mint: {
            bg: '#DEF2EE',
            accent: '#A9DCD5',
            text: '#18564F',
            border: '#C7EBE5',
          },
          lavender: {
            bg: '#E6E9FA',
            accent: '#B9C0EE',
            text: '#2B3875',
            border: '#D5DAF7',
          },
        },
        crimson: {
          DEFAULT: '#C62828',
          hover: '#B71C1C',
          light: '#FFEBEE',
          border: '#FFCDD2',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'shell': '0 25px 60px -15px rgba(6, 61, 63, 0.15), 0 0 1px 1px rgba(255, 255, 255, 0.7) inset',
        'card': '0 2px 8px -2px rgba(6, 61, 63, 0.05), 0 1px 2px 0 rgba(6, 61, 63, 0.03)',
        'pill': '0 4px 12px rgba(6, 61, 63, 0.25)',
      }
    },
  },
  plugins: [],
}
