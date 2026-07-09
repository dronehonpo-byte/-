"use client";

/** PNG / PDF 保存（§4.10）。スマホでもダウンロードが成立する。 */

import { useState } from "react";
import { exportPdf, exportPng } from "@/lib/exporter";

interface Props {
  targetRef: React.RefObject<HTMLDivElement>;
}

export default function SaveButtons({ targetRef }: Props) {
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(kind: "png" | "pdf") {
    if (!targetRef.current) return;
    setBusy(kind);
    setErr(null);
    try {
      if (kind === "png") await exportPng(targetRef.current);
      else await exportPdf(targetRef.current);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run("png")}
        disabled={busy !== null}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40"
      >
        {busy === "png" ? "保存中…" : "PNG保存"}
      </button>
      <button
        onClick={() => run("pdf")}
        disabled={busy !== null}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40"
      >
        {busy === "pdf" ? "保存中…" : "PDF保存"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
