/**
 * 半音マーク（^ / v）判定（要件定義書 §4.7）
 *
 * 隣り合う2音の関係から、半音マークの有無・向き・色を決める純粋関数。
 *   向き: 指番号が上側→ ^(up) / 下側→ v(down)
 *   色:
 *     青(blue)  = 同じ弦で隣接指を密着（1↔2, 2↔3, 3↔4）
 *     水色(cyan) = 半音だが密着しない（同指クロマティック / シフト / 移弦）
 */

import type { Note, SemitoneMark } from "@/types/score";

/** 2音が半音（1 semitone）関係かどうか */
export function isSemitoneStep(a: Note, b: Note): boolean {
  return Math.abs(a.midi - b.midi) === 1;
}

/**
 * 音符 curr に、次音 next との関係で付く半音マークを判定。
 * 半音でなければ null。
 */
export function semitoneMarkFor(curr: Note, next: Note): SemitoneMark | null {
  if (!isSemitoneStep(curr, next)) return null;
  if (curr.string === undefined || next.string === undefined) return null;
  if (curr.finger === undefined || next.finger === undefined) return null;

  const sameString = curr.string === next.string;
  const adjacentFingers = Math.abs((curr.finger ?? 0) - (next.finger ?? 0)) === 1;
  const sameFinger = curr.finger === next.finger;

  let color: "blue" | "cyan";
  if (sameString && adjacentFingers && curr.finger !== 0 && next.finger !== 0) {
    // 青：同じ弦で隣接指を密着（0 は開放弦なので密着対象外）
    color = "blue";
  } else {
    // 水色：同指クロマティック(A) / シフト(B) / 移弦(C) いずれか
    color = "cyan";
  }

  // 向きは指番号ラベルの配置に紐付く（§4.7）。未計算なら上側デフォルト。
  const direction: "up" | "down" = curr.fingerLabelSide === "below" ? "down" : "up";

  return { direction, color, toNoteId: next.id };
}

/**
 * 音符列に半音マークを付与（各音符と「次の音符」の関係で判定）。
 * assignStrings 後・配置(fingerLabelSide)決定後に呼ぶ。
 */
export function assignSemitoneMarks(notes: Note[]): Note[] {
  return notes.map((n, i) => {
    const next = notes[i + 1];
    if (!next) return { ...n, semitoneMark: null };
    return { ...n, semitoneMark: semitoneMarkFor(n, next) };
  });
}
