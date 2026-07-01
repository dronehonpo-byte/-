import type {
  AnalysisResult,
  FingeringSide,
  Note,
  NoteEdits,
  OverlayNote,
  StaffLine,
} from "@/types/score";
import { pitchToMidi, detectHalfSteps } from "./halfStepDetector";

// 指番号配置の距離しきい値（例外④）。符頭からこの距離以上離れるなら近い側へ。
const DISTANCE_THRESHOLD = 80;
const LABEL_GAP = 16; // 符頭/符幹先端から数字までの基本オフセット
const HALFSTEP_GAP = 14; // 数字から半音マークまでのオフセット

/** 上の段との距離が近いとみなすしきい値（例外①の簡易判定用） */
const HIGH_REGISTER_LEDGER = 2;

function staffMetrics(staff: StaffLine | undefined) {
  if (!staff) return null;
  const gap = (staff.bottom_y - staff.top_y) / 4; // 1線間
  return { topY: staff.top_y, bottomY: staff.bottom_y, gap };
}

/** その音符が属する五線（最も近いもの）を返す */
function nearestStaff(note: Note, staves: StaffLine[]): StaffLine | undefined {
  if (staves.length === 0) return undefined;
  let best = staves[0];
  let bestDist = Infinity;
  for (const s of staves) {
    const mid = (s.top_y + s.bottom_y) / 2;
    const d = Math.abs(note.position_in_image.notehead_y - mid);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

/**
 * 解析結果と手動修正から、オーバーレイ描画用の情報を計算する。
 * 配置ルール ①〜④ をすべて実装。
 */
export function computeOverlay(
  analysis: AnalysisResult,
  edits: NoteEdits = {}
): OverlayNote[] {
  const notes = analysis.notes;
  const halfStepMap = detectHalfSteps(notes);

  // 例外②：元楽譜で指番号が「下」に印字されていたら、それ以降の音も下側に
  let stickyBelow = false;

  const result: OverlayNote[] = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const edit = edits[note.id] ?? {};
    const string = edit.string ?? note.string;
    const finger = edit.finger ?? note.finger;

    const { x, notehead_y: noteheadY } = note.position_in_image;
    const stemTop = note.stem_top_y;

    // 符幹の先端（上側に伸びるか下側に伸びるか）
    const aboveAnchorY =
      note.stem_direction === "up" && stemTop !== null ? stemTop : noteheadY;
    const belowAnchorY =
      note.stem_direction === "down" && stemTop !== null ? stemTop : noteheadY;

    // ----- 配置側（上/下）の決定 -----
    let side: FingeringSide = "above"; // デフォルト：上側

    // 例外②：sticky-below（元楽譜の指番号が下にあった場合、以降も下）
    if (note.fingering_position_in_score === "below") stickyBelow = true;
    if (stickyBelow) side = "below";

    // 例外③：重音の下の音は下側、上の音は上側
    if (note.is_double_stop && note.double_stop_partner_id) {
      const partner = notes.find((n) => n.id === note.double_stop_partner_id);
      if (partner) {
        const myMidi = pitchToMidi(note.pitch) ?? 0;
        const partnerMidi = pitchToMidi(partner.pitch) ?? 0;
        side = myMidi < partnerMidi ? "below" : "above";
      }
    }

    // 例外①：高音域で上にスペースが無い → 下側
    const staff = nearestStaff(note, analysis.staff_lines);
    const m = staffMetrics(staff);
    if (m) {
      // 五線の上にどれだけ加線があるか（おおまかに）
      const ledgerLinesAbove = Math.max(0, (m.topY - noteheadY) / m.gap);
      if (ledgerLinesAbove >= HIGH_REGISTER_LEDGER) {
        side = "below";
      }
    }

    // 例外④（最優先距離ルール）：上側に置くと符頭から遠い場合は下側へ
    const aboveLabelDist = Math.abs(aboveAnchorY - LABEL_GAP - noteheadY);
    if (side === "above" && aboveLabelDist >= DISTANCE_THRESHOLD) {
      // 下に置くとクレッシェンド/強弱記号と重なる場合は上のまま（記号視認性優先）
      const collidesWithDynamics =
        note.crescendo_nearby || note.dynamics_nearby !== null;
      if (!collidesWithDynamics) side = "below";
    }

    // 手動修正による上下切り替えが最優先
    if (edit.side) side = edit.side;

    // ----- ラベル座標 -----
    const labelX = x;
    const labelY =
      side === "above"
        ? aboveAnchorY - LABEL_GAP
        : belowAnchorY + LABEL_GAP;

    // ----- 半音マーク -----
    const autoHalf = halfStepMap[note.id] ?? false;
    const showHalf = edit.halfStep ?? autoHalf;
    let halfStepMark: "^" | "v" | null = null;
    let halfStepX = labelX;
    let halfStepY = labelY;
    let halfStepAttached: boolean | null = null;
    if (showHalf && finger !== null) {
      halfStepMark = side === "above" ? "^" : "v";
      // 直前の音との「間」に寄せる
      const prev = notes[i - 1];
      if (prev) halfStepX = (x + prev.position_in_image.x) / 2;
      halfStepY =
        side === "above" ? labelY - HALFSTEP_GAP : labelY + HALFSTEP_GAP;

      // 半音の色種別：API指定 → 運指から判定 → 手動修正で上書き
      const prevOv = result[i - 1];
      let attached: boolean;
      if (note.half_step_type === "attached") attached = true;
      else if (note.half_step_type === "detached") attached = false;
      else {
        const pf = prevOv?.finger ?? null;
        attached =
          !!prevOv?.string &&
          prevOv.string === string &&
          pf !== null &&
          pf >= 1 &&
          finger >= 1 &&
          Math.abs(pf - finger) === 1;
      }
      halfStepAttached = edit.halfStepAttached ?? attached;
    }

    result.push({
      id: note.id,
      string,
      finger,
      noteheadX: x,
      noteheadY,
      side,
      labelX,
      labelY,
      halfStepMark,
      halfStepX,
      halfStepY,
      halfStepAttached,
    });
  }

  return result;
}
