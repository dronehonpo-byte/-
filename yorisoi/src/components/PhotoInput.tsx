"use client";
/**
 * 写真アップロード（Base64 で保持）。localStorage 保存前提。
 * 大きすぎる画像は縦横 512px に縮小してから Base64 化する。
 */
import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import styles from "./PhotoInput.module.css";

interface PhotoInputProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}

const MAX_EDGE = 512;

async function fileToResizedDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });

  // 縮小（canvas）。失敗したら元データを返す。
  try {
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("画像の解析に失敗しました"));
      img.src = dataUrl;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    if (scale >= 1) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return dataUrl;
  }
}

export function PhotoInput({ value, onChange }: PhotoInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      onChange(dataUrl);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {value ? (
        <span className={styles.preview}>
          <Image src={value} alt="選択した写真" fill sizes="120px" unoptimized />
        </span>
      ) : (
        <span className={styles.placeholder} aria-hidden>
          <ImagePlus size={40} />
        </span>
      )}

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.select}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? "処理中…" : value ? "写真を変える" : "写真を選ぶ"}
        </button>
        {value && (
          <button
            type="button"
            className={styles.remove}
            onClick={() => onChange(undefined)}
          >
            <Trash2 size={20} /> 削除
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hidden}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
