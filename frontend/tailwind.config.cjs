/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        eco: {
          50: '#f2fbf4',
          100: '#e6f7ea',
          200: '#c9eec9',
          300: '#9fe19a',
          400: '#67d055',
          500: '#38b840',
          600: '#2f9f35',
          700: '#267b2a',
          800: '#1c5d20',
          900: '#143f16'
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
