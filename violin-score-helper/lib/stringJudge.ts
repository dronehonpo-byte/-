/**
 * 弦判定ルールエンジン（★最重要 / 要件定義書 §4.4）
 *
 * 純粋関数として実装。優先順位＝ルール番号順。
 *   R1 明示優先（指番号・直前ポジション維持）
 *   R2 ローマ数字で弦固定
 *   R3 「0 vs 4」判定（開放弦 vs 第4指）
 *   R4 ポジション（奇数優先・第2ポジ回避）
 *   R5 トリル（1-2/2-3優先, 3-4回避）
 *
 * 顧客支給ルールに忠実。楽典的例外は手動修正で最終担保（§7）。
 */

import {
  OPEN_STRING_MIDI,
  ROMAN_TO_STRING,
  ViolinString,
} from "@/lib/constants";
import type { FingeringOptions, Note } from "@/types/score";
import {
  candidatesUpToPosition,
  firstPositionCandidates,
  fingerForDistance,
  lowerString,
  Placement,
} from "@/lib/music";

/** 判定に使う 1 音ぶんの決定結果 */
export interface StringDecision {
  string: ViolinString;
  finger: 0 | 1 | 2 | 3 | 4;
  position: number;
  /** どのルールで決まったか（デバッグ・説明用） */
  reason: "R1-finger" | "R1-maintain" | "R2-roman" | "R3-open-vs-4" | "R4-position" | "fallback";
}

const MAX_POSITION = 5;

/**
 * midi と指番号から、その指を実現できる弦を第1ポジション優先で1つ選ぶ。
 * writtenFinger が与えられた時の弦決定に使う（R1）。
 */
function stringForWrittenFinger(
  midi: number,
  finger: 0 | 1 | 2 | 3 | 4,
  prev: StringDecision | null,
): { string: ViolinString; position: number } | null {
  const cands = [
    ...firstPositionCandidates(midi),
    ...candidatesUpToPosition(midi, MAX_POSITION),
  ].filter((c) => c.finger === finger);
  if (cands.length === 0) return null;
  // 直前と同じ弦を維持できるならそれを優先（R1: 勝手にポジションを変えない）
  if (prev) {
    const same = cands.find((c) => c.string === prev.string);
    if (same) return { string: same.string, position: same.position };
  }
  // 低いポジション優先
  cands.sort((a, b) => a.position - b.position);
  return { string: cands[0].string, position: cands[0].position };
}

/**
 * 「0 vs 4」判定（R3）。
 * 第1ポジションで開放弦(0)と第4指(4)が同音になる3ケースのみ適用。
 *   レ(D): D線0 / G線4     ラ(A): A線0 / D線4     ミ(E): E線0 / A線4
 * ※ 要件定義書の本文はレ(D)を「A線の4」と記載しているが、A線4th=E であり
 *   物理的に D にならない誤記。正しい G線4 を採用（NOTES.md に明記）。
 *
 * 判定: 次が高→0 / 次が低→4 / 同音→さらに次 / 末尾→4。
 */
function resolveOpenVsFourth(
  midi: number,
  nextMidis: number[],
): { openString: ViolinString; fourthString: ViolinString } | null {
  const cands = firstPositionCandidates(midi);
  const open = cands.find((c) => c.finger === 0);
  const fourth = cands.find((c) => c.finger === 4);
  if (open && fourth && lowerString(open.string) === fourth.string) {
    return { openString: open.string, fourthString: fourth.string };
  }
  return null;
}

/** 次に「現在と異なる高さ」になる音の方向を返す（同音はスキップ）。末尾は null。 */
function nextDirection(currentMidi: number, nextMidis: number[]): "higher" | "lower" | null {
  for (const n of nextMidis) {
    if (n > currentMidi) return "higher";
    if (n < currentMidi) return "lower";
  }
  return null; // 末尾 or 以降すべて同音
}

