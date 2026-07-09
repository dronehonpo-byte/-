import type { Config } from "tailwindcss";

// 弦色・半音マーク色は lib/constants.ts を正典とする。
// Tailwind からも参照できるよう同じ値をここにミラーする。
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "string-g": "#8B5A3C",
        "string-d": "#00BFA5",
        "string-a": "#FF4081",
        "string-e": "#FFD740",
        "semitone-blue": "#006CD4",
        "semitone-cyan": "#6EE6FF",
      },
    },
  },
  plugins: [],
};

export default config;
