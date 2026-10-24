/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#047857",
          foreground: "#ffffff",
          dark: "#065f46",
          light: "#10b981",
        },
      },
    },
  },
  plugins: [],
};
