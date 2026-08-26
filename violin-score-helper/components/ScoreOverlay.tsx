"use client";

/**
 * オーバーレイ描画（§4.3 / §4.6 / §4.7）
 * 元画像の上に SVG を viewBox=画像実寸 で重ね、座標ベースで
 *   ・弦色（蛍光マーカー風・乗算・半透明で符頭が透ける）
 *   ・指番号（上/下配置）
 *   ・半音マーク(^ / v・青/水色)
 * を描く。符頭タップで手動修正を起こす。
 */

import {
  SEMITONE_COLOR,
  STRING_COLOR,
  STRING_HIGHLIGHT_OPACITY,
  ViolinString,
} from "@/lib/constants";
import type { Note, ScoreAnalysis } from "@/types/score";

interface Props {
  imageUrl: string;
  analysis: ScoreAnalysis;
  showCyan: boolean;
  activeNoteId?: string | null;
  onNoteClick?: (note: Note) => void;
}

const FINGER_FONT = 34; // 指番号の目安フォント(px, 画像座標系)。定数化。

function fingerLabelPos(note: Note): { x: number; y: number } {
  const cx = note.bbox.x + note.bbox.w / 2;
  const gap = FINGER_FONT * 0.9;
  if (note.fingerLabelSide === "below") {
    return { x: cx, y: note.bbox.y + note.bbox.h + gap };
  }
  return { x: cx, y: note.bbox.y - gap * 0.4 };
}

export default function ScoreOverlay({
  imageUrl,
  analysis,
  showCyan,
  activeNoteId,
  onNoteClick,
}: Props) {
  const { imageWidth, imageHeight, notes } = analysis;

  return (
    <div className="relative inline-block w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="楽譜"
        className="block w-full h-auto select-none"
        draggable={false}
      />
      <svg
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {notes.map((note) => {
          const color = note.string ? STRING_COLOR[note.string as ViolinString] : "#999";
          const mark = note.semitoneMark;
          const showMark = mark && (mark.color === "blue" || (mark.color === "cyan" && showCyan));
          const markColor = mark ? SEMITONE_COLOR[mark.color] : undefined;
          const fp = fingerLabelPos(note);
          const isActive = activeNoteId === note.id;

          return (
            <g
              key={note.id}
              onClick={() => onNoteClick?.(note)}
              className="cursor-pointer"
              role="button"
              aria-label={`音符 ${note.pitch}${note.octave}`}
            >
              {/* 弦色ハイライト（蛍光マーカー風・乗算・半透明） */}
              <ellipse
                className="marker-highlight"
                cx={note.bbox.x + note.bbox.w / 2}
                cy={note.bbox.y + note.bbox.h / 2}
                rx={note.bbox.w * 0.72}
                ry={note.bbox.h * 0.62}
                fill={color}
                opacity={STRING_HIGHLIGHT_OPACITY}
              />

              {/* タップ領域（スマホでも押しやすいよう広め・透明） */}
              <rect
                x={note.bbox.x - note.bbox.w * 0.4}
                y={note.bbox.y - note.bbox.h * 0.4}
                width={note.bbox.w * 1.8}
                height={note.bbox.h * 1.8}
                fill="transparent"
              />

              {isActive && (
                <rect
                  x={note.bbox.x - note.bbox.w * 0.4}
                  y={note.bbox.y - note.bbox.h * 0.4}
                  width={note.bbox.w * 1.8}
                  height={note.bbox.h * 1.8}
                  fill="none"
                  stroke="#111"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              )}

              {/* 指番号 */}
              {note.finger !== undefined && (
                <text
                  x={fp.x}
                  y={fp.y}
                  fontSize={FINGER_FONT}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#111"
                  stroke="#fff"
                  strokeWidth={FINGER_FONT * 0.09}
                  paintOrder="stroke"
                >
                  {note.finger}
                </text>
              )}

              {/* 半音マーク（^ / v） */}
              {showMark && markColor && (
                <text
                  x={fp.x}
                  y={mark!.direction === "up" ? fp.y - FINGER_FONT * 0.72 : fp.y + FINGER_FONT * 0.72}
                  fontSize={FINGER_FONT * 0.85}
                  fontWeight={800}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={markColor}
                >
                  {mark!.direction === "up" ? "^" : "v"}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
