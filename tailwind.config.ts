import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
    "./lib/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        navy: {
          DEFAULT: "#2B4FD4",
          50: "#EDF1FE",
          100: "#DCE5FD",
          200: "#B8C8FA",
          300: "#7F9AF1",
          400: "#4F6FE0",
          500: "#3759D8",
          600: "#2B4FD4",
          700: "#1E3AA8",
          800: "#162A7C",
          900: "#0F1F5C",
        },
        accent: {
          DEFAULT: "#FF6B4A",
          50: "#FFF1ED",
          100: "#FFE0D6",
          200: "#FFC0AC",
          300: "#FFA181",
          400: "#FF8A65",
          500: "#FF7855",
          600: "#FF6B4A",
          700: "#E55434",
          800: "#B83F25",
          900: "#8A2E18",
        },
        gold: {
          DEFAULT: "#B8A05A",
          50: "#F7F3E8",
          100: "#EDE5C9",
          200: "#DAC994",
          300: "#C7AD63",
          400: "#B8A05A",
          500: "#967F44",
          600: "#766332",
          700: "#564822",
        },
        ink: "#0E1523",
        paper: "#FAFAF7",
        mist: "#F5F5F2",
        vermilion: {
          DEFAULT: "#C8102E",
          50: "#FCEBEE",
          100: "#F6CBD2",
          200: "#EE96A1",
          400: "#D6334B",
          500: "#C8102E",
          600: "#A60D26",
          700: "#7E0A1D",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-jp)",
          "system-ui",
          "sans-serif",
        ],
        jp: ["var(--font-noto-sans-jp)", "system-ui", "sans-serif"],
        en: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(15,26,58,0.12)",
        card: "0 4px 24px -8px rgba(15,26,58,0.10)",
        lift: "0 1px 2px rgba(15,26,58,0.06), 0 2px 8px -2px rgba(15,26,58,0.08)",
        gold: "0 10px 30px -10px rgba(255,107,74,0.45)",
        accent: "0 10px 30px -10px rgba(255,107,74,0.45)",
      },
      backgroundImage: {
        "gradient-gold":
          "linear-gradient(135deg, #FF6B4A 0%, #FF6B4A 100%)",
        "gradient-navy":
          "linear-gradient(135deg, #2B4FD4 0%, #2B4FD4 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
