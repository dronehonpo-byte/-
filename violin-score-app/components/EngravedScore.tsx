"use client";

import { useEffect, useRef, useState } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Beam,
  Accidental,
  Dot,
} from "vexflow";
import type { Song } from "@/lib/songs";
import {
  pitchToFingering,
  halfStepType,
  type Fingering,
  type HalfStepType,
} from "@/lib/firstPosition";
import {
  HALF_STEP_TOUCH_COLOR,
  HALF_STEP_OPEN_COLOR,
  stringColorWithAlpha,
} from "@/lib/colors";

interface Props {
  song: Song;
  showFinger: boolean;
  showHalfStep: boolean;
}

interface FlatNote {
  pitch: string;
  duration: string;
  fing: Fingering;
  half: HalfStepType; // 直前の音との半音の種類
}

const DUR_BEATS: Record<string, number> = {
  w: 4,
  h: 2,
  q: 1,
  "8": 0.5,
  "16": 0.25,
  "32": 0.125,
};

function durationBeats(d: string): number {
  const dotted = d.endsWith("d");
  const base = dotted ? d.slice(0, -1) : d;
  let b = DUR_BEATS[base] ?? 1;
  if (dotted) b *= 1.5;
  return b;
}

function pitchToVexKey(pitch: string): string {
  const m = pitch.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!m) return "b/4";
  return `${m[1].toLowerCase()}${m[2]}/${m[3]}`;
}

/** フラット音符列に運指と半音フラグを付与 */
function buildFlat(song: Song): FlatNote[] {
  const flat: FlatNote[] = song.notes.map((sn) => ({
    pitch: sn.pitch,
    duration: sn.duration,
    fing: sn.pitch === "r" ? { string: null, finger: null } : pitchToFingering(sn.pitch),
    half: null,
  }));
  for (let i = 1; i < flat.length; i++) {
    flat[i].half = halfStepType(
      { pitch: flat[i - 1].pitch, fing: flat[i - 1].fing },
      { pitch: flat[i].pitch, fing: flat[i].fing }
    );
  }
  return flat;
}

/** 拍数に従って小節へ分割 */
function chunkMeasures(flat: FlatNote[], beatsPerBar: number): FlatNote[][] {
  const measures: FlatNote[][] = [];
  let cur: FlatNote[] = [];
  let acc = 0;
  for (const note of flat) {
    cur.push(note);
    acc += durationBeats(note.duration);
    if (acc >= beatsPerBar - 1e-6) {
      measures.push(cur);
      cur = [];
      acc = 0;
    }
  }
  if (cur.length) measures.push(cur);
  return measures;
}

