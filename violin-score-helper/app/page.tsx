"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Uploader from "@/components/Uploader";
import ScoreOverlay from "@/components/ScoreOverlay";
import Controls from "@/components/Controls";
import EditPopover from "@/components/EditPopover";
import AudioControls from "@/components/AudioControls";
import SaveButtons from "@/components/SaveButtons";
import Tutorial from "@/components/Tutorial";
import DebugJson from "@/components/DebugJson";
import { analyze, applyManualEdit } from "@/lib/pipeline";
import type { FingeringMode, Note, ScoreAnalysis } from "@/types/score";
import type { ViolinString } from "@/lib/constants";
import { STRING_COLOR, ViolinString as VS } from "@/lib/constants";

const TUTORIAL_KEY = "violin-helper-tutorial-seen";

export default function Home() {
  const [rawAnalysis, setRawAnalysis] = useState<ScoreAnalysis | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<FingeringMode>("auto");
  const [showCyan, setShowCyan] = useState(true);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem(TUTORIAL_KEY)) setShowTutorial(true);
  }, []);

  // 運指モード・生解析が変わったら弦判定を再計算
  const analysis = useMemo(
    () => (rawAnalysis ? analyze(rawAnalysis, { mode }) : null),
    [rawAnalysis, mode],
  );

  async function handleUpload(file: File, width: number, height: number, objectUrl: string) {
    setLoading(true);
    setError(null);
    setImageUrl(objectUrl);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("width", String(width));
      fd.append("height", String(height));
      const res = await fetch("/api/omr", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "解析に失敗しました");
      setRawAnalysis(data as ScoreAnalysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(patch: { string?: ViolinString; finger?: 0 | 1 | 2 | 3 | 4 }) {
    if (!analysis || !editing) return;
    const updated = applyManualEdit(analysis, editing.id, patch, { mode });
    setRawAnalysis(updated); // 修正結果を新しい生データとして保持
    const next = updated.notes.find((n) => n.id === editing.id) ?? null;
    setEditing(next);
  }

  function closeTutorial() {
    localStorage.setItem(TUTORIAL_KEY, "1");
    setShowTutorial(false);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">バイオリン楽譜ヘルパー</h1>
          <p className="text-xs text-neutral-500">弦色分け・指番号・半音マーク＋練習音源</p>
        </div>
        <button
          onClick={() => setShowTutorial(true)}
          className="rounded-full border border-neutral-300 px-3 py-1 text-sm"
        >
          ？使い方
        </button>
      </header>

      <StringLegend />

      <Uploader onSelect={handleUpload} loading={loading} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {analysis && imageUrl && (
        <>
          <Controls
            mode={mode}
            onModeChange={setMode}
            showCyan={showCyan}
            onShowCyanChange={setShowCyan}
          />

          <div ref={overlayRef} className="overflow-hidden rounded-lg border border-neutral-200">
            <ScoreOverlay
              imageUrl={imageUrl}
              analysis={analysis}
              showCyan={showCyan}
              activeNoteId={activeNoteId}
              onNoteClick={(n) => {
                setActiveNoteId(n.id);
                setEditing(n);
              }}
            />
          </div>

          <AudioControls notes={analysis.notes} onActiveNote={setActiveNoteId} />

          <div className="flex items-center justify-between">
            <SaveButtons targetRef={overlayRef} />
          </div>

          <DebugJson analysis={analysis} />
        </>
      )}

      {editing && (
        <EditPopover
          note={editing}
          onChange={handleEdit}
          onClose={() => {
            setEditing(null);
            setActiveNoteId(null);
          }}
        />
      )}

      {showTutorial && <Tutorial onClose={closeTutorial} />}
    </main>
  );
}

/** 弦の色 凡例（弦名文字は楽譜には出さないが、凡例としては表示可） */
function StringLegend() {
  const rows: { s: ViolinString; label: string }[] = [
    { s: VS.G, label: "G線" },
    { s: VS.D, label: "D線" },
    { s: VS.A, label: "A線" },
    { s: VS.E, label: "E線" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((r) => (
        <span key={r.s} className="flex items-center gap-1 text-xs">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: STRING_COLOR[r.s] }}
          />
          {r.label}
        </span>
      ))}
    </div>
  );
}
