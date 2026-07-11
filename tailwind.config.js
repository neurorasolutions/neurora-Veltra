/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#2B4FFF',
        'neurora-cyan': '#06B6D4',
        'neurora-indigo': '#6366F1',
        'neurora-pink': '#EC4899',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      backgroundImage: {
        'neurora-gradient': 'linear-gradient(135deg, #06B6D4, #6366F1, #EC4899)',
      },
    },
  },
  plugins: [],
}
