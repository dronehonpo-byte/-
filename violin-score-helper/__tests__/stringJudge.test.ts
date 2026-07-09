import { describe, expect, it } from "vitest";
import { assignStrings, decideNote, StringDecision } from "@/lib/stringJudge";
import { ViolinString } from "@/lib/constants";
import { pitchToMidi } from "@/lib/music";
import type { FingeringOptions, Note } from "@/types/score";

const AUTO: FingeringOptions = { mode: "auto" };
const OPEN_PRI: FingeringOptions = { mode: "open-string-priority" };

let idc = 0;
function note(partial: Partial<Note> & { midi: number }): Note {
  return {
    id: `n${idc++}`,
    pitch: "X",
    octave: 4,
    measureIndex: 0,
    orderInMeasure: 0,
    bbox: { x: 0, y: 0, w: 10, h: 10 },
    writtenFinger: null,
    ...partial,
  };
}

describe("pitchToMidi", () => {
  it("maps open strings correctly", () => {
    expect(pitchToMidi("G", 3)).toBe(55);
    expect(pitchToMidi("D", 4)).toBe(62);
    expect(pitchToMidi("A", 4)).toBe(69);
    expect(pitchToMidi("E", 5)).toBe(76);
    expect(pitchToMidi("C", 4)).toBe(60);
    expect(pitchToMidi("F#", 5)).toBe(78);
  });
});

describe("R3: 0 vs 4 (open string vs 4th finger)", () => {
  // 必須テストケース（要件定義書 §4.4 / プロンプト §3）
  it("E5: next is higher (Fis) -> E-string open (0)", () => {
    const e5 = note({ midi: pitchToMidi("E", 5) });
    const fis = note({ midi: pitchToMidi("F#", 5) });
    const d = decideNote(e5, null, [fis.midi], AUTO);
    expect(d.string).toBe(ViolinString.E);
    expect(d.finger).toBe(0);
  });

  it("E5: next is lower (D) -> A-string 4th finger (4)", () => {
    const e5 = note({ midi: pitchToMidi("E", 5) });
    const dLow = note({ midi: pitchToMidi("D", 5) });
    const d = decideNote(e5, null, [dLow.midi], AUTO);
    expect(d.string).toBe(ViolinString.A);
    expect(d.finger).toBe(4);
  });

  it("E5: phrase end (no next) -> 4th finger (4) by default", () => {
    const e5 = note({ midi: pitchToMidi("E", 5) });
    const d = decideNote(e5, null, [], AUTO);
    expect(d.string).toBe(ViolinString.A);
    expect(d.finger).toBe(4);
  });

  it("E5: same note then rises -> resolves by the next changing note (open)", () => {
    const e5 = note({ midi: pitchToMidi("E", 5) });
    const same = note({ midi: pitchToMidi("E", 5) });
    const fis = note({ midi: pitchToMidi("F#", 5) });
    const d = decideNote(e5, null, [same.midi, fis.midi], AUTO);
    expect(d.string).toBe(ViolinString.E);
    expect(d.finger).toBe(0);
  });

  it("D4 pairs D-string-0 with G-string-4 (not A-string; spec typo corrected)", () => {
    // レ(D): 次が低 -> G線4
    const d4 = note({ midi: pitchToMidi("D", 4) });
    const cLow = note({ midi: pitchToMidi("C", 4) });
    const dec = decideNote(d4, null, [cLow.midi], AUTO);
    expect(dec.string).toBe(ViolinString.G);
    expect(dec.finger).toBe(4);
  });

  it("A4: next higher -> A-string open; next lower -> D-string 4th", () => {
    const a4 = note({ midi: pitchToMidi("A", 4) });
    const b4 = note({ midi: pitchToMidi("B", 4) });
    const g4 = note({ midi: pitchToMidi("G", 4) });
    expect(decideNote(a4, null, [b4.midi], AUTO).string).toBe(ViolinString.A);
    expect(decideNote(a4, null, [b4.midi], AUTO).finger).toBe(0);
    expect(decideNote(a4, null, [g4.midi], AUTO).string).toBe(ViolinString.D);
    expect(decideNote(a4, null, [g4.midi], AUTO).finger).toBe(4);
  });

  it("open-string-priority mode always picks the open string in 0-vs-4", () => {
    const e5 = note({ midi: pitchToMidi("E", 5) });
    const dLow = note({ midi: pitchToMidi("D", 5) });
    const d = decideNote(e5, null, [dLow.midi], OPEN_PRI);
    expect(d.string).toBe(ViolinString.E);
    expect(d.finger).toBe(0);
  });
});

describe("R2: Roman numeral fixes the string", () => {
  it("III forces D string", () => {
    const g4 = note({ midi: pitchToMidi("G", 4), writtenRoman: "III" });
    const d = decideNote(g4, null, [], AUTO);
    expect(d.string).toBe(ViolinString.D);
    expect(d.reason).toBe("R2-roman");
  });

  it("I forces E string", () => {
    const a5 = note({ midi: pitchToMidi("A", 5), writtenRoman: "I" });
    const d = decideNote(a5, null, [], AUTO);
    expect(d.string).toBe(ViolinString.E);
  });
});

describe("R1: written finger is absolute", () => {
  it("uses the written finger and infers the string", () => {
    // C5 = A線 2nd finger (dist 3)
    const c5 = note({ midi: pitchToMidi("C", 5), writtenFinger: 2 });
    const d = decideNote(c5, null, [], AUTO);
    expect(d.finger).toBe(2);
    expect(d.string).toBe(ViolinString.A);
    expect(d.reason).toBe("R1-finger");
  });

  it("written finger 0 on the E-vs-A note stays open (overrides R3)", () => {
    const e5 = note({ midi: pitchToMidi("E", 5), writtenFinger: 0 });
    const dLow = note({ midi: pitchToMidi("D", 5) });
    const d = decideNote(e5, null, [dLow.midi], AUTO);
    expect(d.finger).toBe(0);
    expect(d.string).toBe(ViolinString.E);
  });
});

describe("R1: maintain previous position when no finger given", () => {
  it("keeps the same string if reachable in 1st position", () => {
    const prev: StringDecision = {
      string: ViolinString.D,
      finger: 1,
      position: 1,
      reason: "R1-finger",
    };
    // F#4 (66) reachable on D string (dist 4 -> finger 2)
    const fis4 = note({ midi: pitchToMidi("F#", 4) });
    const d = decideNote(fis4, prev, [], AUTO);
    expect(d.string).toBe(ViolinString.D);
    expect(d.reason).toBe("R1-maintain");
  });
});

describe("assignStrings integration", () => {
  it("assigns string/finger to every note", () => {
    const notes = [
      note({ midi: pitchToMidi("D", 4), pitch: "D", octave: 4 }),
      note({ midi: pitchToMidi("E", 4), pitch: "E", octave: 4 }),
      note({ midi: pitchToMidi("F#", 4), pitch: "F#", octave: 4 }),
    ];
    const out = assignStrings(notes, AUTO);
    expect(out).toHaveLength(3);
    for (const n of out) {
      expect(n.string).toBeDefined();
      expect(n.finger).toBeGreaterThanOrEqual(0);
      expect(n.position).toBeGreaterThanOrEqual(1);
    }
  });
});
