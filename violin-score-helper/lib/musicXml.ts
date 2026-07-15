/**
 * MusicXML → ScoreAnalysis 変換（純粋関数）
 *
 * OSS OMR（Audiveris）は楽譜画像を読み取って **MusicXML** を出力する。
 * このモジュールは、その MusicXML を、既存の判定・描画パイプラインが期待する
 * `ScoreAnalysis`（= Note[] 等）へ変換する。これが旧 Vision API の返却JSONの
 * 置き換えにあたる中核ロジック。
 *
 * ★重要（座標について）:
 *   MusicXML は音高・小節・運指を正確に持つが、「元スキャン画像のピクセル座標」
 *   は直接は持たない。そこで本モジュールは
 *     - x: 小節幅の累積 + 音符の default-x（無ければ小節内で均等割り）
 *     - y: 音部記号と音高から譜面上の縦位置を算出（五線の幾何）
 *   を tenths（MusicXML の内部単位）で求め、ページ寸法(tenths)と画像ピクセル寸法の
 *   比率でピクセルへ換算する。クリーンな1ページスキャン前提の近似で、
 *   実スキャンでの微調整（キャリブレーション）は下記 CALIBRATION 定数で行う。
 *   → フェーズ2で実出力を見ながら合わせ込む想定（DESIGN_NOTES 参照）。
 */

import { XMLParser } from "fast-xml-parser";
import { pitchToMidi } from "@/lib/music";
import type {
  BBox,
  FingerNumber,
  Note,
  RomanNumeral,
  ScoreAnalysis,
} from "@/types/score";

/** 座標換算のキャリブレーション定数（実スキャンで微調整する） */
export const CALIBRATION = {
  /** 符頭の見かけ幅（tenths）。1 interline = 10 tenths。 */
  noteheadWidthTenths: 12,
  /** 符頭の見かけ高さ（tenths）。 */
  noteheadHeightTenths: 10,
  /** ページ寸法(tenths)が取れない場合の A4 相当のフォールバック（tenths/mm=デフォルト） */
  fallbackTenthsPerMm: 40 / 7, // MusicXML 既定: 40 tenths = 7mm
  /** 五線の高さ（top→bottom line, 4 space）= 40 tenths */
  staffHeightTenths: 40,
  /** システム(段)の既定の縦間隔（top-system/ system-distance が無い場合） */
  defaultSystemGapTenths: 90,
  /** 最初の段の上端オフセット（top-margin 等が無い場合） */
  defaultTopMarginTenths: 80,
  /** 左マージン（system-margins 等が無い場合） */
  defaultLeftMarginTenths: 40,
  /** 小節 width 属性が無い場合の既定小節幅 */
  defaultMeasureWidthTenths: 160,
} as const;

/**
 * 音部記号 sign → 「五線 最上線」の diatonic staff-step。
 * staff-step = octave*7 + stepIndex(C=0,D=1,…,B=6)。
 * 例: ト音記号(G,2線) の最上線は F5 → 5*7+3 = 38。
 */
const CLEF_TOPLINE_STAFFSTEP: Record<string, number> = {
  G: 5 * 7 + 3, // 38: F5（ト音記号）
  F: 3 * 7 + 5, // 26: A3（ヘ音記号）
  C: 4 * 7 + 4, // 32: G4（ハ音記号=アルト）
};

const STEP_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

interface ParseOptions {
  /** 元スキャン画像（Audiveris が処理したページ）のピクセル寸法 */
  imageWidth: number;
  imageHeight: number;
}

/** fast-xml-parser の出力を「常に配列」に正規化 */
function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function num(v: unknown, fallback = NaN): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

/** diatonic staff-step（縦位置計算用） */
function staffStepOf(step: string, octave: number): number {
  return octave * 7 + (STEP_INDEX[step] ?? 0);
}

/** step + alter → 我々の pitch 文字列（例 "F#", "Bb"）。臨時記号は #/b の連続で表す。 */
function pitchString(step: string, alter: number): string {
  if (alter > 0) return step + "#".repeat(alter);
  if (alter < 0) return step + "b".repeat(-alter);
  return step;
}

/** MusicXML の <string>（1=最高弦）→ ローマ数字（I=E,II=A,III=D,IV=G） */
function stringNumberToRoman(n: number): RomanNumeral | null {
  switch (n) {
    case 1:
      return "I";
    case 2:
      return "II";
    case 3:
      return "III";
    case 4:
      return "IV";
    default:
      return null;
  }
}

/**
 * MusicXML 文字列 → ScoreAnalysis。
 * score-partwise / score-timewise の前者を対象（Audiveris は partwise を出力）。
 */
