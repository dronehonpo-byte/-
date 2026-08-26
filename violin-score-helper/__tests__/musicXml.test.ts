import { describe, it, expect } from "vitest";
import { parseMusicXml } from "@/lib/musicXml";

/** 最小の MusicXML（ト音記号・2小節・運指/弦指定つき） */
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <defaults>
    <scaling><millimeters>7</millimeters><tenths>40</tenths></scaling>
    <page-layout><page-height>1200</page-height><page-width>900</page-width></page-layout>
  </defaults>
  <part-list><score-part id="P1"><part-name>Violin</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1" width="300">
      <attributes>
        <divisions>1</divisions>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note default-x="20" default-y="10">
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>1</duration>
        <notations><technical><fingering>1</fingering><string>2</string></technical></notations>
      </note>
      <note default-x="60" default-y="10">
        <pitch><step>C</step><alter>1</alter><octave>5</octave></pitch>
        <duration>1</duration>
      </note>
      <note default-x="100"><rest/><duration>1</duration></note>
    </measure>
    <measure number="2" width="300">
      <note default-x="20">
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>1</duration>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe("parseMusicXml", () => {
  const result = parseMusicXml(SAMPLE, { imageWidth: 900, imageHeight: 1200 });

  it("休符を除いた音符数と小節数を返す", () => {
    expect(result.notes).toHaveLength(3);
    expect(result.measureCount).toBe(2);
    expect(result.imageWidth).toBe(900);
    expect(result.imageHeight).toBe(1200);
  });

  it("音高・オクターブ・MIDI を正しく変換する", () => {
    const [a4, cs5, g4] = result.notes;
    expect(a4.pitch).toBe("A");
    expect(a4.octave).toBe(4);
    expect(a4.midi).toBe(69);

    expect(cs5.pitch).toBe("C#");
    expect(cs5.octave).toBe(5);
    expect(cs5.midi).toBe(73);

    expect(g4.pitch).toBe("G");
    expect(g4.midi).toBe(67); // G4=67（開放弦のG3=55ではない）
  });

  it("小節index・小節内順序を割り当てる", () => {
    expect(result.notes[0].measureIndex).toBe(0);
    expect(result.notes[0].orderInMeasure).toBe(0);
    expect(result.notes[1].measureIndex).toBe(0);
    expect(result.notes[1].orderInMeasure).toBe(1);
    // 2小節目の最初の音
    expect(result.notes[2].measureIndex).toBe(1);
    expect(result.notes[2].orderInMeasure).toBe(0);
  });

  it("記載の指番号と弦（ローマ数字）を拾う", () => {
    expect(result.notes[0].writtenFinger).toBe(1);
    expect(result.notes[0].writtenRoman).toBe("II"); // string 2 = A線
    // 記載がなければ null
    expect(result.notes[1].writtenFinger).toBeNull();
    expect(result.notes[1].writtenRoman).toBeNull();
  });

  it("bbox を画像ピクセル範囲内に収める", () => {
    for (const n of result.notes) {
      expect(n.bbox.w).toBeGreaterThan(0);
      expect(n.bbox.h).toBeGreaterThan(0);
      expect(n.bbox.x).toBeGreaterThanOrEqual(0);
      expect(n.bbox.x).toBeLessThan(900);
      expect(n.bbox.y).toBeGreaterThanOrEqual(0);
      expect(n.bbox.y).toBeLessThan(1200);
    }
    // 2小節目の音は1小節目より右にある（小節幅の累積）
    expect(result.notes[2].bbox.x).toBeGreaterThan(result.notes[0].bbox.x);
  });

  it("score-partwise が無ければ例外", () => {
    expect(() => parseMusicXml("<foo/>", { imageWidth: 10, imageHeight: 10 })).toThrow();
  });
});
