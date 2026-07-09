/**
 * デザイントークン & ドメイン定数（正典）
 *
 * 要件定義書 §4.3 / §4.7 の確定値。
 * 顧客が今後調整しうる値はすべてここに集約する（全フェーズ共通厳守事項）。
 */

// ===== 弦 =====
export enum ViolinString {
  G = "G",
  D = "D",
  A = "A",
  E = "E",
}

/** 弦の開放弦の絶対音高（MIDIノート番号）。G3=55, D4=62, A4=69, E5=76 */
export const OPEN_STRING_MIDI: Record<ViolinString, number> = {
  [ViolinString.G]: 55,
  [ViolinString.D]: 62,
  [ViolinString.A]: 69,
  [ViolinString.E]: 76,
};

/** 弦の並び（低→高）。移弦方向の判定などに使う。 */
export const STRING_ORDER: ViolinString[] = [
  ViolinString.G,
  ViolinString.D,
  ViolinString.A,
  ViolinString.E,
];

// ===== 弦の色（§4.3 蛍光マーカー風・符頭が透ける半透明で使う） =====
export const STRING_COLOR: Record<ViolinString, string> = {
  [ViolinString.G]: "#8B5A3C", // 茶（土）
  [ViolinString.D]: "#00BFA5", // 緑（葉・茎）
  [ViolinString.A]: "#FF4081", // 赤（花）
  [ViolinString.E]: "#FFD740", // 黄（光）
};

/** 蛍光マーカー風オーバーレイの不透明度（符頭が透ける半透明）。要調整。 */
export const STRING_HIGHLIGHT_OPACITY = 0.55;

// ===== 半音マークの色（§4.7） =====
export const SEMITONE_COLOR = {
  /** 青：同じ弦で隣接指を密着させる（1→2, 2→3, 3→4 とその逆） */
  blue: "#006CD4",
  /** 水色：半音だが密着させない（同指クロマティック / シフト / 移弦） */
  cyan: "#6EE6FF",
} as const;

// ===== ローマ数字 → 弦（§4.4 ルール2） =====
export const ROMAN_TO_STRING: Record<string, ViolinString> = {
  I: ViolinString.E, // Ⅰ=E線
  II: ViolinString.A, // Ⅱ=A線
  III: ViolinString.D, // Ⅲ=D線
  IV: ViolinString.G, // Ⅳ=G線
};

// ===== 指番号の配置ロジック（§4.6）で使う距離閾値 =====
/**
 * 符頭から上部の指番号配置予定位置までの距離がこの px を超えたら、
 * 符頭に近い下側へ配置する（§4.6 条件④）。
 * 画像の解像度によって最適値が変わるため定数化。後から調整可能。
 */
export const FINGER_LABEL_DISTANCE_THRESHOLD_PX = 48;

// ===== 音源（§4.9） =====
export const TEMPO_DEFAULT_BPM = 80;
export const TEMPO_MIN_BPM = 30;
export const TEMPO_MAX_BPM = 160;

// ===== OMR =====
export const OMR_MODEL_DEFAULT = "claude-sonnet-4-5";
