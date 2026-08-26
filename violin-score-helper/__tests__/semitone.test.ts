import { describe, expect, it } from "vitest";
import { semitoneMarkFor, isSemitoneStep } from "@/lib/semitone";
import { ViolinString } from "@/lib/constants";
import type { Note } from "@/types/score";

let idc = 0;
function note(p: Partial<Note> & { midi: number }): Note {
  return {
    id: `s${idc++}`,
    pitch: "X",
    octave: 4,
    measureIndex: 0,
    orderInMeasure: 0,
    bbox: { x: 0, y: 0, w: 10, h: 10 },
    writtenFinger: null,
    ...p,
  };
}

describe("semitone mark color/direction (§4.7)", () => {
  it("no mark when not a semitone step", () => {
    const a = note({ midi: 69, string: ViolinString.A, finger: 0 });
    const b = note({ midi: 71, string: ViolinString.A, finger: 1 });
    expect(isSemitoneStep(a, b)).toBe(false);
    expect(semitoneMarkFor(a, b)).toBeNull();
  });

  it("BLUE: same string, adjacent fingers (1->2), fingers pressed together", () => {
    const a = note({ midi: 70, string: ViolinString.A, finger: 1, fingerLabelSide: "above" });
    const b = note({ midi: 71, string: ViolinString.A, finger: 2 });
    const mark = semitoneMarkFor(a, b);
    expect(mark?.color).toBe("blue");
    expect(mark?.direction).toBe("up");
  });

  it("CYAN: same finger chromatic move (1->1)", () => {
    const a = note({ midi: 70, string: ViolinString.A, finger: 1 });
    const b = note({ midi: 71, string: ViolinString.A, finger: 1 });
    expect(semitoneMarkFor(a, b)?.color).toBe("cyan");
  });

  it("CYAN: cross-string semitone (move to another string)", () => {
    const a = note({ midi: 74, string: ViolinString.A, finger: 3 });
    const b = note({ midi: 75, string: ViolinString.E, finger: 0 });
    expect(semitoneMarkFor(a, b)?.color).toBe("cyan");
  });

  it("direction follows finger label side (below -> down)", () => {
    const a = note({ midi: 70, string: ViolinString.A, finger: 1, fingerLabelSide: "below" });
    const b = note({ midi: 71, string: ViolinString.A, finger: 2 });
    expect(semitoneMarkFor(a, b)?.direction).toBe("down");
  });

  it("open string involved -> not blue (cyan)", () => {
    const a = note({ midi: 76, string: ViolinString.E, finger: 0 });
    const b = note({ midi: 77, string: ViolinString.E, finger: 1 });
    // 0 と 1 は隣接だが開放弦は密着対象外 -> cyan
    expect(semitoneMarkFor(a, b)?.color).toBe("cyan");
  });
});
