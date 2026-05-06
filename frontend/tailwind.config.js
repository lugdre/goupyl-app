/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          900: '#0D3B2A',
          800: '#1A6B4A',
          700: '#228B5E',
          600: '#2DAA72',
          500: '#3DBB82',
          400: '#5FCC99',
          300: '#89DDB5',
          100: '#D4F5E6',
          50:  '#EBF9F2',
        },
        brand: {
          900: '#0F1129',
          800: '#1E2340',
          600: '#2B3063',
          400: '#6E74AD',
          50:  '#E8E9F4',
        },
        nature: { 700: '#4A7C59', 50: '#E8F5EC' },
        mental: { 600: '#7B4A8C', 100: '#F3E8F4' },
        accent: { 600: '#C4956A', 100: '#FDF3E8' },
        page: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
