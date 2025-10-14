/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          100: '#E0FBF4',
          200: '#B6F3E2',
          300: '#86E9CD',
        },
        celeste: {
          100: '#E1F4FF',
          200: '#B8E7FF',
          300: '#8CD8FF',
        },
        'soft-gray': {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
        },
      },
    },
  },
  plugins: [],
}