export default function EngravedScore({ song, showFinger, showHalfStep }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  // コンテナ幅に追従
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(320, el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";

    const [numer, denom] = song.timeSignature.split("/").map(Number);
    const beatsPerBar = (numer * 4) / denom;
    const flat = buildFlat(song);
    const measures = chunkMeasures(flat, beatsPerBar);

    // レイアウト
    const perRow = width < 560 ? 2 : width < 820 ? 3 : 4;
    const leftMargin = 8;
    const rightMargin = 8;
    const usableW = width - leftMargin - rightMargin;
    const staveW = usableW / perRow;
    const rowH = 130;
    const topMargin = 60; // 指番号・半音マーク用の余白
    const rows = Math.ceil(measures.length / perRow);
    const totalH = topMargin + rows * rowH + 20;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, totalH);
    const ctx = renderer.getContext();

    // 描画後に符頭座標を集めて、色ディスク・指番号・半音マークを重ねる
    interface Rendered {
      x: number;
      y: number; // 符頭中心Y
      topY: number; // 符頭の上端付近
      fing: Fingering;
      half: HalfStepType;
      row: number;
    }
    const rendered: Rendered[] = [];

    measures.forEach((measure, mi) => {
      const col = mi % perRow;
      const row = Math.floor(mi / perRow);
      const x = leftMargin + col * staveW;
      const y = topMargin + row * rowH;

      const stave = new Stave(x, y, staveW);
      if (col === 0) {
        stave.addClef("treble");
        stave.addKeySignature(song.keySignature);
        if (row === 0) stave.addTimeSignature(song.timeSignature);
      }
      stave.setContext(ctx).draw();

      const staveNotes: StaveNote[] = [];
      const noteMeta: { fing: Fingering; half: HalfStepType; rest: boolean }[] = [];

      for (const fn of measure) {
        const isRest = fn.pitch === "r";
        const dotted = fn.duration.endsWith("d");
        const base = dotted ? fn.duration.slice(0, -1) : fn.duration;
        const sn = new StaveNote({
          keys: [isRest ? "b/4" : pitchToVexKey(fn.pitch)],
          duration: isRest ? base + "r" : base,
        });
        if (dotted) Dot.buildAndAttach([sn], { all: true });

        // 符頭は黒のまま（後で半透明の蛍光ディスクを重ねて透けさせる）
        staveNotes.push(sn);
        noteMeta.push({ fing: fn.fing, half: fn.half, rest: isRest });
      }

      const voice = new Voice({ num_beats: numer, beat_value: denom })
        .setStrict(false)
        .addTickables(staveNotes);

      Accidental.applyAccidentals([voice], song.keySignature);
      const beams = Beam.generateBeams(staveNotes);

      new Formatter()
        .joinVoices([voice])
        .format([voice], Math.max(60, staveW - (col === 0 ? 90 : 24)));
      voice.draw(ctx, stave);
      beams.forEach((b) => b.setContext(ctx).draw());

      // 符頭座標を取得
      staveNotes.forEach((sn, i) => {
        const meta = noteMeta[i];
        if (meta.rest) return;
        const nx = sn.getAbsoluteX();
        const ys = sn.getYs();
        const ny = ys[0];
        rendered.push({
          x: nx + 6,
          y: ny,
          topY: ny - 6,
          fing: meta.fing,
          half: meta.half,
          row,
        });
      });
    });

    // --- オーバーレイ：蛍光マーカー風の半透明ディスク（符頭が透けて見える） ---
    rendered.forEach((r) => {
      if (!r.fing.string) return;
      ctx.save();
      ctx.setFillStyle(stringColorWithAlpha(r.fing.string, 0.65));
      ctx.beginPath();
      ctx.arc(r.x, r.y, 8, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.restore();
    });

    // --- オーバーレイ：指番号 ---
    if (showFinger) {
      rendered.forEach((r) => {
        if (r.fing.finger === null) return;
        ctx.save();
        ctx.setFont("Arial", 14, "bold");
        ctx.setFillStyle("#111827");
        const label = String(r.fing.finger);
        ctx.fillText(label, r.x - 4, r.topY - 16);
        ctx.restore();
      });
    }

    // --- オーバーレイ：半音マーク（青いブラケット） ---
    if (showHalfStep) {
      for (let i = 1; i < rendered.length; i++) {
        const a = rendered[i - 1];
        const b = rendered[i];
        if (!b.half) continue;
        if (a.row !== b.row) continue; // 行をまたぐ場合は省略
        const color =
          b.half === "touch" ? HALF_STEP_TOUCH_COLOR : HALF_STEP_OPEN_COLOR;
        const topY = Math.min(a.topY, b.topY) - (showFinger ? 30 : 16);
        ctx.save();
        ctx.setStrokeStyle(color);
        ctx.setLineWidth(2.5);
        ctx.beginPath();
        ctx.moveTo(a.x, topY + 6);
        ctx.quadraticCurveTo((a.x + b.x) / 2, topY - 6, b.x, topY + 6);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [song, showFinger, showHalfStep, width]);

  return (
    <div ref={wrapRef} className="w-full">
      <div ref={hostRef} className="w-full overflow-x-auto" />
    </div>
  );
}
