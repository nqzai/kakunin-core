import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kakunin: {
          heading: '#141B1B',
          body: '#4A4F52',
          accent: '#2B934F',
          'accent-dark': '#1C6B39',
          'subtle-bg': '#F4F1E8',
          border: '#E5E5E5',
          meta: '#8A8C84',
        },
      },
    },
  },
  plugins: [],
};

export default config;
