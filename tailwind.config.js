/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        muted: '#71717A',
        sub: '#52525B',
        line: '#ECECEE',
        soft: '#F4F4F5',
        urgent: '#FF4F1F',
        'urgent-ink': '#C2410C',
        'urgent-soft': '#FFF4EE',
        high: '#FF8A3D',
        mid: '#F5A524',
        low: '#A1A1AA',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      borderRadius: { xl2: '14px', xl3: '20px' },
    },
  },
  plugins: [],
};