export function parseMusicXml(xml: string, opts: ParseOptions): ScoreAnalysis {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) =>
      ["part", "measure", "note", "clef", "beam", "print", "system-layout"].includes(name),
  });

  const doc = parser.parse(xml);
  const score = doc["score-partwise"];
  if (!score) {
    throw new Error("MusicXML の解析に失敗しました（score-partwise が見つかりません）。");
  }

  // ---- ページ寸法(tenths) ----
  const defaults = score.defaults ?? {};
  const scaling = defaults.scaling ?? {};
  const mm = num(scaling.millimeters, 7);
  const tenths = num(scaling.tenths, 40);
  const tenthsPerMm = mm > 0 ? tenths / mm : CALIBRATION.fallbackTenthsPerMm;
  const pageLayout = defaults["page-layout"] ?? {};
  const pageWidthTenths = num(pageLayout["page-width"], 210 * tenthsPerMm);
  const pageHeightTenths = num(pageLayout["page-height"], 297 * tenthsPerMm);

  // tenths → px の換算係数（1ページ=1スキャン画像 前提の近似）
  const sx = opts.imageWidth > 0 && pageWidthTenths > 0 ? opts.imageWidth / pageWidthTenths : 1;
  const sy = opts.imageHeight > 0 && pageHeightTenths > 0 ? opts.imageHeight / pageHeightTenths : 1;

  const notes: Note[] = [];
  let globalMeasureIndex = -1;

  const parts = toArray(score.part);
  for (const part of parts) {
    // 段(システム)の縦位置と、段内の小節x累積をトラッキング
    let systemTopTenths: number = CALIBRATION.defaultTopMarginTenths;
    let measureLeftTenths: number = CALIBRATION.defaultLeftMarginTenths;
    let clefSign = "G"; // 既定=ト音記号（バイオリン）
    let divisions = 1;

    const measures = toArray(part.measure);
    for (const measure of measures) {
      globalMeasureIndex += 1;

      // <print> による改段・レイアウト更新
      for (const print of toArray(measure.print)) {
        if (print["@_new-system"] === "yes" || print["@_new-page"] === "yes") {
          systemTopTenths += CALIBRATION.staffHeightTenths + CALIBRATION.defaultSystemGapTenths;
          measureLeftTenths = CALIBRATION.defaultLeftMarginTenths;
        }
        const sysLayout = toArray(print["system-layout"])[0];
        if (sysLayout) {
          const topDist = num(sysLayout["top-system-distance"], NaN);
          if (Number.isFinite(topDist)) systemTopTenths = topDist;
        }
      }

      // <attributes>（divisions / clef）
      const attrs = toArray(measure.attributes);
      for (const a of attrs) {
        if (a.divisions != null) divisions = num(a.divisions, divisions);
        const clef = toArray(a.clef)[0];
        if (clef?.sign) clefSign = String(clef.sign);
      }

      const measureWidthTenths = num(measure["@_width"], CALIBRATION.defaultMeasureWidthTenths);
      const topLineStaffStep = CLEF_TOPLINE_STAFFSTEP[clefSign] ?? CLEF_TOPLINE_STAFFSTEP.G;
      const staffTopTenths = systemTopTenths;

      const rawNotes = toArray(measure.note);
      let orderInMeasure = 0;
      // default-x が無い音符のための均等割り用インデックス
      const positionsCount = rawNotes.filter((n) => n.pitch && n.chord == null).length || 1;
      let evenIdx = 0;

      for (const n of rawNotes) {
        // 休符はスキップ
        if (n.rest != null) continue;
        // pitch が無い（未確定など）はスキップ
        const p = n.pitch;
        if (!p) continue;

        const isChord = n.chord != null; // 和音の2音目以降
        if (!isChord) evenIdx += 1;

        const step = String(p.step ?? "C");
        const octave = num(p.octave, 4);
        const alter = num(p.alter, 0);
        const pitch = pitchString(step, alter);

        // ---- x（tenths → px） ----
        const defaultX = num(n["@_default-x"], NaN);
        const xTenths = Number.isFinite(defaultX)
          ? measureLeftTenths + defaultX
          : measureLeftTenths + (measureWidthTenths * (evenIdx - 0.5)) / positionsCount;

        // ---- y（音部記号+音高の幾何）----
        const s = staffStepOf(step, octave);
        // 最上線からの下方向オフセット（tenths）。上へ行くほど負。
        const yFromTopLine = (topLineStaffStep - s) * 5;
        const yTenths = staffTopTenths + yFromTopLine;

        const wPx = CALIBRATION.noteheadWidthTenths * sx;
        const hPx = CALIBRATION.noteheadHeightTenths * sy;
        const bbox: BBox = {
          x: xTenths * sx - wPx / 2,
          y: yTenths * sy - hPx / 2,
          w: wPx,
          h: hPx,
        };

        // ---- 運指・弦（記載があれば）----
        const technical = n.notations?.technical ?? {};
        let writtenFinger: FingerNumber = null;
        if (technical.fingering != null) {
          const f = num(
            typeof technical.fingering === "object"
              ? technical.fingering["#text"]
              : technical.fingering,
            NaN,
          );
          if (f >= 0 && f <= 4) writtenFinger = f as FingerNumber;
        }
        let writtenRoman: RomanNumeral | null = null;
        if (technical.string != null) {
          const sn = num(
            typeof technical.string === "object" ? technical.string["#text"] : technical.string,
            NaN,
          );
          writtenRoman = stringNumberToRoman(sn);
        }

        let midi: number;
        try {
          midi = pitchToMidi(pitch, octave);
        } catch {
          midi = 0;
        }

        notes.push({
          id: `m${globalMeasureIndex}_${orderInMeasure}`,
          pitch,
          octave,
          midi,
          measureIndex: globalMeasureIndex,
          orderInMeasure,
          bbox,
          writtenFinger,
          writtenRoman,
        });
        orderInMeasure += 1;
      }

      measureLeftTenths += measureWidthTenths;
    }
  }

  return {
    imageWidth: opts.imageWidth,
    imageHeight: opts.imageHeight,
    notes,
    measureCount: globalMeasureIndex + 1,
    meta: { source: "audiveris-musicxml" },
  };
}
