/**
 * ドメイン型: 音声生活サポート（機能①）
 *
 * Web / React Native 共有想定。DOM 型は含めない。
 */

/**
 * アイコンの識別子。
 * lucide-react のアイコン名に対応する文字列キー。
 * （実際のアイコンコンポーネントへの解決は UI 層 `lib/icons` で行う）
 */
export type IconKey =
  | "calendar"
  | "clock"
  | "bus"
  | "sun"
  | "pill"
  | "utensils"
  | "bath"
  | "trash"
  | "heart"
  | "message-circle"
  | "map-pin"
  | "footprints"
  | "users"
  | "cloud"
  | "shopping-cart"
  | "home"
  | "phone"
  | "coffee"
  | "hospital"
  | "help-circle";

/**
 * 音声ボタン 1 個の定義。
 * タップすると `answer` を TTS 読み上げ＋大きな文字で表示する。
 */
export interface VoiceButton {
  id: string;
  /** どのカテゴリに属するか */
  categoryId: string;
  /** ボタンの見出し（例: 「今日の予定」） */
  title: string;
  /** 読み上げ＆表示する回答（例: 「今日は10時に病院です」） */
  answer: string;
  /** アイコンキー */
  icon: IconKey;
  /** 任意の写真（Base64 データ URL） */
  photo?: string;
  /** カテゴリ内の並び順（昇順） */
  order: number;
}

/** ボタンをまとめるカテゴリ */
export interface VoiceCategory {
  id: string;
  /** カテゴリ名（例: 「予定」「生活」「家族」「天気」） */
  title: string;
  /** カテゴリを表すアイコン */
  icon: IconKey;
  /** ホーム画面での並び順（昇順） */
  order: number;
}

/** TTS（読み上げ）設定 */
export interface TtsSettings {
  /** 話速（0.1〜2.0、既定 0.85 = 遅め） */
  rate: number;
  /** 音量（0.0〜1.0、既定 1.0 = 大きめ） */
  volume: number;
}

/** ボタン新規作成／編集時の入力（id, order は自動採番） */
export type VoiceButtonDraft = Omit<VoiceButton, "id" | "order">;

/** カテゴリ新規作成時の入力 */
export type VoiceCategoryDraft = Omit<VoiceCategory, "id" | "order">;
