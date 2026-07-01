import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Violin string colors (要件定義より)
        string: {
          g: "#8B4513", // G線 = 茶色（土）
          d: "#228B22", // D線 = 緑（葉・茎）
          a: "#E05C5C", // A線 = 赤/ピンク（花）
          e: "#FFD700", // E線 = 黄色（光）
        },
        halfstep: "#1E90FF", // 半音マーク = 青
      },
    },
  },
  plugins: [],
};

export default config;
