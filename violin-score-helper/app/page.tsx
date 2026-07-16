"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Uploader, { type UploadPayload } from "@/components/Uploader";
import ScoreOverlay from "@/components/ScoreOverlay";
import Controls from "@/components/Controls";
import EditPopover from "@/components/EditPopover";
import AudioControls from "@/components/AudioControls";
import SaveButtons from "@/components/SaveButtons";
import Tutorial from "@/components/Tutorial";
import DebugJson from "@/components/DebugJson";
import { analyze, applyManualEdit } from "@/lib/pipeline";
import { parseMusicXml } from "@/lib/musicXml";
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
  const [warning, setWarning] = useState<string | null>(null);
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

  async function handleUpload(payload: UploadPayload) {
    setLoading(true);
    setError(null);
    // スキャン品質の警告（撮影写真の疑い等）は解析を止めずに表示
    setWarning(payload.warnings.length ? payload.warnings.join(" ") : null);
    // 画像はローカルプレビュー、PDF は認識後にサービス画像へ差し替え
    setImageUrl(payload.objectUrl);
    try {
      // 認識サービスのURLを取得（サーバー側 env OMR_SERVICE_URL を返すだけの軽いAPI）
      const cfg = await fetch("/api/omr-url").then((r) => r.json());
      if (!cfg?.url) throw new Error(cfg?.error || "認識サービスURLの取得に失敗しました。");

      // ★ブラウザから認識サービスへ直接送る（Vercelの60秒制限を回避。重い認識も待てる）
      const fd = new FormData();
      fd.append("file", payload.file, payload.file.name || "score");
      const res = await fetch(`${cfg.url}/omr`, { method: "POST", body: fd });
      const raw = await res.text();
      let data: {
        musicXml?: string;
        width?: number;
        height?: number;
        pageImage?: string;
        error?: string;
      };
      try {
        data = JSON.parse(raw);
      } catch {
        const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 160);
        throw new Error(`認識サービスの応答が不正です（HTTP ${res.status}）: ${snippet || "(空)"}`);
      }
      if (!res.ok) throw new Error(data.error || `認識に失敗しました（HTTP ${res.status}）`);
      if (!data.musicXml) throw new Error("MusicXML が返りませんでした。");

      // MusicXML → 音符データへ変換（ブラウザ内・純関数）
      const imageWidth = data.width || payload.width || 0;
      const imageHeight = data.height || payload.height || 0;
      const analysis = parseMusicXml(data.musicXml, { imageWidth, imageHeight });
      if (analysis.notes.length === 0) {
        throw new Error("音符を検出できませんでした。スキャン品質（傾き・影・解像度）をご確認ください。");
      }
      // サービスがページ画像を返した場合（主にPDF）はそれを背景に使う
      if (typeof data.pageImage === "string" && data.pageImage) {
        setImageUrl(data.pageImage);
      }
      setRawAnalysis(analysis);
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

      {warning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠️ {warning}
          <br />
          スキャンデータ（傾きなし・白背景・影なし・300dpi以上）でのご利用を推奨します。表示された結果は手動修正できます。
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
