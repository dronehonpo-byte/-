import type { AnalysisResult, Note } from "@/types/score";
import { pitchToMidi } from "./halfStepDetector";

// 音価名 → 拍数（4分音符=1拍）
const DURATION_BEATS: Record<string, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  "eighth.": 0.75,
  sixteenth: 0.25,
  "16th": 0.25,
  thirtysecond: 0.125,
  "32nd": 0.125,
  "dotted-half": 3,
  "dotted-quarter": 1.5,
  "dotted-eighth": 0.75,
};

export function durationToBeats(duration: string): number {
  return DURATION_BEATS[duration?.toLowerCase?.() ?? ""] ?? 1;
}

/** MIDI 番号 → Tone.js が解釈できる音名（"A4" 等）に正規化 */
export function midiToToneName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  return names[midi % 12] + octave;
}

export interface ScheduledNote {
  id: string;
  noteName: string; // Tone.js 用音名
  time: number; // 秒（テンポ適用後）
  durationSec: number;
}

/**
 * 解析結果の音符列を、指定 BPM の再生スケジュールに変換する。
 * 重音は同時刻に重ねる（時間を進めない）。
 */
export function buildSchedule(
  analysis: AnalysisResult,
  bpm: number
): ScheduledNote[] {
  const secPerBeat = 60 / bpm;
  const schedule: ScheduledNote[] = [];
  let cursorBeats = 0;

  const notes = analysis.notes;
  const handledPartner = new Set<string>();

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const midi = pitchToMidi(note.pitch);
    if (midi === null) continue;

    const beats = durationToBeats(note.duration);
    const time = cursorBeats * secPerBeat;
    schedule.push({
      id: note.id,
      noteName: midiToToneName(midi),
      time,
      durationSec: beats * secPerBeat * 0.95,
    });

    // 重音：パートナーを同時刻に重ねる（カーソルは進めない）
    if (
      note.is_double_stop &&
      note.double_stop_partner_id &&
      !handledPartner.has(note.id)
    ) {
      const partner = notes.find(
        (n) => n.id === note.double_stop_partner_id
      );
      if (partner) {
        handledPartner.add(partner.id);
        const pMidi = pitchToMidi(partner.pitch);
        if (pMidi !== null) {
          schedule.push({
            id: partner.id,
            noteName: midiToToneName(pMidi),
            time,
            durationSec: beats * secPerBeat * 0.95,
          });
        }
      }
      cursorBeats += beats;
    } else if (handledPartner.has(note.id)) {
      // すでに上の音と同時に鳴らした下の音 → 時間を進めない
    } else {
      cursorBeats += beats;
    }
  }

  return schedule;
}

/** 速度記号からデフォルト BPM を推定（なければ 80） */
export function estimateBpm(tempoMarking: string | null): number {
  if (!tempoMarking) return 80;
  const t = tempoMarking.toLowerCase();
  // 数値指定（♩=120 など）があれば優先
  const num = t.match(/(\d{2,3})/);
  if (num) {
    const n = parseInt(num[1], 10);
    if (n >= 40 && n <= 200) return n;
  }
  if (t.includes("grave") || t.includes("largo")) return 50;
  if (t.includes("adagio")) return 66;
  if (t.includes("andante")) return 76;
  if (t.includes("moderato")) return 100;
  if (t.includes("allegro")) return 132;
  if (t.includes("vivace") || t.includes("presto")) return 168;
  return 80;
}

export type { Note };
