"use client";

/** OMR 解析結果のデバッグ JSON ビュー（§2）。折りたたみで隠せる。 */

import { useState } from "react";
import type { ScoreAnalysis } from "@/types/score";

export default function DebugJson({
  analysis,
  rawXml,
}: {
  analysis: ScoreAnalysis;
  rawXml?: string | null;
}) {
  const [open, setOpen] = useState(false);

  // 認識結果(MusicXML)をファイルとして保存する（座標較正のためのデバッグ用）
  function downloadXml() {
    if (!rawXml) return;
    const blob = new Blob([rawXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recognition.musicxml";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

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
        <div className="border-t border-neutral-200">
          {rawXml && (
            <div className="border-b border-neutral-200 p-3">
              <button
                onClick={downloadXml}
                className="rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100"
              >
                ⬇ MusicXMLをダウンロード（座標較正用）
              </button>
              <p className="mt-1 text-[11px] text-neutral-500">
                認識結果の生データです。色ズレの調整に使います。
              </p>
            </div>
          )}
          <pre className="max-h-72 overflow-auto bg-neutral-50 p-3 text-[11px] leading-tight">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