/** 1 音ぶんの弦・指を決定する（前後の文脈を考慮） */
export function decideNote(
  note: Note,
  prev: StringDecision | null,
  nextMidis: number[],
  options: FingeringOptions,
): StringDecision {
  const midi = note.midi;

  // --- R2: ローマ数字が最優先で弦を固定（指番号より弦の確定は先に効く） ---
  if (note.writtenRoman) {
    const string = ROMAN_TO_STRING[note.writtenRoman];
    const distance = midi - OPEN_STRING_MIDI[string];
    const finger = fingerForDistance(distance);
    if (finger !== null) {
      // 指番号が併記されていればそれを尊重
      const f = note.writtenFinger ?? finger;
      return { string, finger: f, position: 1, reason: "R2-roman" };
    }
  }

  // --- R1: 楽譜に指番号があれば絶対採用 ---
  if (note.writtenFinger !== null && note.writtenFinger !== undefined) {
    const resolved = stringForWrittenFinger(midi, note.writtenFinger, prev);
    if (resolved) {
      return {
        string: resolved.string,
        finger: note.writtenFinger,
        position: resolved.position,
        reason: "R1-finger",
      };
    }
  }

  // --- R3: 「0 vs 4」同音ケース ---
  const ovf = resolveOpenVsFourth(midi, nextMidis);
  if (ovf) {
    // ②開放弦優先モードは常に開放弦(0)
    if (options.mode === "open-string-priority") {
      return { string: ovf.openString, finger: 0, position: 1, reason: "R3-open-vs-4" };
    }
    const dir = nextDirection(midi, nextMidis);
    if (dir === "higher") {
      return { string: ovf.openString, finger: 0, position: 1, reason: "R3-open-vs-4" };
    }
    if (dir === "lower") {
      return { string: ovf.fourthString, finger: 4, position: 1, reason: "R3-open-vs-4" };
    }
    // 末尾 or 同音のみ → 第4指をデフォルト
    return { string: ovf.fourthString, finger: 4, position: 1, reason: "R3-open-vs-4" };
  }

  // --- R1(維持) / R4: 指番号なし。直前ポジション維持を試みる ---
  const first = firstPositionCandidates(midi);
  if (prev) {
    // 直前と同じ弦で第1ポジションで届くなら維持
    const same = first.find((c) => c.string === prev.string);
    if (same) {
      return { string: same.string, finger: same.finger, position: 1, reason: "R1-maintain" };
    }
  }

  // --- R4: ポジション選択（奇数優先・第2ポジ回避） ---
  const all = [...first, ...candidatesUpToPosition(midi, MAX_POSITION)];
  if (all.length > 0) {
    const chosen = pickByPositionPreference(all, options);
    return { string: chosen.string, finger: chosen.finger, position: chosen.position, reason: "R4-position" };
  }

  // どうしても割当不能（レンジ外）: G線最寄りにフォールバック
  return { string: ViolinString.G, finger: 0, position: 1, reason: "fallback" };
}

/** R4: 奇数ポジション優先・第2ポジ回避で候補を1つ選ぶ */
function pickByPositionPreference(cands: Placement[], options: FingeringOptions): Placement {
  const score = (c: Placement): number => {
    let s = 0;
    // 低いポジションほど良い
    s += c.position * 10;
    // 第2ポジションは回避（自動提案では最後の選択肢）
    if (c.position === 2) s += 100;
    // 偶数ポジションはやや回避（奇数優先）
    if (c.position % 2 === 0) s += 5;
    // ②開放弦優先モードでは第4指(小指)を避ける
    if (options.mode === "open-string-priority" && c.finger === 4) s += 50;
    return s;
  };
  return [...cands].sort((a, b) => score(a) - score(b))[0];
}

/**
 * ページ全体の音符列に弦・指・ポジションを割り当てる（メイン入口）。
 * 元の notes は変更せず、string/finger/position を付与した新配列を返す。
 */
export function assignStrings(notes: Note[], options: FingeringOptions): Note[] {
  const result: Note[] = [];
  let prev: StringDecision | null = null;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    // 以降の音の midi 列（同音スキップ判定に使う）
    const nextMidis = notes.slice(i + 1).map((n) => n.midi);
    const decision = decideNote(note, prev, nextMidis, options);
    result.push({
      ...note,
      string: decision.string,
      finger: decision.finger,
      position: decision.position,
    });
    prev = decision;
  }
  return result;
}
