module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        blue: {
          50: '#f5faff',
          100: '#e6f2ff',
          500: '#2563eb',
        },
      },
    },
  },
  plugins: [],
}
