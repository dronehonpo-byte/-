"use client";
/**
 * トースト通知ストア（永続化なし）。
 *
 * 家族モードの「自宅離脱通知」「帰宅通知」ボタンなど、
 * Web では実際には動かない機能の動作イメージをトーストで見せるために使う。
 */
import { create } from "zustand";
import { generateId } from "@/lib/id";

export interface Toast {
  id: string;
  message: string;
  variant: "info" | "success" | "warning";
}

interface ToastStore {
  toasts: Toast[];
  show: (message: string, variant?: Toast["variant"]) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, variant = "info") => {
    const toast: Toast = { id: generateId(), message, variant };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    // 4 秒で自動消去
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
