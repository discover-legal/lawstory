import type { Config } from 'tailwindcss';

// The restored marketing look (site before site-v6). Colours live here and in styles/, never in app/ or
// components/ (eslint colour-literal rule). Brand = blue-600/700/100/50.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.ts'],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: '#2563eb', strong: '#1d4ed8', soft: '#dbeafe', tint: '#eff6ff' } },
      backgroundImage: {
        grid: 'linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)',
      },
      backgroundSize: { grid: '48px 48px' },
    },
  },
  plugins: [],
};

export default config;
