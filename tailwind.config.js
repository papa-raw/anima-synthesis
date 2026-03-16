export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        forest: { DEFAULT: '#111a14', dark: '#0a0f0a', border: '#1a2f1e' },
        sage: '#6b8f72',
      }
    }
  },
  plugins: [],
};
