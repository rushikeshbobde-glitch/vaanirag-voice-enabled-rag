/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "#070b14",
        surface: {
          50: "#131b2e",
          100: "#0f172a",
          200: "#1e293b",
          300: "#334155",
        },
        brand: {
          primary: "#6366f1",
          secondary: "#06b6d4",
          accent: "#10b981",
          pink: "#ec4899",
          amber: "#f59e0b",
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'wave': 'waveAnimation 1.2s infinite ease-in-out',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'drop-shadow(0 0 15px rgba(99,102,241,0.6))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 30px rgba(6,182,212,0.9))' },
        },
        waveAnimation: {
          '0%, 100%': { height: '10px' },
          '50%': { height: '38px' },
        }
      }
    },
  },
  plugins: [],
}
