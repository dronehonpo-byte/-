"use client";

import { forwardRef } from "react";
import NoteOverlay from "./NoteOverlay";
import type { DisplayMode, OverlayNote } from "@/types/score";

interface Props {
  imageDataUrl: string;
  width: number;
  height: number;
  overlay: OverlayNote[];
  displayMode: DisplayMode;
  selectedId?: string | null;
  playingId?: string | null;
  onSelectNote?: (id: string) => void;
}

/**
 * 元の楽譜画像（オーバーレイ方式：描き直さず重ねる）。
 * 保存機能のため ref を外に公開する。
 */
const ScoreCanvas = forwardRef<HTMLDivElement, Props>(function ScoreCanvas(
  {
    imageDataUrl,
    width,
    height,
    overlay,
    displayMode,
    selectedId,
    playingId,
    onSelectNote,
  },
  ref
) {
  return (
    <div
      ref={ref}
      className="relative mx-auto w-full bg-white"
      style={{ aspectRatio: `${width} / ${height}`, maxWidth: width }}
    >
      {/* 元楽譜（印刷内容はそのまま残す） */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageDataUrl}
        alt="楽譜"
        className="absolute inset-0 h-full w-full select-none"
        draggable={false}
      />
      <NoteOverlay
        overlay={overlay}
        width={width}
        height={height}
        displayMode={displayMode}
        selectedId={selectedId}
        playingId={playingId}
        onSelectNote={onSelectNote}
      />
    </div>
  );
});

export default ScoreCanvas;
