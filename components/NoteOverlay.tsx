"use client";

import type { DisplayMode, OverlayNote } from "@/types/score";
import {
  HALF_STEP_TOUCH_COLOR,
  HALF_STEP_OPEN_COLOR,
  STRING_COLORS,
  stringColorWithAlpha,
} from "@/lib/colors";

interface Props {
  overlay: OverlayNote[];
  width: number; // 自然サイズ（座標系）
  height: number;
  displayMode: DisplayMode;
  selectedId?: string | null;
  playingId?: string | null;
  onSelectNote?: (id: string) => void;
}

const NOTEHEAD_RADIUS = 11;

/** 音符に弦色・指番号・半音マークを重ねる SVG オーバーレイ */
export default function NoteOverlay({
  overlay,
  width,
  height,
  displayMode,
  selectedId,
  playingId,
  onSelectNote,
}: Props) {
  const showFinger = displayMode !== "color";
  const showHalfStep = displayMode === "color+finger+halfstep";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: onSelectNote ? "auto" : "none" }}
    >
      {overlay.map((n) => {
        const isSelected = selectedId === n.id;
        const isPlaying = playingId === n.id;
        return (
          <g
            key={n.id}
            style={{ cursor: onSelectNote ? "pointer" : "default" }}
            onClick={() => onSelectNote?.(n.id)}
          >
            {/* 符頭の弦色（半透明の塗り） */}
            {n.string && (
              <circle
                cx={n.noteheadX}
                cy={n.noteheadY}
                r={NOTEHEAD_RADIUS}
                fill={stringColorWithAlpha(n.string, 0.65)}
                stroke={STRING_COLORS[n.string]}
                strokeWidth={isSelected ? 2.5 : 1}
              />
            )}

            {/* 再生中ハイライト（黄色の縁取り） */}
            {isPlaying && (
              <circle
                cx={n.noteheadX}
                cy={n.noteheadY}
                r={NOTEHEAD_RADIUS + 4}
                fill="none"
                stroke="#FACC15"
                strokeWidth={3}
              />
            )}

            {/* 選択中の枠 */}
            {isSelected && (
              <circle
                cx={n.noteheadX}
                cy={n.noteheadY}
                r={NOTEHEAD_RADIUS + 6}
                fill="none"
                stroke="#2563EB"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            )}

            {/* 指番号 */}
            {showFinger && n.finger !== null && (
              <text
                x={n.labelX}
                y={n.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={16}
                fontWeight={700}
                fill="#111827"
                style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}
              >
                {n.finger}
              </text>
            )}

            {/* 半音マーク ^ / v */}
            {showHalfStep && n.halfStepMark && (
              <text
                x={n.halfStepX}
                y={n.halfStepY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={18}
                fontWeight={700}
                fill={n.halfStepAttached ? HALF_STEP_TOUCH_COLOR : HALF_STEP_OPEN_COLOR}
                style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 2.5 }}
              >
                {n.halfStepMark}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
