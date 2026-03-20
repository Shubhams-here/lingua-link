/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void:   '#050508',
        panel:  '#0d0d14',
        surface:'#13131e',
        border: '#1e1e2e',
        accent: '#7c6af7',
        'accent-bright': '#a89ff9',
        jade:   '#2dd4a0',
        ember:  '#f97066',
        muted:  '#4a4a6a',
        subtle: '#8888aa',
      },
    },
  },
  plugins: [],
};
