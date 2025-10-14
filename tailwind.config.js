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
        mint: {
          100: '#E0FBF4',
          200: '#B6F3E2',
          300: '#86E9CD',
          400: '#50E3C2',
          500: '#1DD1A1',
        },
        celeste: {
          100: '#E1F4FF',
          200: '#B8E7FF',
          300: '#8CD8FF',
          400: '#54A0FF',
          500: '#2E86DE',
        },
        'soft-gray': {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
        },
        // Dracula Theme Colors
        dracula: {
          bg: '#282A36',
          current: '#44475A',
          foreground: '#F8F8F2',
          comment: '#6272A4',
          cyan: '#8BE9FD',
          green: '#50FA7B',
          orange: '#FFB86C',
          pink: '#FF79C6',
          purple: '#BD93F9',
          red: '#FF5555',
          yellow: '#F1FA8C',
        },
      },
    },
  },
  plugins: [],
}

