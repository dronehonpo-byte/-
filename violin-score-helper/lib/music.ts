/**
 * 音楽理論ヘルパー（純粋関数）
 *
 * バイオリンの第1ポジションを中心とした、音高⇔弦・指番号の対応計算。
 */

import { OPEN_STRING_MIDI, STRING_ORDER, ViolinString } from "@/lib/constants";

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/**
 * 音名+オクターブ → MIDI ノート番号。
 * pitch は "C", "F#", "Bb", "Fis"(独) 等を許容。
 */
export function pitchToMidi(pitch: string, octave: number): number {
  const m = pitch.trim().match(/^([A-Ga-g])(.*)$/);
  if (!m) throw new Error(`invalid pitch: ${pitch}`);
  const letter = m[1].toUpperCase();
  let base = NOTE_TO_SEMITONE[letter];
  const accidentals = m[2];
  // 記号を数える（#/♯/is=+1, b/♭/es=-1）
  for (const ch of accidentals) {
    if (ch === "#" || ch === "♯") base += 1;
    if (ch === "b" || ch === "♭") base -= 1;
  }
  // 独語表記 "is"(+1) / "es"(-1) の簡易対応
  const lower = accidentals.toLowerCase();
  if (lower.includes("is")) base += 1;
  if (lower.includes("es") || lower.includes("s")) base -= 1;
  return base + (octave + 1) * 12;
}

/**
 * 第1ポジションでの、開放弦からの半音距離 → 指番号。
 * 0→0, 1..2→1, 3..4→2, 5..6→3, 7→4
 * （7半音=完全5度=次の開放弦と同音＝第4指）
 */
const DISTANCE_TO_FINGER: readonly (0 | 1 | 2 | 3 | 4)[] = [0, 1, 1, 2, 2, 3, 3, 4];

/** 第1ポジションで弾ける半音距離の上限（第4指=完全5度） */
export const FIRST_POSITION_MAX_DISTANCE = 7;

export function fingerForDistance(distance: number): 0 | 1 | 2 | 3 | 4 | null {
  if (distance < 0 || distance > FIRST_POSITION_MAX_DISTANCE) return null;
  return DISTANCE_TO_FINGER[distance];
}

/** ある弦・ポジションでの、指 f の実音 MIDI（1ポジ基準 + ポジションずらし） */
export interface Placement {
  string: ViolinString;
  finger: 0 | 1 | 2 | 3 | 4;
  /** 開放弦からの半音距離 */
  distance: number;
  position: number;
}

/**
 * 与えた midi を第1ポジションで弾ける全 (弦, 指) 候補を返す。
 * 「0 vs 4」の同音候補（例: E線0 と A線4）はここで両方列挙される。
 */
export function firstPositionCandidates(midi: number): Placement[] {
  const out: Placement[] = [];
  for (const s of STRING_ORDER) {
    const distance = midi - OPEN_STRING_MIDI[s];
    const finger = fingerForDistance(distance);
    if (finger === null) continue;
    out.push({ string: s, finger, distance, position: 1 });
  }
  return out;
}

/**
 * 任意ポジションでの候補（position 1..limit）。
 * ポジション p では、開放弦から (p-1) 全音ぶん…ではなく、
 * 各弦で「そのポジションの第1指が開放弦から何半音上か」を近似計算する。
 * 教則本レベルでは 1〜5 ポジション程度で十分。
 */
export function candidatesUpToPosition(midi: number, maxPosition: number): Placement[] {
  const out: Placement[] = [];
  for (const s of STRING_ORDER) {
    const open = OPEN_STRING_MIDI[s];
    for (let p = 1; p <= maxPosition; p++) {
      // ポジション p の手の基準（第1指）位置の目安（半音）。
      // 1ポジ=第1指がおよそ +2、以降ポジションごとに約2半音上がる近似。
      const handBase = p === 1 ? 0 : (p - 1) * 2;
      const distanceFromHand = midi - open - handBase;
      // ポジション内で 0(開放は1ポジのみ)〜4指の範囲
      if (p === 1) {
        const f = fingerForDistance(midi - open);
        if (f !== null) out.push({ string: s, finger: f, distance: midi - open, position: 1 });
      } else {
        // 上位ポジションは開放弦を使わない前提。指1..4 を割当。
        if (distanceFromHand >= 0 && distanceFromHand <= 6) {
          const finger = (DISTANCE_TO_FINGER[distanceFromHand + 2] ?? null);
          if (finger && finger >= 1) {
            out.push({ string: s, finger, distance: midi - open, position: p });
          }
        }
      }
    }
  }
  return out;
}

/** 弦の並びで、s の一つ低い弦を返す（無ければ null） */
export function lowerString(s: ViolinString): ViolinString | null {
  const i = STRING_ORDER.indexOf(s);
  return i > 0 ? STRING_ORDER[i - 1] : null;
}

/** 弦の並びで、s の一つ高い弦を返す（無ければ null） */
export function higherString(s: ViolinString): ViolinString | null {
  const i = STRING_ORDER.indexOf(s);
  return i >= 0 && i < STRING_ORDER.length - 1 ? STRING_ORDER[i + 1] : null;
}
