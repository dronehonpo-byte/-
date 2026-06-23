"use client";

import type {
  Finger,
  FingeringSide,
  Note,
  NoteEdit,
  ViolinString,
} from "@/types/score";
import { STRING_COLORS } from "@/lib/colors";

interface Props {
  note: Note;
  edit: NoteEdit;
  // 実際に表示されている値（編集 > 解析結果）
  current: {
    string: ViolinString | null;
    finger: Finger | null;
    side: FingeringSide;
    halfStep: boolean;
  };
  onChange: (patch: NoteEdit) => void;
  onReset: () => void;
  onClose: () => void;
}

const STRINGS: ViolinString[] = ["G", "D", "A", "E"];
const FINGERS: Finger[] = [0, 1, 2, 3, 4];

export default function ManualEditor({
  note,
  current,
  onChange,
  onReset,
  onClose,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">
          音符を修正{" "}
          <span className="text-sm font-normal text-slate-400">
            ({note.pitch} / {note.measure}小節)
          </span>
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      {/* 弦の変更 */}
      <div className="mb-3">
        <div className="mb-1 text-xs font-semibold text-slate-500">弦</div>
        <div className="flex gap-2">
          {STRINGS.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ string: s })}
              className={`h-10 w-10 rounded-full border-2 font-bold text-white ${
                current.string === s ? "ring-2 ring-offset-2 ring-blue-500" : ""
              }`}
              style={{ backgroundColor: STRING_COLORS[s], borderColor: STRING_COLORS[s] }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 指番号の変更 */}
      <div className="mb-3">
        <div className="mb-1 text-xs font-semibold text-slate-500">指番号</div>
        <div className="flex gap-2">
          {FINGERS.map((f) => (
            <button
              key={f}
              onClick={() => onChange({ finger: f })}
              className={`h-10 w-10 rounded-lg border font-bold ${
                current.finger === f
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* 半音マーク ON/OFF */}
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-500">半音マーク</div>
          <button
            onClick={() => onChange({ halfStep: !current.halfStep })}
            className={`rounded-lg border px-4 py-2 font-medium ${
              current.halfStep
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {current.halfStep ? "ON" : "OFF"}
          </button>
        </div>

        {/* 上下切り替え */}
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-500">指番号の位置</div>
          <div className="inline-flex rounded-lg border border-slate-300">
            <button
              onClick={() => onChange({ side: "above" })}
              className={`rounded-l-lg px-3 py-2 text-sm font-medium ${
                current.side === "above"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              上
            </button>
            <button
              onClick={() => onChange({ side: "below" })}
              className={`rounded-r-lg px-3 py-2 text-sm font-medium ${
                current.side === "below"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              下
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="mt-4 text-sm text-slate-400 underline hover:text-slate-600"
      >
        この音符の修正をリセット
      </button>
    </div>
  );
}
