/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        yukpo: {
          50:  "#F5F0FF",
          100: "#EDE0FF",
          200: "#D4B8FF",
          300: "#B88AFF",
          400: "#9B62F5",
          500: "#7B3FE4",
          600: "#5B1FBE",
          700: "#451599",
          800: "#2E0C72",
          900: "#1A054E",
          950: "#0D0228",
        },
        accent: {
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
        },
        gold: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
      },
    },
  },
  plugins: [],
};
