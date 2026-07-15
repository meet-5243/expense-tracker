/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0F19',       // Deep slate-black
          card: '#151D30',     // Dark blue-slate
          border: '#222F4D',   // Slate border
          input: '#1B253D',    // Form inputs
          text: '#F3F4F6',     // Off-white text
          muted: '#9CA3AF',    // Gray text
        },
        accent: {
          teal: '#14B8A6',     // Main brand accent
          tealHover: '#0D9488',
          violet: '#8B5CF6',   // Secondary purple accent
          emerald: '#10B981',  // Success states / below budget
          amber: '#F59E0B',    // Warning states / nearing budget
          rose: '#F43F5E',     // Error states / over budget
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      keyframes: {
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        }
      },
      animation: {
        scaleUp: 'scaleUp 0.18s ease-out forwards',
        shake: 'shake 0.2s ease-in-out 2',
      }
    },
  },
  plugins: [],
}
