"use client";

/** OMR 解析結果のデバッグ JSON ビュー（§2）。折りたたみで隠せる。 */

import { useState } from "react";
import type { ScoreAnalysis } from "@/types/score";

export default function DebugJson({ analysis }: { analysis: ScoreAnalysis }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
      >
        <span>デバッグ：解析JSON（{analysis.notes.length}音符）</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <pre className="max-h-72 overflow-auto border-t border-neutral-200 bg-neutral-50 p-3 text-[11px] leading-tight">
          {JSON.stringify(analysis, null, 2)}
        </pre>
      )}
    </div>
  );
}
