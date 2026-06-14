import { loadFont } from "@remotion/fonts";
import { INTER_WOFF2, NOTO_SANS_JP_WOFF2 } from "./fontData";

// Fonts are embedded as base64 data URIs (subsetted Inter + Noto Sans JP), so
// rendering needs no network access and no dev-server font fetches — every
// frame resolves the font instantly and deterministically. Inter carries the
// Latin glyphs / numbers and Noto Sans JP provides full Japanese coverage;
// browsers fall back per-glyph across the stack. Both are variable fonts, so
// the "100 900" weight range covers every weight used in the composition.
const interPromise = loadFont({
  family: "Inter",
  url: INTER_WOFF2,
  format: "woff2",
  weight: "100 900",
});
const notoPromise = loadFont({
  family: "Noto Sans JP",
  url: NOTO_SANS_JP_WOFF2,
  format: "woff2",
  weight: "100 900",
});

export const FONT_FAMILY = `"Inter", "Noto Sans JP", sans-serif`;

export const waitForFonts = () => Promise.all([interPromise, notoPromise]);

// Composition constants
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Premium dark palette
export const COLORS = {
  bg: "#08090c",
  bgSoft: "#0e1015",
  panel: "rgba(255,255,255,0.04)",
  panelBorder: "rgba(255,255,255,0.10)",
  text: "#f4f5f7",
  textDim: "rgba(244,245,247,0.55)",
  textFaint: "rgba(244,245,247,0.35)",
  accent: "#5b8cff",
  accentSoft: "rgba(91,140,255,0.18)",
  green: "#46d19e",
  amber: "#f4c453",
};

// Timeline (frames @ 30fps)
export const SHOT_DURATION = 7 * FPS; // 210
export const UI_DURATION = 11 * FPS; // 330
export const END_DURATION = 3 * FPS; // 90

export const SHOTS = [
  { src: "shot1.mp4", text: "みんなが帰ったあとも。" },
  { src: "shot2.mp4", text: "24時間。文句も言わない。" },
  { src: "shot3.mp4", text: "教育もいらない。" },
  { src: "shot4.mp4", text: "中小企業に、“はじめての”AI社員を。" },
  { src: "shot5.mp4", text: "AI社員に特化したサービス。" },
] as const;

export const TOTAL_DURATION =
  SHOTS.length * SHOT_DURATION + UI_DURATION + END_DURATION; // 1470 = 49s
