/**
 * Zustand persist 用の StateStorage アダプタ。
 *
 * 直接 localStorage を触らず、`lib/platform/storage` 経由にすることで
 * RN 移行時は storage 実装の差し替えだけで永続化先を変えられる。
 */
import type { StateStorage } from "zustand/middleware";
import { storage } from "@/lib/platform";

export const platformStateStorage: StateStorage = {
  getItem: (name) => storage.getItem(name),
  setItem: (name, value) => storage.setItem(name, value),
  removeItem: (name) => storage.removeItem(name),
};
