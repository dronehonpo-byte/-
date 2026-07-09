"use client";

/** 運指モード切替（§4.4）と半音マーク表示切替（§4.7） */

import type { FingeringMode } from "@/types/score";

interface Props {
  mode: FingeringMode;
  onModeChange: (m: FingeringMode) => void;
  showCyan: boolean;
  onShowCyanChange: (v: boolean) => void;
}

export default function Controls({ mode, onModeChange, showCyan, onShowCyanChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-sm">
        <span className="font-medium">運指モード</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as FingeringMode)}
          className="rounded border border-neutral-300 bg-white px-2 py-1"
        >
          <option value="auto">①おまかせ（初〜中級）</option>
          <option value="open-string-priority">②開放弦優先（小指を避ける）</option>
        </select>
      </label>

      <fieldset className="flex items-center gap-3 text-sm">
        <span className="font-medium">半音マーク</span>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="semitone"
            checked={!showCyan}
            onChange={() => onShowCyanChange(false)}
          />
          <span>青のみ</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="semitone"
            checked={showCyan}
            onChange={() => onShowCyanChange(true)}
          />
          <span>青＋水色</span>
        </label>
      </fieldset>
    </div>
  );
}
