"use client";

import { useState } from "react";

const STEPS = [
  {
    emoji: "📷",
    title: "1. 楽譜を撮影・アップロード",
    body: "スマホで楽譜を撮影するか、画像ファイル（JPG / PNG）を選びます。明るい場所で、楽譜全体がまっすぐ写るようにすると精度が上がります。",
  },
  {
    emoji: "🎨",
    title: "2. 弦色・指番号が自動表示",
    body: "AI が楽譜を読み取り、音符に弦の色（G=茶・D=緑・A=ピンク・E=黄）と指番号、半音マークを重ねて表示します。",
  },
  {
    emoji: "✏️",
    title: "3. 手直し・再生・保存",
    body: "タップで弦や指番号を修正でき、音源を再生して確認できます。仕上がりは画像/PDF として保存できます。",
  },
];

export default function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 text-center text-5xl">{s.emoji}</div>
        <h2 className="mb-2 text-center text-xl font-bold">{s.title}</h2>
        <p className="mb-6 text-center text-slate-600">{s.body}</p>

        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${
                i === step ? "bg-blue-600" : "bg-slate-300"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-slate-500 hover:bg-slate-100"
          >
            スキップ
          </button>
          {isLast ? (
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
            >
              はじめる
            </button>
          ) : (
            <button
              onClick={() => setStep((p) => p + 1)}
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
            >
              次へ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
