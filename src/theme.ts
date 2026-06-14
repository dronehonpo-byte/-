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
  accentBright: "#8fb4ff",
  accentSoft: "rgba(91,140,255,0.18)",
  green: "#46d19e",
  amber: "#f4c453",
  pinNew: "#ff8f6b", // リード（HPなし）強調色
};

// Beat grid — motion lands on an even ~120 BPM pulse (1 beat = 15 frames).
export const BEAT = 15;

// Timeline (frames @ 30fps). Sums to 1410 frames = 47.0s.
export const SCENES = {
  intro: 5 * FPS, // 0:00-0:05  150
  shot1: 7 * FPS, // 0:05-0:12  210
  shot2: 6 * FPS, // 0:12-0:18  180
  black2: 3 * FPS, // 0:18-0:21  90
  dash: 14 * FPS, // 0:21-0:35  420  ← hero
  shot4: 5 * FPS, // 0:35-0:40  150
  shot3: 3 * FPS, // 0:40-0:43  90
  end: 4 * FPS, // 0:43-0:47  120
} as const;

// Absolute start frame of each scene (cumulative).
export const STARTS = (() => {
  const order = [
    "intro",
    "shot1",
    "shot2",
    "black2",
    "dash",
    "shot4",
    "shot3",
    "end",
  ] as const;
  let acc = 0;
  const out = {} as Record<(typeof order)[number], number>;
  for (const k of order) {
    out[k] = acc;
    acc += SCENES[k];
  }
  return out;
})();

export const SHOTS = {
  shot1: { src: "shot1.mp4", text: "採用に、時間もお金も。" },
  shot2: { src: "shot2.mp4", text: "人手が、足りない。" },
  shot4: { src: "shot4.mp4", text: "慶應発スタートアップが、つくる。" },
  shot3: { src: "shot3.mp4", text: "ひとり以上、働く。" },
} as const;

export const TOTAL_DURATION = Object.values(SCENES).reduce(
  (a, b) => a + b,
  0
); // 1410 = 47s
