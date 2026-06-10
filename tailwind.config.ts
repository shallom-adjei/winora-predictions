import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#fdf8e9",
          100: "#f9edc5",
          200: "#f3da87",
          300: "#ecc94b",
          400: "#d4af37",
          500: "#b8960c",
          600: "#8a7108",
          700: "#635108",
          800: "#423707",
          900: "#2d2404",
          950: "#1a1402",
        },
        surface: {
          primary: "#050505",
          secondary: "#0B0B0B",
          card: "#101010",
        },
        text: {
          secondary: "#A0A0A0",
        },
        positive: "#22C55E",
        negative: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;