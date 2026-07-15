"use client";

/**
 * スキャンデータ アップロード（§4.1・スキャン専用版）。
 *
 * 本アプリはスキャンデータ専用（PDF / スキャナ由来の PNG・JPEG）。
 * スマホ撮影の写真は認識精度が安定しないため非対応（明記＋簡易警告）。
 * カメラ撮影オプションは提供しない。
 */

import { useRef } from "react";
import { assessScan, computePixelStats } from "@/lib/scanQuality";

export interface UploadPayload {
  file: File;
  /** PDF かどうか（プレビュー/寸法の扱いが画像と異なる） */
  isPdf: boolean;
  /** 画像のピクセル寸法（PDFは 0、サービス側で確定） */
  width: number;
  height: number;
  /** 画像プレビュー用 objectURL（PDFは null。認識後にサービス画像へ差し替え） */
  objectUrl: string | null;
  /** スキャン品質の警告（撮影写真の疑い等） */
  warnings: string[];
}

interface Props {
  onSelect: (payload: UploadPayload) => void;
  loading: boolean;
}

const ACCEPT = "application/pdf,image/png,image/jpeg";

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** 画像を縮小サンプリングしてスキャン品質を評価（撮影写真の疑いを検出） */
function assessImageFile(url: string): Promise<{ width: number; height: number; warnings: string[] }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      try {
        const maxEdge = 320;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve({ width, height, warnings: [] });
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const stats = computePixelStats(data, w, h);
        resolve({ width, height, warnings: assessScan(stats).warnings });
      } catch {
        resolve({ width, height, warnings: [] });
      }
    };
    img.onerror = () => resolve({ width: 0, height: 0, warnings: [] });
    img.src = url;
  });
}

export default function Uploader({ onSelect, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (isPdfFile(file)) {
      // PDF はサービス側でラスタライズ・寸法確定。ここでは警告判定しない（デジタル前提）。
      onSelect({ file, isPdf: true, width: 0, height: 0, objectUrl: null, warnings: [] });
      return;
    }
    const url = URL.createObjectURL(file);
    const { width, height, warnings } = await assessImageFile(url);
    onSelect({ file, isPdf: false, width, height, objectUrl: url, warnings });
  }

  return (
    <div
      onClick={() => !loading && inputRef.current?.click()}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-6 py-10 text-center transition hover:border-neutral-400"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <span className="text-3xl">🎻</span>
      <p className="font-semibold">{loading ? "解析中…" : "スキャンデータをアップロード"}</p>
      <p className="text-xs text-neutral-500">
        PDF・スキャナ画像（PNG・JPEG）を1ページ選んでください
      </p>
      <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-amber-700">
        ※スマホで撮影した写真は認識精度が安定しないため、スキャンデータ（PDF・スキャナ画像）のみ対応しています。
      </p>
    </div>
  );
}
