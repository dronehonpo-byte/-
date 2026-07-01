import type { AnalysisMode, Note, ViolinString } from "@/types/score";
import { pitchToMidi } from "./halfStepDetector";

/** ルール2：ローマ数字 → 弦 (Ⅰ→E, Ⅱ→A, Ⅲ→D, Ⅳ→G) */
const ROMAN_TO_STRING: Record<string, ViolinString> = {
  I: "E",
  Ⅰ: "E",
  II: "A",
  Ⅱ: "A",
  III: "D",
  Ⅲ: "D",
  IV: "G",
  Ⅳ: "G",
};

export function romanToString(roman: string | null): ViolinString | null {
  if (!roman) return null;
  return ROMAN_TO_STRING[roman.trim().toUpperCase()] ?? ROMAN_TO_STRING[roman.trim()] ?? null;
}

// 開放弦の MIDI と弦
const OPEN_STRINGS: { string: ViolinString; midi: number }[] = [
  { string: "G", midi: pitchToMidi("G3")! },
  { string: "D", midi: pitchToMidi("D4")! },
  { string: "A", midi: pitchToMidi("A4")! },
  { string: "E", midi: pitchToMidi("E5")! },
];

/** その音高が開放弦で出せるならその弦を返す */
export function matchingOpenString(pitch: string | null): ViolinString | null {
  const midi = pitchToMidi(pitch);
  if (midi === null) return null;
  return OPEN_STRINGS.find((o) => o.midi === midi)?.string ?? null;
}

/**
 * ルール1〜5 を踏まえた後処理。Claude Vision の結果を補正する。
 *  - ルール1: 楽譜上の明示指示（existing_fingering_in_score）を最優先
 *  - ルール2: ローマ数字の弦指定を反映
 *  - ルール3: 0 vs 4（開放弦 vs 第4指）を次の音の方向で判定し finger 欠損を補完
 *  - モードB: 可能な限り開放弦(0)を優先
 */
export function applyFingeringRules(
  notes: Note[],
  mode: AnalysisMode
): Note[] {
  return notes.map((note, i) => {
    let finger = note.finger;
    let str = note.string;

    // ルール1：明示指示を最優先
    if (note.existing_fingering_in_score !== null) {
      finger = note.existing_fingering_in_score;
    }

    // ルール2：ローマ数字の弦指定
    const romanStr = romanToString(note.existing_roman_numeral);
    if (romanStr) str = romanStr;

    const openString = matchingOpenString(note.pitch);

    // ルール3：0 vs 4 の判定（finger が欠損 or モードB の最適化対象）
    if (openString) {
      if (finger === null) {
        // 欠損補完：次の音の方向で決める
        const next = notes[i + 1];
        const curMidi = pitchToMidi(note.pitch);
        const nextMidi = next ? pitchToMidi(next.pitch) : null;
        if (curMidi !== null && nextMidi !== null) {
          finger = nextMidi > curMidi ? 0 : 4; // 高→開放(0) / 低→第4指(4)
        } else {
          finger = 4; // フレーズ末尾は第4指デフォルト
        }
      }

      // モードB：開放弦で代替可能なら 0 を優先（明示指示が無い場合のみ）
      if (
        mode === "B" &&
        note.existing_fingering_in_score === null &&
        finger === 4
      ) {
        finger = 0;
      }

      // finger が 0 のときは開放弦の弦に合わせる
      if (finger === 0 && str === null) {
        str = openString;
      }
    }

    return { ...note, finger, string: str };
  });
}
