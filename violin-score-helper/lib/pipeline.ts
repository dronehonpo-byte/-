/**
 * 解析パイプライン（純粋関数の合成）
 *
 * OMR の生 JSON → 弦判定 → 指番号配置 → 半音マーク の順に適用し、
 * 描画・音源が使える完成形の ScoreAnalysis を返す。
 * 手動修正のたびにこの関数を再実行すれば下流表示が再計算される（§4.8）。
 */

import { assignStrings } from "@/lib/stringJudge";
import { assignFingerLabelSides, PlacementContext } from "@/lib/fingering";
import { assignSemitoneMarks } from "@/lib/semitone";
import { pitchToMidi } from "@/lib/music";
import type { FingeringOptions, Note, ScoreAnalysis } from "@/types/score";

/** midi 欠損時に pitch+octave から補完 */
function ensureMidi(notes: Note[]): Note[] {
  return notes.map((n) => {
    if (typeof n.midi === "number" && !Number.isNaN(n.midi)) return n;
    try {
      return { ...n, midi: pitchToMidi(n.pitch, n.octave) };
    } catch {
      return { ...n, midi: 0 };
    }
  });
}

/** bbox から配置コンテキストを推定（簡易ヒューリスティック・後で調整可能） */
function contextFromBBox(notes: Note[], imageHeight: number): Record<string, PlacementContext> {
  const ctx: Record<string, PlacementContext> = {};
  for (const n of notes) {
    const topSpace = n.bbox.y; // 画像上端からの距離 ≒ 上部の空き
    ctx[n.id] = {
      spaceAbovePx: topSpace,
      hasDynamicBelow: !!(n.dynamics && n.dynamics.length > 0),
    };
  }
  return ctx;
}

export function analyze(raw: ScoreAnalysis, options: FingeringOptions): ScoreAnalysis {
  const withMidi = ensureMidi(raw.notes);
  const withStrings = assignStrings(withMidi, options);
  const ctx = contextFromBBox(withStrings, raw.imageHeight);
  const withSides = assignFingerLabelSides(withStrings, ctx);
  const withMarks = assignSemitoneMarks(withSides);
  return { ...raw, notes: withMarks };
}

/**
 * 手動修正の適用（§4.8）。指定 note を上書きし、パイプラインを再実行する。
 */
export function applyManualEdit(
  analysis: ScoreAnalysis,
  noteId: string,
  patch: Partial<Pick<Note, "string" | "finger" | "writtenFinger">>,
  options: FingeringOptions,
): ScoreAnalysis {
  const notes = analysis.notes.map((n) =>
    n.id === noteId
      ? {
          ...n,
          ...patch,
          // ユーザーが弦/指を明示したら writtenFinger にも反映し、再計算で尊重させる
          writtenFinger: patch.finger ?? patch.writtenFinger ?? n.writtenFinger,
        }
      : n,
  );
  return analyze({ ...analysis, notes }, options);
}
