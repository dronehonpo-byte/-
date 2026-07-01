"use client";

import { useState, type RefObject } from "react";

interface Props {
  targetRef: RefObject<HTMLDivElement | null>;
}

async function captureCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;
  return html2canvas(el, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });
}

export default function ExportButtons({ targetRef }: Props) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  async function savePng() {
    if (!targetRef.current) return;
    setBusy("png");
    try {
      const canvas = await captureCanvas(targetRef.current);
      const link = document.createElement("a");
      link.download = `violin-score-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
      alert("画像の保存に失敗しました。");
    } finally {
      setBusy(null);
    }
  }

  async function savePdf() {
    if (!targetRef.current) return;
    setBusy("pdf");
    try {
      const canvas = await captureCanvas(targetRef.current);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        (pageW - w) / 2,
        margin,
        w,
        h
      );
      pdf.save(`violin-score-${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      alert("PDF の保存に失敗しました。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={savePng}
        disabled={busy !== null}
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {busy === "png" ? "保存中..." : "🖼 PNG保存"}
      </button>
      <button
        onClick={savePdf}
        disabled={busy !== null}
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {busy === "pdf" ? "保存中..." : "📄 PDF保存"}
      </button>
    </div>
  );
}
