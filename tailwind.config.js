/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        day: {
          DEFAULT: '#FCF8F8',
          50: '#FCF8F8',
          100: '#FBEFEF',
          200: '#F9DFDF',
          300: '#F5AFAF',
        }
      }
    },
  },
  plugins: [],
}
