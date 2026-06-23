"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ScoreCanvas from "@/components/ScoreCanvas";
import DisplayModeToggle from "@/components/DisplayModeToggle";
import ManualEditor from "@/components/ManualEditor";
import AudioPlayer from "@/components/AudioPlayer";
import ExportButtons from "@/components/ExportButtons";
import { loadDocument, loadEdits, saveEdits } from "@/lib/storage";
import { applyFingeringRules } from "@/lib/fingeringRules";
import { computeOverlay } from "@/lib/overlay";
import { detectHalfSteps } from "@/lib/halfStepDetector";
import { estimateBpm } from "@/lib/audioGenerator";
import type {
  DisplayMode,
  NoteEdit,
  NoteEdits,
  ScoreDocument,
} from "@/types/score";

export default function ResultPage() {
  const [doc, setDoc] = useState<ScoreDocument | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [edits, setEdits] = useState<NoteEdits>({});
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    "color+finger+halfstep"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = loadDocument();
    setDoc(d);
    if (d) setEdits(loadEdits(d.id));
    setLoaded(true);
  }, []);

  // ルール適用済みの解析結果
  const ruledAnalysis = useMemo(() => {
    if (!doc) return null;
    return {
      ...doc.analysis,
      notes: applyFingeringRules(doc.analysis.notes, doc.mode),
    };
  }, [doc]);

  const overlay = useMemo(() => {
    if (!ruledAnalysis) return [];
    return computeOverlay(ruledAnalysis, edits);
  }, [ruledAnalysis, edits]);

  const autoHalfSteps = useMemo(() => {
    if (!ruledAnalysis) return {};
    return detectHalfSteps(ruledAnalysis.notes);
  }, [ruledAnalysis]);

  function updateEdit(id: string, patch: NoteEdit) {
    setEdits((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      if (doc) saveEdits(doc.id, next);
      return next;
    });
  }

  function resetEdit(id: string) {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      if (doc) saveEdits(doc.id, next);
      return next;
    });
  }

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </main>
    );
  }

  if (!doc || !ruledAnalysis) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-slate-600">
          表示する楽譜がありません。まずは楽譜をアップロードしてください。
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white"
        >
          アップロード画面へ
        </Link>
      </main>
    );
  }

  const selectedNote = selectedId
    ? ruledAnalysis.notes.find((n) => n.id === selectedId)
    : null;
  const selectedOverlay = selectedId
    ? overlay.find((o) => o.id === selectedId)
    : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← 別の楽譜を読み込む
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <DisplayModeToggle value={displayMode} onChange={setDisplayMode} />
          <ExportButtons targetRef={captureRef} />
        </div>
      </div>

      {/* 解析情報 */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
        {ruledAnalysis.key_signature && (
          <span>調号: {ruledAnalysis.key_signature}</span>
        )}
        {ruledAnalysis.time_signature && (
          <span>拍子: {ruledAnalysis.time_signature}</span>
        )}
        {ruledAnalysis.tempo_marking && (
          <span>速度: {ruledAnalysis.tempo_marking}</span>
        )}
        <span>音符数: {ruledAnalysis.notes.length}</span>
        <span>
          モード: {doc.mode === "B" ? "開放弦優先" : "おまかせ"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* 楽譜表示 */}
        <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <ScoreCanvas
            ref={captureRef}
            imageDataUrl={doc.imageDataUrl}
            width={doc.imageWidth}
            height={doc.imageHeight}
            overlay={overlay}
            displayMode={displayMode}
            selectedId={selectedId}
            playingId={playingId}
            onSelectNote={setSelectedId}
          />
          <p className="mt-2 text-center text-xs text-slate-400">
            音符をタップすると弦・指番号を修正できます
          </p>
        </div>

        {/* サイドパネル（PCではサイド、スマホでは下） */}
        <div className="space-y-4">
          {selectedNote && selectedOverlay ? (
            <ManualEditor
              note={selectedNote}
              edit={edits[selectedNote.id] ?? {}}
              current={{
                string: selectedOverlay.string,
                finger: selectedOverlay.finger,
                side: selectedOverlay.side,
                halfStep:
                  edits[selectedNote.id]?.halfStep ??
                  autoHalfSteps[selectedNote.id] ??
                  false,
              }}
              onChange={(patch) => updateEdit(selectedNote.id, patch)}
              onReset={() => resetEdit(selectedNote.id)}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
              音符をタップして修正
            </div>
          )}

          <AudioPlayer
            analysis={ruledAnalysis}
            defaultBpm={estimateBpm(ruledAnalysis.tempo_marking)}
            onPlayingChange={setPlayingId}
          />

          {/* 凡例 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <h3 className="mb-2 font-semibold">弦色の凡例</h3>
            <ul className="space-y-1">
              <li>
                <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: "#8B4513" }} />
                G線（茶）
              </li>
              <li>
                <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: "#228B22" }} />
                D線（緑）
              </li>
              <li>
                <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: "#E05C5C" }} />
                A線（ピンク）
              </li>
              <li>
                <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: "#FFD700" }} />
                E線（黄）
              </li>
              <li className="pt-1 text-halfstep" style={{ color: "#1E90FF" }}>
                ^ / v … 半音マーク
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
