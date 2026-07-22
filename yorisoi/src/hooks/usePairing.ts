"use client";
/**
 * QR ペアリングロジック（擬似実装）。
 *
 * ペアリング ID は UUID を localStorage に保存するだけ。
 * QR 生成は qrcode.react、読み取りは html5-qrcode を UI 側で使う。
 */
import { useCallback } from "react";
import { useUserStore } from "@/stores/userStore";

export function usePairing() {
  const pairing = useUserStore((s) => s.pairing);
  const issuePairing = useUserStore((s) => s.issuePairing);
  const completePairing = useUserStore((s) => s.completePairing);
  const resetPairing = useUserStore((s) => s.resetPairing);

  /** QR に埋め込むペイロード文字列 */
  const buildPayload = useCallback((id: string): string => {
    return `yorisoi://pair/${id}`;
  }, []);

  /** 読み取った文字列からペアリング ID を取り出す */
  const parsePayload = useCallback((raw: string): string | null => {
    const trimmed = raw.trim();
    const prefix = "yorisoi://pair/";
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
    // 生の UUID を直接渡された場合も許容
    if (/^[0-9a-fA-F-]{8,}$/.test(trimmed)) return trimmed;
    return null;
  }, []);

  return {
    pairing,
    issuePairing,
    completePairing,
    resetPairing,
    buildPayload,
    parsePayload,
  };
}
