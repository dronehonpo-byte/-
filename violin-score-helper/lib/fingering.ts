/**
 * 指番号ラベルの配置ロジック（要件定義書 §4.6）
 *
 * デフォルトは符頭の上側。下側にする条件①〜④、および④より優先の
 * 松葉/強弱記号回避の例外を純粋関数で判定する。
 */

import { FINGER_LABEL_DISTANCE_THRESHOLD_PX } from "@/lib/constants";
import type { DynamicMark, Note } from "@/types/score";

export interface PlacementContext {
  /** 上段の楽譜との衝突判定に使う「上部の空きスペース(px)」。狭いほど下配置寄り。 */
  spaceAbovePx?: number;
  /** 符頭から上部配置予定位置までの距離(px)。④距離ルールで使う。 */
  distanceToAbovePx?: number;
  /** 符頭直下に松葉/強弱記号があるか（例外処理で使う） */
  hasDynamicBelow?: boolean;
}

/** 松葉・強弱記号かどうか（視認性優先の対象） */
function isVisibilityCriticalMark(marks: DynamicMark[] | null | undefined): boolean {
  if (!marks || marks.length === 0) return false;
  return true; // p/mf/f・cresc/dim・松葉はいずれも視認性優先の対象
}

/**
 * 指番号ラベルを上/下どちらに置くか決める。
 * 戻り値の side をそのまま Note.fingerLabelSide に入れる。
 */
export function decideFingerLabelSide(note: Note, ctx: PlacementContext = {}): "above" | "below" {
  // 条件②：元楽譜が既に下部印字 → 下に揃える
  if (note.writtenFingerBelow) return "below";

  // 条件③：重音の下の音 → 下側
  if (note.isDoubleStop && note.doubleStopWith) {
    // ペアより低い音（midi 小）を下側に置く
    return "below";
  }

  // 距離ルール④で「下にしたい」状態か
  const wantsBelowByDistance =
    ctx.distanceToAbovePx !== undefined &&
    ctx.distanceToAbovePx > FINGER_LABEL_DISTANCE_THRESHOLD_PX;

  // 条件①：加線が多く上部に空きが無い
  const noSpaceAbove = ctx.spaceAbovePx !== undefined && ctx.spaceAbovePx < 12;

  const wantsBelow = wantsBelowByDistance || noSpaceAbove;

  // ★例外（④より優先）：下に置くと松葉/強弱記号と重なる場合は、
  // 離れても上側へ（記号の視認性を優先）。スラー/タイの細線は透過するので無視。
  if (wantsBelow && ctx.hasDynamicBelow && isVisibilityCriticalMark(note.dynamics)) {
    return "above";
  }

  return wantsBelow ? "below" : "above";
}

/** 音符列に配置(side)を付与 */
export function assignFingerLabelSides(
  notes: Note[],
  ctxByNoteId: Record<string, PlacementContext> = {},
): Note[] {
  return notes.map((n) => ({
    ...n,
    fingerLabelSide: decideFingerLabelSide(n, ctxByNoteId[n.id] ?? {}),
  }));
}
