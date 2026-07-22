"use client";
/**
 * クライアントでのマウント完了を検知するフック。
 *
 * Zustand persist は localStorage から復元するため、
 * サーバー描画（初期状態）とクライアント描画（復元後）が食い違い、
 * ハイドレーション警告が出ることがある。
 * 永続化データに依存する表示は、このフラグが true になってから描画する。
 */
import { useEffect, useState } from "react";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
