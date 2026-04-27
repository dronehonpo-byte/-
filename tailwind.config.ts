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
          DEFAULT: "#0A1F44",
          50: "#F3F5FA",
          100: "#E3E8F2",
          200: "#C3CCDE",
          300: "#8A99BA",
          400: "#4D5F8A",
          500: "#263A68",
          600: "#0A1F44",
          700: "#081938",
          800: "#06132B",
          900: "#040D1F",
        },
        gold: {
          DEFAULT: "#C9A94B",
          50: "#FBF7EC",
          100: "#F4EACB",
          200: "#E9D797",
          300: "#DCC268",
          400: "#C9A94B",
          500: "#A88A37",
          600: "#84692A",
          700: "#60491D",
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
        soft: "0 8px 30px -12px rgba(10,31,68,0.18)",
        card: "0 4px 24px -8px rgba(10,31,68,0.12)",
        gold: "0 10px 30px -10px rgba(201,169,75,0.55)",
      },
      backgroundImage: {
        "grid-navy":
          "radial-gradient(rgba(10,31,68,0.08) 1px, transparent 1px)",
        "gradient-gold":
          "linear-gradient(135deg, #C9A94B 0%, #E9D797 45%, #C9A94B 100%)",
        "gradient-navy":
          "linear-gradient(135deg, #0A1F44 0%, #1a3370 60%, #0A1F44 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
