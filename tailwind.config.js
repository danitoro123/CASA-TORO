/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['system-ui', 'sans-serif'],
      },
      colors: {
        toro: {
          50:  '#fdf8f0',
          100: '#f7e9d0',
          200: '#eed4a1',
          300: '#e2b96a',
          400: '#d49a3a',
          500: '#b87d28',
          600: '#956320',
          700: '#714a19',
          800: '#4e3312',
          900: '#2e1e0b',
        },
        stone: {
          50:  '#f8f7f5',
          100: '#eceae5',
          200: '#d8d4cb',
          300: '#bfb9ac',
          400: '#a39990',
          500: '#857b72',
          600: '#6a615a',
          700: '#514a44',
          800: '#38342f',
          900: '#22201c',
        }
      }
    },
  },
  plugins: [],
}
