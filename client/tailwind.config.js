/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        body: ['Exo 2', 'sans-serif'],
      },
      colors: {
        neon: {
          cyan: '#00f5ff',
          pink: '#ff006e',
          green: '#39ff14',
          yellow: '#ffff00',
          purple: '#bf00ff',
        }
      },
      boxShadow: {
        neon: '0 0 20px rgba(0,245,255,0.5)',
        'neon-pink': '0 0 20px rgba(255,0,110,0.5)',
        'neon-green': '0 0 20px rgba(57,255,20,0.5)',
      }
    },
  },
  plugins: [],
}
