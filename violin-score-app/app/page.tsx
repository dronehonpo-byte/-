"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Tutorial from "@/components/Tutorial";
import {
  hasSeenTutorial,
  markTutorialSeen,
  saveDocument,
} from "@/lib/storage";
import type { AnalysisMode, ScoreDocument } from "@/types/score";

const MAX_EDGE = 1600; // 送信画像の長辺上限(px)

/** File → 縮小済み dataURL と寸法 */
function fileToScaledImage(
  file: File
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () =>
        reject(new Error("画像を開けませんでした。別の画像をお試しください。"));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("画像の処理に失敗しました"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.92), width, height });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>("A");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasSeenTutorial()) setShowTutorial(true);
  }, []);

  async function handleFile(file: File) {
    setError(null);
    if (file.type === "application/pdf") {
      setError(
        "PDF は現在未対応です。お手数ですが、ページを画像（JPG / PNG）にしてからアップロードしてください。"
      );
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("画像ファイル（JPG / PNG）を選択してください。");
      return;
    }
    setLoading(true);
    try {
      const { dataUrl, width, height } = await fileToScaledImage(file);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl, width, height, mode }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "解析に失敗しました。もう一度お試しください。");
        setLoading(false);
        return;
      }
      const doc: ScoreDocument = {
        id: `doc_${Date.now()}`,
        imageDataUrl: dataUrl,
        imageWidth: width,
        imageHeight: height,
        mode,
        analysis: json.analysis,
        createdAt: Date.now(),
      };
      saveDocument(doc);
      router.push("/result");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "予期しないエラーが発生しました。もう一度お試しください。"
      );
      setLoading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function closeTutorial() {
    markTutorialSeen();
    setShowTutorial(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {showTutorial && <Tutorial onClose={closeTutorial} />}

      <header className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
          🎻 バイオリン楽譜ビューア
        </h1>
        <p className="text-slate-600">
          楽譜の写真をアップロードすると、弦色・指番号・半音マークを表示します
        </p>
      </header>

      {/* 解析モード選択 */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">解析モード</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => setMode("A")}
            className={`rounded-xl border-2 p-4 text-left transition ${
              mode === "A"
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="font-semibold">おまかせ</div>
            <div className="text-sm text-slate-500">初級〜中級・一般的な運指</div>
          </button>
          <button
            onClick={() => setMode("B")}
            className={`rounded-xl border-2 p-4 text-left transition ${
              mode === "B"
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="font-semibold">開放弦優先</div>
            <div className="text-sm text-slate-500">小指(第4指)を最小限に</div>
          </button>
        </div>
      </section>

      {/* ドロップゾーン */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
        }`}
      >
        <p className="mb-4 text-slate-500">
          ここに楽譜画像をドラッグ＆ドロップ
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 sm:w-auto"
          >
            画像を選択
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full rounded-lg bg-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-800 sm:w-auto"
          >
            📷 カメラで撮影
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <button
        onClick={() => setShowTutorial(true)}
        className="mt-6 block w-full text-center text-sm text-slate-400 underline"
      >
        使い方を見る
      </button>

      {/* ローディング */}
      {loading && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 font-semibold text-slate-700">楽譜を解析中...</p>
          <p className="mt-1 text-sm text-slate-500">
            読み取りに数十秒かかることがあります
          </p>
        </div>
      )}
    </main>
  );
}
