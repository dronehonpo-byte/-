/**
 * Web 実装: localStorage による永続ストレージ。
 *
 * SSR（サーバーコンポーネント／プリレンダリング）時は window が無いため
 * no-op で安全に振る舞う。
 * RN/Expo 移行時は AsyncStorage 実装へ差し替える。
 */
import type { StorageService } from "./storage";

class WebStorageService implements StorageService {
  private get available(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  getItem(key: string): string | null {
    if (!this.available) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.available) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // 容量超過等は握りつぶす（デモ用途）
    }
  }

  removeItem(key: string): void {
    if (!this.available) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // no-op
    }
  }
}

export const webStorageService: StorageService = new WebStorageService();
