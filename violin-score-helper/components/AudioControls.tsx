"use client";

/**
 * 練習音源＋テンポ調整（§4.9）
 * 読み取った音高列を Tone.js で簡易再生。テンポスライダー付き。
 * 「練習確認用」割り切り（強弱・アーティキュレーションは対象外）。
 * 鳴っている音符を onActiveNote で親に伝えハイライトさせる。
 */

import { useEffect, useRef, useState } from "react";
import { TEMPO_DEFAULT_BPM, TEMPO_MAX_BPM, TEMPO_MIN_BPM } from "@/lib/constants";
import type { Note } from "@/types/score";

interface Props {
  notes: Note[];
  onActiveNote?: (noteId: string | null) => void;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function AudioControls({ notes, onActiveNote }: Props) {
  const [bpm, setBpm] = useState(TEMPO_DEFAULT_BPM);
  const [playing, setPlaying] = useState(false);
  const synthRef = useRef<import("tone").Synth | null>(null);
  const partRef = useRef<import("tone").Part | null>(null);

  useEffect(() => {
    return () => {
      partRef.current?.dispose();
      synthRef.current?.dispose();
    };
  }, []);

  async function play() {
    const Tone = await import("tone");
    await Tone.start();

    partRef.current?.dispose();
    synthRef.current?.dispose();

    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.2 },
    }).toDestination();
    synthRef.current = synth;

    Tone.Transport.bpm.value = bpm;
    const beat = 60 / bpm; // 1音を四分音符相当で並べる簡易割り当て
    const events = notes.map((n, i) => ({ time: i * beat, note: n }));

    const part = new Tone.Part((time, ev: { note: Note }) => {
      const freq = midiToFreq(ev.note.midi);
      synth.triggerAttackRelease(freq, beat * 0.9, time);
      Tone.Draw.schedule(() => onActiveNote?.(ev.note.id), time);
    }, events);
    part.start(0);
    partRef.current = part;

    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.start();
    setPlaying(true);

    const total = notes.length * beat + 0.5;
    Tone.Transport.scheduleOnce(() => stop(), total);
  }

  async function stop() {
    const Tone = await import("tone");
    Tone.Transport.stop();
    Tone.Transport.cancel();
    partRef.current?.dispose();
    partRef.current = null;
    setPlaying(false);
    onActiveNote?.(null);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (playing ? stop() : play())}
          disabled={notes.length === 0}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {playing ? "■ 停止" : "▶ 再生"}
        </button>
        <div className="flex flex-1 items-center gap-2">
          <span className="whitespace-nowrap text-xs text-neutral-500">テンポ {bpm}</span>
          <input
            type="range"
            min={TEMPO_MIN_BPM}
            max={TEMPO_MAX_BPM}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="flex-1"
            aria-label="テンポ"
          />
        </div>
      </div>
      <p className="text-[11px] text-neutral-400">
        ※ 練習確認用の簡易音源です（読み取り精度に依存）。
      </p>
    </div>
  );
}
