/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cadence-purple': '#A855F7',
        'cadence-pink': '#EC4899',
        'cadence-dark': '#1E1E2E',
        'cadence-light': '#F8F8F2',
      },
      fontFamily: {
        'music': ['Bravura', 'serif'],
      },
    },
  },
  plugins: [],
}
