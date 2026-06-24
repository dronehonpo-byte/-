"use client";

import { useState } from "react";
import Link from "next/link";
import EngravedScore from "@/components/EngravedScore";
import { SONGS } from "@/lib/songs";
import {
  STRING_COLORS,
  HALF_STEP_TOUCH_COLOR,
  HALF_STEP_OPEN_COLOR,
} from "@/lib/colors";
import type { ViolinString } from "@/types/score";

const LEGEND: { string: ViolinString; label: string }[] = [
  { string: "E", label: "E線" },
  { string: "A", label: "A線" },
  { string: "D", label: "D線" },
  { string: "G", label: "G線" },
];

export default function SongsPage() {
  const [songId, setSongId] = useState(SONGS[0].id);
  const [showFinger, setShowFinger] = useState(true);
  const [showHalfStep, setShowHalfStep] = useState(true);

  const song = SONGS.find((s) => s.id === songId) ?? SONGS[0];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="mb-1 text-2xl font-bold sm:text-3xl">🎻 曲を選んで色付き楽譜</h1>
        <p className="text-sm text-slate-600">
          曲を選ぶだけで、弦の色・指番号・半音マークを自動表示します（写真もAIも不要）
        </p>
      </header>

      {/* 曲選択 */}
      <section className="mb-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">曲をえらぶ</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SONGS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSongId(s.id)}
              className={`rounded-xl border-2 p-3 text-left transition ${
                s.id === songId
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="font-semibold">{s.title}</div>
              {s.subtitle && (
                <div className="text-xs text-slate-500">{s.subtitle}</div>
              )}
              {s.composer && (
                <div className="text-xs text-slate-400">{s.composer}</div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* 凡例 + 表示トグル */}
      <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND.map((l) => (
            <div key={l.string} className="flex items-center gap-1.5">
              <span
                className="inline-block h-4 w-4 rounded-full"
                style={{ backgroundColor: STRING_COLORS[l.string], opacity: 0.65 }}
              />
              <span className="text-xs text-slate-600">{l.label}</span>
            </div>
          ))}
          <span className="mx-1 text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-4 rounded"
              style={{ backgroundColor: HALF_STEP_TOUCH_COLOR }}
            />
            <span className="text-xs text-slate-600">半音(指くっつく)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-4 rounded"
              style={{ backgroundColor: HALF_STEP_OPEN_COLOR }}
            />
            <span className="text-xs text-slate-600">半音(開放弦)</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showFinger}
              onChange={(e) => setShowFinger(e.target.checked)}
            />
            指番号
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showHalfStep}
              onChange={(e) => setShowHalfStep(e.target.checked)}
            />
            半音マーク
          </label>
        </div>
      </section>

      {/* 楽譜 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-4">
        <EngravedScore
          song={song}
          showFinger={showFinger}
          showHalfStep={showHalfStep}
        />
      </section>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-slate-400 underline">
          ← 写真から作るモードへ
        </Link>
      </div>
    </main>
  );
}
