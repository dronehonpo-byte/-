"use client";

import type { DisplayMode } from "@/types/score";

const OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: "color", label: "弦色のみ" },
  { value: "color+finger", label: "＋指番号" },
  { value: "color+finger+halfstep", label: "＋半音マーク" },
];

export default function DisplayModeToggle({
  value,
  onChange,
}: {
  value: DisplayMode;
  onChange: (m: DisplayMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === o.value
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
