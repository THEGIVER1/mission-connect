// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:   '#E31837',
        brand2:  '#FF6B35',
        dark:    '#0D1117',
        navy:    '#13192A',
        surface: '#1A2235',
        surface2:'#212C42',
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        sans:  ['"Noto Sans KR"', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 2.5s infinite',
      },
      borderColor: { DEFAULT: 'rgba(255,255,255,0.08)' },
    },
  },
  plugins: [],
} satisfies Config;
