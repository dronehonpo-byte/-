/**
 * 楽譜データモデル（正典）
 *
 * §0 で合意した OMR 返却 JSON スキーマと一致させる。
 * OMR(画像→JSON) の出力・弦判定・描画・音源すべてがこの型を共有する。
 */

import type { ViolinString } from "@/lib/constants";

/** 符頭のバウンディングボックス（元画像のピクセル座標系） */
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 強弱・松葉記号（§4.6 の配置例外判定で使う） */
export type DynamicMark =
  | "ppp" | "pp" | "p" | "mp" | "mf" | "f" | "ff" | "fff"
  | "cresc" | "dim" | "hairpin-cresc" | "hairpin-dim" | "sf" | "sfz";

/** 指番号は 0(開放)〜4。未指定は null。 */
export type FingerNumber = 0 | 1 | 2 | 3 | 4 | null;

/** ローマ数字による弦指定（§4.4 ルール2） */
export type RomanNumeral = "I" | "II" | "III" | "IV";

/**
 * 音符1つを表す型（§0 合意スキーマ）。
 * OMR が返す「観測値」フィールドと、判定エンジンが後付けする「導出値」フィールドを分ける。
 */
export interface Note {
  /** 一意ID（描画・手動修正で参照） */
  id: string;

  // ---- OMR が返す観測値 ----
  /** 音名（例: "C", "F#", "Bb"）。臨時記号込み。 */
  pitch: string;
  /** オクターブ（科学的音高表記。中央ハ=C4） */
  octave: number;
  /** MIDI ノート番号（pitch+octave から算出、または OMR が付与） */
  midi: number;
  /** 小節 index（0始まり） */
  measureIndex: number;
  /** 同一小節内での並び順（時間順） */
  orderInMeasure: number;
  /** 符頭のバウンディングボックス（元画像座標） */
  bbox: BBox;
  /** 楽譜に記載された指番号（あれば）。無ければ null。 */
  writtenFinger: FingerNumber;
  /** 楽譜に記載されたローマ数字（あれば） */
  writtenRoman?: RomanNumeral | null;
  /** 音符付近の強弱・松葉記号（あれば） */
  dynamics?: DynamicMark[] | null;
  /** スラー・タイの下にあるか（配置判定用の細線フラグ） */
  underSlurOrTie?: boolean;
  /** 元楽譜で指番号が符頭の下側に印字されていたか（§4.6 条件②） */
  writtenFingerBelow?: boolean;
  /** 重音（ダブルストップ）の構成音か */
  isDoubleStop?: boolean;
  /** 重音のときのペア音符ID */
  doubleStopWith?: string | null;

  // ---- 判定エンジンが導出する値 ----
  /** 割り当てられた弦 */
  string?: ViolinString;
  /** 割り当てられた指番号（0〜4） */
  finger?: 0 | 1 | 2 | 3 | 4;
  /** 使用ポジション（1st, 2nd, ...） */
  position?: number;
  /** 指番号ラベルの配置（上/下） */
  fingerLabelSide?: "above" | "below";
  /** この音符に付く半音マーク */
  semitoneMark?: SemitoneMark | null;
}

/** 半音マーク（§4.7） */
export interface SemitoneMark {
  /** 向き。^=上向き（指番号が上側）, v=下向き（指番号が下側） */
  direction: "up" | "down";
  /** 色。blue=密着, cyan=密着しない */
  color: "blue" | "cyan";
  /** どの音符との関係で生じた半音か（隣接音符ID） */
  toNoteId: string;
}

/** 運指モード（§4.4） */
export type FingeringMode =
  | "auto" // ①おまかせ（一般的な初〜中級）
  | "open-string-priority"; // ②開放弦優先（第4指=小指を避ける）

/**
 * ①モード内でユーザーが差し込める独自運指ルール。
 * 初期は空でよいが、関数シグネチャに余地を持たせておく（将来拡張前提）。
 */
export interface CustomFingeringRules {
  /** 特定 pitch を必ずこの弦で弾く、などの上書き（初期は未使用） */
  forceStringByPitch?: Record<string, ViolinString>;
}

export interface FingeringOptions {
  mode: FingeringMode;
  custom?: CustomFingeringRules;
}

/** OMR + 判定を通した1ページ分の解析結果 */
export interface ScoreAnalysis {
  /** 元画像のサイズ（座標系の基準） */
  imageWidth: number;
  imageHeight: number;
  /** 検出した音符（時間順） */
  notes: Note[];
  /** OMR が検出した小節数 */
  measureCount: number;
  /** OMR モデル名など、デバッグ用メタ情報 */
  meta?: Record<string, unknown>;
}
