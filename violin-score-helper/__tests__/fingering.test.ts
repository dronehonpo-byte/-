import { describe, expect, it } from "vitest";
import { decideFingerLabelSide } from "@/lib/fingering";
import type { Note } from "@/types/score";

let idc = 0;
function note(p: Partial<Note> = {}): Note {
  return {
    id: `f${idc++}`,
    pitch: "A",
    octave: 4,
    midi: 69,
    measureIndex: 0,
    orderInMeasure: 0,
    bbox: { x: 0, y: 0, w: 10, h: 10 },
    writtenFinger: null,
    ...p,
  };
}

describe("finger label placement (§4.6)", () => {
  it("defaults to above", () => {
    expect(decideFingerLabelSide(note(), {})).toBe("above");
  });

  it("condition②: printed below in source -> below", () => {
    expect(decideFingerLabelSide(note({ writtenFingerBelow: true }), {})).toBe("below");
  });

  it("condition③: double stop lower note -> below", () => {
    expect(
      decideFingerLabelSide(note({ isDoubleStop: true, doubleStopWith: "x" }), {}),
    ).toBe("below");
  });

  it("condition④: distance beyond threshold -> below", () => {
    expect(decideFingerLabelSide(note(), { distanceToAbovePx: 100 })).toBe("below");
    expect(decideFingerLabelSide(note(), { distanceToAbovePx: 10 })).toBe("above");
  });

  it("condition①: no space above -> below", () => {
    expect(decideFingerLabelSide(note(), { spaceAbovePx: 5 })).toBe("below");
  });

  it("★exception: below would collide with dynamics -> stay above", () => {
    const n = note({ dynamics: ["hairpin-cresc"] });
    const side = decideFingerLabelSide(n, {
      distanceToAbovePx: 100,
      hasDynamicBelow: true,
    });
    expect(side).toBe("above");
  });
});
