// 楽譜解析データの型定義

export type ViolinString = "G" | "D" | "A" | "E";
export type Finger = 0 | 1 | 2 | 3 | 4;
export type StemDirection = "up" | "down" | null;
export type FingeringSide = "above" | "below";
export type AnalysisMode = "A" | "B"; // A=おまかせ, B=開放弦優先

/** Claude Vision API が音符ごとに返す生データ */
export interface Note {
  id: string;
  pitch: string; // e.g. "A4"
  duration: string; // "quarter" など
  string: ViolinString | null;
  finger: Finger | null;
  is_half_step_above_prev: boolean;
  is_half_step_below_next: boolean;
  /** 半音の種類：attached=隣接指がくっつく（青）, detached=開放弦等くっつかない（水色） */
  half_step_type?: "attached" | "detached" | null;
  position_in_image: {
    x: number;
    y: number;
    notehead_y: number;
  };
  has_beam: boolean;
  stem_direction: StemDirection;
  stem_top_y: number | null;
  is_double_stop: boolean;
  double_stop_partner_id: string | null;
  existing_fingering_in_score: Finger | null;
  fingering_position_in_score: FingeringSide | null;
  existing_roman_numeral: string | null;
  dynamics_nearby: string | null;
  crescendo_nearby: boolean;
  measure: number;
  beat: number;
}

export interface StaffLine {
  top_y: number;
  bottom_y: number;
  left_x: number;
  right_x: number;
}

/** Claude Vision API のレスポンス全体 */
export interface AnalysisResult {
  notes: Note[];
  key_signature: string;
  time_signature: string;
  clef: string;
  tempo_marking: string | null;
  staff_lines: StaffLine[];
}

/** ユーザーが手動修正した内容（localStorage 保存） */
export interface NoteEdit {
  string?: ViolinString;
  finger?: Finger;
  side?: FingeringSide;
  halfStep?: boolean; // 半音マークの強制 ON/OFF
  halfStepAttached?: boolean; // 半音の色：true=くっつく(青) / false=くっつかない(水色)
}

export type NoteEdits = Record<string, NoteEdit>;

/** result ページが sessionStorage 経由で受け取るドキュメント */
export interface ScoreDocument {
  id: string;
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  mode: AnalysisMode;
  analysis: AnalysisResult;
  createdAt: number;
}

/** 表示モード */
export type DisplayMode = "color" | "color+finger" | "color+finger+halfstep";

/** オーバーレイ描画用に計算済みの 1 音符ぶんの情報 */
export interface OverlayNote {
  id: string;
  string: ViolinString | null;
  finger: Finger | null;
  // 画像ピクセル座標（自然サイズ基準）
  noteheadX: number;
  noteheadY: number;
  side: FingeringSide;
  // 指番号ラベルの中心座標
  labelX: number;
  labelY: number;
  // 半音マーク
  halfStepMark: "^" | "v" | null;
  halfStepX: number;
  halfStepY: number;
  // 半音の色種別：true=くっつく(青) / false=くっつかない(水色) / null=半音なし
  halfStepAttached: boolean | null;
}
