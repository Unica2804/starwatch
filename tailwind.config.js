/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          bg: '#0a0000',
          panel: '#140404',
          red: '#ff2a1a',
          dim: '#991410',
          text: '#ffd9d4'
        }
      },
      minHeight: {
        touch: '56px'
      },
      minWidth: {
        touch: '56px'
      }
    }
  },
  plugins: []
}
