"use client";

/** 手動修正 UI（§4.8）。弦・指番号をタップで変更。スマホでも押しやすい大きめボタン。 */

import { STRING_COLOR, ViolinString } from "@/lib/constants";
import type { Note } from "@/types/score";

interface Props {
  note: Note;
  onChange: (patch: { string?: ViolinString; finger?: 0 | 1 | 2 | 3 | 4 }) => void;
  onClose: () => void;
}

const STRINGS: ViolinString[] = [
  ViolinString.G,
  ViolinString.D,
  ViolinString.A,
  ViolinString.E,
];
const FINGERS: (0 | 1 | 2 | 3 | 4)[] = [0, 1, 2, 3, 4];

export default function EditPopover({ note, onChange, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">
            {note.pitch}
            {note.octave} を修正
          </h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-neutral-500" aria-label="閉じる">
            ✕
          </button>
        </div>

        <p className="mb-1 text-xs font-medium text-neutral-500">弦</p>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {STRINGS.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ string: s })}
              className={`h-12 rounded-lg border-2 text-sm font-bold ${
                note.string === s ? "border-neutral-900" : "border-transparent"
              }`}
              style={{ backgroundColor: STRING_COLOR[s], color: "#fff" }}
            >
              {s}線
            </button>
          ))}
        </div>

        <p className="mb-1 text-xs font-medium text-neutral-500">指番号</p>
        <div className="grid grid-cols-5 gap-2">
          {FINGERS.map((f) => (
            <button
              key={f}
              onClick={() => onChange({ finger: f })}
              className={`h-12 rounded-lg border text-lg font-bold ${
                note.finger === f
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
