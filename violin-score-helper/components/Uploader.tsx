"use client";

/** 楽譜画像アップロード（§4.1）。1ページ単位。撮影/スキャン画像。 */

import { useRef } from "react";

interface Props {
  onSelect: (file: File, width: number, height: number, objectUrl: string) => void;
  loading: boolean;
}

export default function Uploader({ onSelect, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => onSelect(file, img.naturalWidth, img.naturalHeight, url);
    img.src = url;
  }

  return (
    <div
      onClick={() => !loading && inputRef.current?.click()}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-6 py-10 text-center transition hover:border-neutral-400"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <span className="text-3xl">🎻</span>
      <p className="font-semibold">{loading ? "解析中…" : "楽譜画像をアップロード"}</p>
      <p className="text-xs text-neutral-500">
        スマホ撮影 / スキャン画像（JPEG・PNG）を1ページ選んでください
      </p>
    </div>
  );
}
