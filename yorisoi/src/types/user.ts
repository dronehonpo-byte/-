/**
 * ドメイン型: ユーザー / ロール / ペアリング
 *
 * この層は Web / React Native 両方で共有する想定。
 * プラットフォーム固有の型（DOM 型など）を混ぜないこと。
 */

/** アプリの利用ロール */
export type UserRole = "senior" | "family";

/** 見守り対象者（＝本人／利用者） */
export interface SeniorProfile {
  id: string;
  /** 表示名（例: 「お父さん」「田中 花子」） */
  name: string;
  /** 任意のアバター写真（Base64 データ URL） */
  photo?: string;
}

/** ログイン中ユーザー（モック） */
export interface AccountState {
  /** ログイン済みか */
  loggedIn: boolean;
  /** ダミーの認証プロバイダ */
  provider?: "apple" | "google" | "demo";
  /** 表示名 */
  displayName?: string;
  /** 選択中ロール（未選択なら null） */
  role: UserRole | null;
}

/** QR ペアリング情報（擬似実装） */
export interface PairingInfo {
  /** ペアリング ID（UUID） */
  id: string;
  /** 発行日時（ISO 文字列） */
  createdAt: string;
  /** ペアリング済みかどうか */
  paired: boolean;
  /** ペア相手の表示名（読み取り側で設定） */
  peerName?: string;
}
