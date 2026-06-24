import type { ViolinString } from "@/types/score";

// 弦色（確定カラーコード・蛍光マーカーペン風）
export const STRING_COLORS: Record<ViolinString, string> = {
  G: "#8B5A3C", // 茶
  D: "#00BFA5", // ターコイズグリーン
  A: "#FF4081", // ピンク/赤
  E: "#FFD740", // 黄
};

export const STRING_LABELS: Record<ViolinString, string> = {
  G: "G線",
  D: "D線",
  A: "A線",
  E: "E線",
};

// 半音マークの色（2種類）
export const HALF_STEP_TOUCH_COLOR = "#006CD4"; // 青：隣の指と半音（指をくっつける）
export const HALF_STEP_OPEN_COLOR = "#6EE6FF"; // 水色：開放弦との半音など（くっつけない）
export const HALF_STEP_COLOR = HALF_STEP_TOUCH_COLOR; // 後方互換

/** 半透明の弦色（符頭塗りつぶし用）。alpha は 0〜1 */
export function stringColorWithAlpha(s: ViolinString, alpha = 0.65): string {
  const hex = STRING_COLORS[s];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
