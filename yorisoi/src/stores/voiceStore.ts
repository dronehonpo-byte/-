/**
 * Zustand ストア: 音声ボタン／カテゴリ／TTS 設定（機能①）。
 *
 * CRUD と並び替えロジックを保持する。UI からは基本 `useVoiceButtons` 経由で使う。
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformStateStorage } from "./persistStorage";
import { generateId } from "@/lib/id";
import {
  INITIAL_BUTTONS,
  INITIAL_CATEGORIES,
} from "@/lib/initialData";
import type {
  VoiceButton,
  VoiceCategory,
  VoiceButtonDraft,
  VoiceCategoryDraft,
  TtsSettings,
} from "@/types/voice";

const DEFAULT_TTS: TtsSettings = { rate: 0.85, volume: 1.0 };

interface VoiceStore {
  categories: VoiceCategory[];
  buttons: VoiceButton[];
  tts: TtsSettings;

  // --- カテゴリ ---
  addCategory: (draft: VoiceCategoryDraft) => VoiceCategory;
  updateCategory: (id: string, patch: Partial<VoiceCategoryDraft>) => void;
  removeCategory: (id: string) => void;
  moveCategory: (id: string, direction: "up" | "down") => void;

  // --- ボタン ---
  addButton: (draft: VoiceButtonDraft) => VoiceButton;
  updateButton: (id: string, patch: Partial<VoiceButtonDraft>) => void;
  removeButton: (id: string) => void;
  moveButton: (id: string, direction: "up" | "down") => void;

  // --- TTS 設定 ---
  setTts: (patch: Partial<TtsSettings>) => void;

  /** 初期テンプレートに戻す（デモ用） */
  resetToTemplate: () => void;
}

function reorder<T extends { order: number }>(items: T[]): T[] {
  return items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item, idx) => ({ ...item, order: idx }));
}

function move<T extends { id: string; order: number }>(
  items: T[],
  id: string,
  direction: "up" | "down",
): T[] {
  const sorted = reorder(items);
  const idx = sorted.findIndex((i) => i.id === id);
  if (idx < 0) return items;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return items;
  const next = sorted.slice();
  [next[idx].order, next[swapWith].order] = [
    next[swapWith].order,
    next[idx].order,
  ];
  return reorder(next);
}

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set, get) => ({
      categories: INITIAL_CATEGORIES,
      buttons: INITIAL_BUTTONS,
      tts: DEFAULT_TTS,

      addCategory: (draft) => {
        const maxOrder = get().categories.reduce(
          (m, c) => Math.max(m, c.order),
          -1,
        );
        const category: VoiceCategory = {
          ...draft,
          id: generateId(),
          order: maxOrder + 1,
        };
        set((s) => ({ categories: [...s.categories, category] }));
        return category;
      },

      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        })),

      removeCategory: (id) =>
        set((s) => ({
          categories: reorder(s.categories.filter((c) => c.id !== id)),
          // カテゴリに属するボタンも削除
          buttons: s.buttons.filter((b) => b.categoryId !== id),
        })),

      moveCategory: (id, direction) =>
        set((s) => ({ categories: move(s.categories, id, direction) })),

      addButton: (draft) => {
        const maxOrder = get()
          .buttons.filter((b) => b.categoryId === draft.categoryId)
          .reduce((m, b) => Math.max(m, b.order), -1);
        const button: VoiceButton = {
          ...draft,
          id: generateId(),
          order: maxOrder + 1,
        };
        set((s) => ({ buttons: [...s.buttons, button] }));
        return button;
      },

      updateButton: (id, patch) =>
        set((s) => ({
          buttons: s.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      removeButton: (id) =>
        set((s) => ({ buttons: s.buttons.filter((b) => b.id !== id) })),

      moveButton: (id, direction) =>
        set((s) => {
          const target = s.buttons.find((b) => b.id === id);
          if (!target) return s;
          const sameCategory = s.buttons.filter(
            (b) => b.categoryId === target.categoryId,
          );
          const others = s.buttons.filter(
            (b) => b.categoryId !== target.categoryId,
          );
          return { buttons: [...others, ...move(sameCategory, id, direction)] };
        }),

      setTts: (patch) => set((s) => ({ tts: { ...s.tts, ...patch } })),

      resetToTemplate: () =>
        set({
          categories: INITIAL_CATEGORIES,
          buttons: INITIAL_BUTTONS,
          tts: DEFAULT_TTS,
        }),
    }),
    {
      name: "yorisoi.voice",
      storage: createJSONStorage(() => platformStateStorage),
    },
  ),
);
