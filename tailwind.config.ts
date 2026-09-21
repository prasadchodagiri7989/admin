import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Glacial Indifference'", "'Plus Jakarta Sans'", 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ["'Glacial Indifference'", "'Plus Jakarta Sans'", 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
