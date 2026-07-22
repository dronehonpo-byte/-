/**
 * Zustand ストア: アカウント／ロール／ペアリング（モック）。
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformStateStorage } from "./persistStorage";
import { generateId } from "@/lib/id";
import type { AccountState, UserRole, PairingInfo } from "@/types/user";

interface UserStore extends AccountState {
  pairing: PairingInfo | null;

  /** モックログイン（プロバイダを記録するだけ） */
  login: (provider: "apple" | "google" | "demo", displayName?: string) => void;
  logout: () => void;
  setRole: (role: UserRole | null) => void;

  /** ペアリング ID を発行（QR 表示側） */
  issuePairing: () => PairingInfo;
  /** ペアリング成立（読み取り側 or デモ用） */
  completePairing: (id: string, peerName?: string) => void;
  resetPairing: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      loggedIn: false,
      provider: undefined,
      displayName: undefined,
      role: null,
      pairing: null,

      login: (provider, displayName) =>
        set({ loggedIn: true, provider, displayName: displayName ?? "デモユーザー" }),

      logout: () =>
        set({ loggedIn: false, provider: undefined, displayName: undefined, role: null }),

      setRole: (role) => set({ role }),

      issuePairing: () => {
        const info: PairingInfo = {
          id: generateId(),
          createdAt: new Date().toISOString(),
          paired: false,
        };
        set({ pairing: info });
        return info;
      },

      completePairing: (id, peerName) => {
        const current = get().pairing;
        set({
          pairing: {
            id,
            createdAt: current?.createdAt ?? new Date().toISOString(),
            paired: true,
            peerName,
          },
        });
      },

      resetPairing: () => set({ pairing: null }),
    }),
    {
      name: "yorisoi.user",
      storage: createJSONStorage(() => platformStateStorage),
    },
  ),
);
