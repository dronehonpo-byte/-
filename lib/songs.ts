// 内蔵曲ライブラリ（パブリックドメイン）。
// 音符は「ピッチ + 音価」だけを持ち、弦色・指番号・半音マークは
// firstPosition エンジンが自動計算する（API不要）。

export interface SongNote {
  pitch: string; // "A4", "F#5" など（休符は "r"）
  duration: string; // VexFlow音価: "w","h","q","8","16"（付点は "qd" 等）
}

export interface Song {
  id: string;
  title: string;
  subtitle?: string;
  composer?: string;
  keySignature: string; // VexFlow調号: "C","G","D","A","F" など
  timeSignature: string; // "4/4","3/4","2/4"
  notes: SongNote[];
}

function n(pitch: string, duration = "q"): SongNote {
  return { pitch, duration };
}

export const SONGS: Song[] = [
  {
    id: "d-major-scale",
    title: "ニ長調の音階",
    subtitle: "れんしゅう用（D線・A線の色と半音を確認）",
    keySignature: "D",
    timeSignature: "4/4",
    notes: [
      // 上行
      n("D4"), n("E4"), n("F#4"), n("G4"),
      n("A4"), n("B4"), n("C#5"), n("D5"),
      // 下行
      n("D5"), n("C#5"), n("B4"), n("A4"),
      n("G4"), n("F#4"), n("E4"), n("D4"),
    ],
  },
  {
    id: "twinkle",
    title: "キラキラ星",
    subtitle: "Twinkle, Twinkle, Little Star",
    composer: "フランス民謡",
    keySignature: "A",
    timeSignature: "4/4",
    notes: [
      n("A4"), n("A4"), n("E5"), n("E5"),
      n("F#5"), n("F#5"), n("E5", "h"),
      n("D5"), n("D5"), n("C#5"), n("C#5"),
      n("B4"), n("B4"), n("A4", "h"),
      n("E5"), n("E5"), n("D5"), n("D5"),
      n("C#5"), n("C#5"), n("B4", "h"),
      n("E5"), n("E5"), n("D5"), n("D5"),
      n("C#5"), n("C#5"), n("B4", "h"),
      n("A4"), n("A4"), n("E5"), n("E5"),
      n("F#5"), n("F#5"), n("E5", "h"),
      n("D5"), n("D5"), n("C#5"), n("C#5"),
      n("B4"), n("B4"), n("A4", "h"),
    ],
  },
  {
    id: "canon",
    title: "カノン",
    subtitle: "Canon（冒頭の下行メロディ）",
    composer: "Pachelbel",
    keySignature: "D",
    timeSignature: "4/4",
    notes: [
      n("F#5", "h"), n("E5", "h"),
      n("D5", "h"), n("C#5", "h"),
      n("B4", "h"), n("A4", "h"),
      n("B4", "h"), n("C#5", "h"),
    ],
  },
];

export function getSong(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}
