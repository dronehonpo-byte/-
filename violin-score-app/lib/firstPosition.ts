// 第1ポジションの運指を「ピッチだけ」から機械的に決めるエンジン（API不要）。
// バイオリンの各弦は 開放(0) から 第4指(4) までを担当し、
// 音名の何番目か（ドレミの距離）で指番号が決まる。

import type { ViolinString, Finger } from "@/types/score";
import { pitchToMidi } from "./halfStepDetector";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

function letterIndex(letter: string): number {
  return LETTERS.indexOf(letter.toUpperCase());
}

interface OpenString {
  string: ViolinString;
  midi: number;
  letter: string;
  octave: number;
}

// 低い弦から高い弦の順
const OPEN_STRINGS: OpenString[] = (
  [
    ["G", "G3"],
    ["D", "D4"],
    ["A", "A4"],
    ["E", "E5"],
  ] as [ViolinString, string][]
).map(([string, pitch]) => {
  const m = pitch.match(/^([A-G])(\d)$/)!;
  return {
    string,
    midi: pitchToMidi(pitch)!,
    letter: m[1],
    octave: parseInt(m[2], 10),
  };
});

export interface Fingering {
  string: ViolinString | null;
  finger: Finger | null;
}

/** 開放弦からの「ドレミ（音名）距離」。同オクターブ補正込み。 */
function diatonicSteps(open: OpenString, letter: string, octave: number): number {
  return octave * 7 + letterIndex(letter) - (open.octave * 7 + letterIndex(open.letter));
}

/**
 * 音名（例 "F#4"）→ 第1ポジションの {弦, 指}。
 * 第1ポジションで出せない音は {null, null}（色付けしない）。
 */
export function pitchToFingering(pitch: string): Fingering {
  const m = pitch.trim().match(/^([A-Ga-g])([#b♯♭]?)(-?\d+)$/);
  const midi = pitchToMidi(pitch);
  if (!m || midi === null) return { string: null, finger: null };
  const letter = m[1].toUpperCase();
  const octave = parseInt(m[3], 10);

  const candidates: { string: ViolinString; finger: Finger }[] = [];
  for (const open of OPEN_STRINGS) {
    const steps = diatonicSteps(open, letter, octave);
    if (steps < 0 || steps > 4) continue;
    const semi = midi - open.midi;
    if (semi < 0) continue;
    // 指ごとの妥当な半音距離（オクターブ取り違えを排除）
    const ok =
      (steps === 0 && semi === 0) ||
      (steps === 1 && semi >= 1 && semi <= 2) ||
      (steps === 2 && semi >= 3 && semi <= 4) ||
      (steps === 3 && semi >= 5 && semi <= 6) ||
      (steps === 4 && semi >= 6 && semi <= 8);
    if (ok) candidates.push({ string: open.string, finger: steps as Finger });
  }
  if (candidates.length === 0) return { string: null, finger: null };
  // 指番号が小さい方を優先 → 開放弦・低い指を自然に選ぶ
  candidates.sort((a, b) => a.finger - b.finger);
  return { string: candidates[0].string, finger: candidates[0].finger };
}

/** 連続する2音が同じ弦上で半音（隣り合う指がくっつく）か。 */
export function isAdjacentHalfStep(
  prev: { pitch: string; fing: Fingering },
  cur: { pitch: string; fing: Fingering }
): boolean {
  if (!prev.fing.string || !cur.fing.string) return false;
  if (prev.fing.string !== cur.fing.string) return false;
  const a = pitchToMidi(prev.pitch);
  const b = pitchToMidi(cur.pitch);
  if (a === null || b === null) return false;
  return Math.abs(a - b) === 1;
}
