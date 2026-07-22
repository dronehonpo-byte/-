/**
 * プラットフォーム抽象化: 読み上げ（TTS）
 *
 * Web 実装は `speech.web.ts`（Web Speech API / SpeechSynthesis）。
 * React Native / Expo 移行時は `speech.native.ts` に
 * expo-speech 実装を追加し、`index.ts` の解決を差し替える。
 *
 * この interface には DOM 型を露出させないこと（RN と共有するため）。
 */

export interface SpeakOptions {
  /** 話速（0.1〜2.0）。既定は遅め */
  rate?: number;
  /** 音量（0.0〜1.0）。既定は大きめ */
  volume?: number;
}

export interface SpeechService {
  /**
   * テキストを読み上げる。
   * 読み上げ完了（または中断）で resolve する。
   */
  speak(text: string, options?: SpeakOptions): Promise<void>;
  /** 現在の読み上げを停止する */
  stop(): void;
  /** この環境で TTS が利用可能か */
  isSupported(): boolean;
}
