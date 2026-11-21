/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#c1272f', 600: '#a91f27', orange: '#f15b2b', text: '#c1272f' },
        ink: { DEFAULT: '#1d2530', muted: '#5a6472' },
        canvas: '#f6f7f9',
        line: '#e3e6ea',
      },
      fontFamily: { sans: ['Montserrat', 'Prompt', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)' },
      backgroundImage: { 'brand-grad': 'linear-gradient(135deg,#c1272f 0%,#e2412d 55%,#f15b2b 100%)' },
    },
  },
  plugins: [],
}
