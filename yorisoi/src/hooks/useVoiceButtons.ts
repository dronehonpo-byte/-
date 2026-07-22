"use client";
/**
 * 音声ボタンの登録・編集・並び替え・取得ロジック。
 *
 * voiceStore の薄いラッパ。UI コンポーネントはこのフックのみを見る。
 */
import { useMemo } from "react";
import { useVoiceStore } from "@/stores/voiceStore";
import type { VoiceButton, VoiceCategory } from "@/types/voice";

export function useVoiceButtons() {
  const categories = useVoiceStore((s) => s.categories);
  const buttons = useVoiceStore((s) => s.buttons);

  const addCategory = useVoiceStore((s) => s.addCategory);
  const updateCategory = useVoiceStore((s) => s.updateCategory);
  const removeCategory = useVoiceStore((s) => s.removeCategory);
  const moveCategory = useVoiceStore((s) => s.moveCategory);

  const addButton = useVoiceStore((s) => s.addButton);
  const updateButton = useVoiceStore((s) => s.updateButton);
  const removeButton = useVoiceStore((s) => s.removeButton);
  const moveButton = useVoiceStore((s) => s.moveButton);

  const resetToTemplate = useVoiceStore((s) => s.resetToTemplate);

  const sortedCategories = useMemo(
    () => categories.slice().sort((a, b) => a.order - b.order),
    [categories],
  );

  /** カテゴリ ID からカテゴリを取得 */
  const getCategory = (id: string): VoiceCategory | undefined =>
    categories.find((c) => c.id === id);

  /** カテゴリ内のボタンを並び順で取得 */
  const buttonsOf = (categoryId: string): VoiceButton[] =>
    buttons
      .filter((b) => b.categoryId === categoryId)
      .sort((a, b) => a.order - b.order);

  return {
    categories: sortedCategories,
    buttons,
    getCategory,
    buttonsOf,
    addCategory,
    updateCategory,
    removeCategory,
    moveCategory,
    addButton,
    updateButton,
    removeButton,
    moveButton,
    resetToTemplate,
  };
}
