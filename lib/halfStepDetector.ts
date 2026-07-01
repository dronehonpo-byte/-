import type { Note } from "@/types/score";

// 音名 → 半音オフセット（C を基準）
const PITCH_CLASS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * "A4", "C#5", "Bb3" などの音名を MIDI ノート番号に変換する。
 * 解析できない場合は null。
 */
export function pitchToMidi(pitch: string | null | undefined): number | null {
  if (!pitch) return null;
  const m = pitch.trim().match(/^([A-Ga-g])([#b♯♭]?)(-?\d+)$/);
  if (!m) return null;
  const base = PITCH_CLASS[m[1].toUpperCase()];
  if (base === undefined) return null;
  let accidental = 0;
  if (m[2] === "#" || m[2] === "♯") accidental = 1;
  else if (m[2] === "b" || m[2] === "♭") accidental = -1;
  const octave = parseInt(m[3], 10);
  return base + accidental + (octave + 1) * 12;
}

/** 2 音が半音（1 semitone）かどうか */
export function isHalfStep(a: string | null, b: string | null): boolean {
  const ma = pitchToMidi(a);
  const mb = pitchToMidi(b);
  if (ma === null || mb === null) return false;
  return Math.abs(ma - mb) === 1;
}

/**
 * Vision API が半音フラグを返さない／取りこぼした場合に備え、
 * 連続する 2 音の音高から半音関係を補完する。
 * 返り値: noteId -> 「直前の音との間が半音か」
 */
export function detectHalfSteps(notes: Note[]): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (let i = 0; i < notes.length; i++) {
    const cur = notes[i];
    const prev = i > 0 ? notes[i - 1] : null;
    // API のフラグを優先しつつ、音高から補完
    const flagged =
      cur.is_half_step_above_prev ||
      (prev?.is_half_step_below_next ?? false);
    const computed = prev ? isHalfStep(prev.pitch, cur.pitch) : false;
    result[cur.id] = flagged || computed;
  }
  return result;
}
