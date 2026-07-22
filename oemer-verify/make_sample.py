#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_sample.py -- 動作確認用のサンプル楽譜画像を生成する補助スクリプト。

外部サイト (IMSLP 等) からダウンロードできない環境でも動作確認できるよう、
パブリックドメインの短いバイオリン旋律を music21 で組み立て、verovio で
楽譜 SVG に描画し、PNG にラスタライズして input/ に置く。

  ※これは検証パイプライン本体ではなく、テスト用サンプルを用意するための
    ワンショットのユーティリティ。実運用では input/ に実際の教本スキャン画像を置く。

使い方: (venv 有効化後) python make_sample.py
"""
from pathlib import Path

import cairosvg
import verovio
from music21 import chord, clef, key, meter, note, stream, metadata


def build_sample1() -> stream.Score:
    """D-dur / 4/4 の単旋律。シャープ系・臨時記号を含む。"""
    s = stream.Score()
    s.metadata = metadata.Metadata()
    s.metadata.title = "Sample 1 - Scale study in D major"
    p = stream.Part()
    p.append(clef.TrebleClef())
    p.append(key.KeySignature(2))          # D-dur (# x2)
    p.append(meter.TimeSignature("4/4"))
    seq = ["D4", "E4", "F#4", "G4", "A4", "B4", "C#5", "D5",
           "D5", "C#5", "B4", "A4", "G4", "F#4", "E4", "D4",
           "F#4", "A4", "D5", "A4", "G#4", "A4", "B4", "A4",
           "D4", "F#4", "A4", "D5"]
    for i, n in enumerate(seq):
        dur = 0.5 if i < 16 else (1.0 if i < 24 else 1.0)
        p.append(note.Note(n, quarterLength=dur))
    s.append(p)
    return s


def build_sample2() -> stream.Score:
    """F-dur / 3/4。フラット系・重音(ダブルストップ)を含む。"""
    s = stream.Score()
    s.metadata = metadata.Metadata()
    s.metadata.title = "Sample 2 - Melody with double stops in F major"
    p = stream.Part()
    p.append(clef.TrebleClef())
    p.append(key.KeySignature(-1))         # F-dur (b x1)
    p.append(meter.TimeSignature("3/4"))
    p.append(note.Note("F4", quarterLength=1))
    p.append(note.Note("A4", quarterLength=1))
    p.append(note.Note("C5", quarterLength=1))
    p.append(chord.Chord(["F4", "A4"], quarterLength=1))     # 重音
    p.append(chord.Chord(["G4", "B-4"], quarterLength=1))    # 重音 (b)
    p.append(note.Note("A4", quarterLength=1))
    p.append(note.Note("B-4", quarterLength=1))
    p.append(note.Note("A4", quarterLength=1))
    p.append(note.Note("G4", quarterLength=1))
    p.append(chord.Chord(["F4", "C5"], quarterLength=2))     # 重音
    p.append(note.Note("F4", quarterLength=1))
    s.append(p)
    return s


def score_to_png(score: stream.Score, png_path: Path):
    tmp_xml = png_path.with_suffix(".gen.musicxml")
    score.write("musicxml", fp=str(tmp_xml))

    tk = verovio.toolkit()
    tk.setOptions({
        "scale": 40,
        "pageWidth": 2200,
        "pageHeight": 3000,
        "adjustPageHeight": True,
        "header": "none",
        "footer": "none",
    })
    if not tk.loadFile(str(tmp_xml)):
        raise RuntimeError("verovio がサンプル MusicXML を読めませんでした")
    svg = tk.renderToSVG(1)

    cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                     write_to=str(png_path),
                     background_color="white", output_width=1600)
    tmp_xml.unlink(missing_ok=True)
    print(f"  生成: {png_path.name}")


def main():
    base = Path(__file__).resolve().parent
    input_dir = base / "input"
    input_dir.mkdir(exist_ok=True)
    score_to_png(build_sample1(), input_dir / "sample1_dmajor.png")
    score_to_png(build_sample2(), input_dir / "sample2_fmajor.png")
    print("[DONE] サンプル画像を input/ に生成しました。")


if __name__ == "__main__":
    main()
