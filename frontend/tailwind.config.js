/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ortho: {
          50:  '#eef5ff',
          100: '#d9e8ff',
          200: '#bbdaff',
          300: '#8bc4ff',
          400: '#54a3ff',
          500: '#2d7fff',
          600: '#165ef5',
          700: '#0f49e1',
          800: '#133db6',
          900: '#16388f',
          950: '#122457',
        },
        dark: {
          50:  '#f6f6f9',
          100: '#ececf2',
          200: '#d5d5e2',
          300: '#b1b1c9',
          400: '#8686ab',
          500: '#676791',
          600: '#535278',
          700: '#444462',
          800: '#3b3b53',
          900: '#1e1e2e',
          950: '#13131f',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(45, 127, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(45, 127, 255, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
