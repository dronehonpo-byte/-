import type { ViolinString } from "@/types/score";

// 弦色（要件定義より）
export const STRING_COLORS: Record<ViolinString, string> = {
  G: "#8B4513", // 茶色（土）
  D: "#228B22", // 緑（葉・茎）
  A: "#E05C5C", // 赤/ピンク（花）
  E: "#FFD700", // 黄色（光）
};

export const STRING_LABELS: Record<ViolinString, string> = {
  G: "G線",
  D: "D線",
  A: "A線",
  E: "E線",
};

export const HALF_STEP_COLOR = "#1E90FF"; // 青

/** 半透明の弦色（符頭塗りつぶし用）。alpha は 0〜1 */
export function stringColorWithAlpha(s: ViolinString, alpha = 0.45): string {
  const hex = STRING_COLORS[s];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
