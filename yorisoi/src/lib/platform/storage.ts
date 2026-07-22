/**
 * プラットフォーム抽象化: 永続ストレージ（Key-Value）
 *
 * Web 実装は `storage.web.ts`（localStorage）。
 * RN/Expo 移行時は AsyncStorage / expo-secure-store 実装へ差し替える。
 *
 * 値は JSON 文字列として保存する前提の同期的な KV インターフェース。
 * （RN の AsyncStorage は非同期だが、Zustand persist の
 *  StateStorage が Promise を許容するため移行時に吸収可能）
 */
export interface StorageService {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
