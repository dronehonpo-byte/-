"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "@/types/score";
import { buildSchedule } from "@/lib/audioGenerator";

interface Props {
  analysis: AnalysisResult;
  defaultBpm: number;
  onPlayingChange: (id: string | null) => void;
}

type ToneModule = typeof import("tone");

export default function AudioPlayer({
  analysis,
  defaultBpm,
  onPlayingChange,
}: Props) {
  const [bpm, setBpm] = useState(defaultBpm);
  const [state, setState] = useState<"stopped" | "playing" | "paused">(
    "stopped"
  );

  const toneRef = useRef<ToneModule | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synthRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      // アンマウント時にクリーンアップ
      const Tone = toneRef.current;
      if (Tone) {
        Tone.getTransport().stop();
        Tone.getTransport().cancel();
      }
      synthRef.current?.dispose?.();
      onPlayingChange(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureTone(): Promise<ToneModule> {
    if (!toneRef.current) {
      toneRef.current = await import("tone");
    }
    const Tone = toneRef.current;
    await Tone.start();
    if (!synthRef.current) {
      // バイオリン風のシンセ音
      synthRef.current = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 8,
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.4 },
        volume: -8,
      }).toDestination();
    }
    return Tone;
  }

  async function play() {
    const Tone = await ensureTone();
    const transport = Tone.getTransport();

    if (state === "paused") {
      transport.start();
      setState("playing");
      return;
    }

    // 最初から再生
    transport.stop();
    transport.cancel();

    const schedule = buildSchedule(analysis, bpm);
    if (schedule.length === 0) return;

    let end = 0;
    for (const ev of schedule) {
      end = Math.max(end, ev.time + ev.durationSec);
      transport.scheduleOnce((time) => {
        synthRef.current?.triggerAttackRelease(
          ev.noteName,
          ev.durationSec,
          time
        );
        Tone.getDraw().schedule(() => onPlayingChange(ev.id), time);
      }, ev.time);
    }

    transport.scheduleOnce((time) => {
      Tone.getDraw().schedule(() => {
        onPlayingChange(null);
        setState("stopped");
      }, time);
    }, end + 0.1);

    transport.start();
    setState("playing");
  }

  function pause() {
    toneRef.current?.getTransport().pause();
    setState("paused");
  }

  function stop() {
    const Tone = toneRef.current;
    if (Tone) {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
    }
    onPlayingChange(null);
    setState("stopped");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold">🔊 音源再生</h3>

      <div className="mb-4 flex items-center gap-2">
        {state === "playing" ? (
          <button
            onClick={pause}
            className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
          >
            ⏸ 一時停止
          </button>
        ) : (
          <button
            onClick={play}
            className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
          >
            ▶ 再生
          </button>
        )}
        <button
          onClick={stop}
          className="rounded-lg bg-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-300"
        >
          ⏹ 停止
        </button>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-sm text-slate-600">
          <span>テンポ</span>
          <span className="font-mono font-semibold">{bpm} BPM</span>
        </div>
        <input
          type="range"
          min={40}
          max={200}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        ※ 練習確認用の簡易音源です（完璧な演奏音源ではありません）
      </p>
    </div>
  );
}
