#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify.py -- oemer 精度検証スクリプト (Phase 0 / 使い捨て実験用)

input/ に置いた楽譜画像 (PNG/JPG) を 1 枚ずつ oemer に渡して MusicXML を生成し、
music21 でパースして認識結果の統計サマリーを output/ に書き出す。

  出力:
    output/{元ファイル名}.musicxml         -- oemer が生成した生 MusicXML
    output/{元ファイル名}_report.txt        -- 1 画像ごとの認識結果サマリー
    output/_summary.txt                     -- 全画像の集計サマリー

使い方:
    (venv 有効化後)  python verify.py
    オプション:      python verify.py --input mydir --output out --use-tf

本番アプリではなく「oemer が実用に耐えるか」を判定するための検証専用ツール。
"""

import argparse
import os
import shutil
import subprocess
import sys
import time
import traceback
from pathlib import Path

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}


def find_images(input_dir: Path):
    """input_dir 直下の画像ファイルを名前順で返す。"""
    imgs = [
        p for p in sorted(input_dir.iterdir())
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    ]
    return imgs


def run_oemer(image: Path, out_dir: Path, use_tf: bool, timeout_sec: int):
    """
    oemer をサブプロセスで実行し MusicXML を生成する。
    戻り値: (musicxml_path or None, elapsed_sec, returncode, stdout, stderr)

    oemer CLI は `oemer <image> -o <out_dir>` で <out_dir>/<stem>.musicxml を生成する。
    内部 API はバージョン間で変わりやすいため、ドキュメント化された CLI 経由で呼ぶ。
    """
    cmd = ["oemer", str(image), "-o", str(out_dir)]
    if use_tf:
        cmd.append("--use-tf")

    start = time.perf_counter()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
        elapsed = time.perf_counter() - start
        rc = proc.returncode
        stdout, stderr = proc.stdout, proc.stderr
    except subprocess.TimeoutExpired as e:
        elapsed = time.perf_counter() - start
        return None, elapsed, -1, e.stdout or "", f"TIMEOUT after {timeout_sec}s"
    except FileNotFoundError:
        return None, 0.0, -127, "", (
            "oemer コマンドが見つかりません。venv を有効化し `pip install oemer` 済みか確認してください。"
        )

    # oemer は入力の stem 名で <stem>.musicxml を吐く。
    produced = out_dir / f"{image.stem}.musicxml"
    if produced.exists():
        return produced, elapsed, rc, stdout, stderr

    # 稀に .xml 等になる場合のフォールバック探索。
    candidates = sorted(out_dir.glob(f"{image.stem}*.musicxml")) + \
        sorted(out_dir.glob(f"{image.stem}*.xml"))
    if candidates:
        return candidates[0], elapsed, rc, stdout, stderr

    return None, elapsed, rc, stdout, stderr


def analyze_musicxml(xml_path: Path):
    """
    music21 で MusicXML をパースし統計情報を dict で返す。
    パース失敗時は {"parse_error": <msg>} を含む dict を返す。
    """
    stats = {
        "note_count": 0,        # 単音+和音内の音を全部足した総数
        "chord_count": 0,       # 重音(和音)の数
        "chord_notes": 0,       # 和音に含まれる音の数
        "measure_count": 0,     # 小節数 (全パート合計)
        "part_count": 0,        # パート数
        "measures_per_part": 0, # 1 パートあたり最大小節数
        "key_signatures": [],   # 検出された調号 (人が読める表現)
        "time_signatures": [],  # 検出された拍子
        "sharp_count": 0,       # 音符に付いた # の数
        "flat_count": 0,        # 音符に付いた b の数
        "natural_count": 0,     # ナチュラル記号の数
        "rest_count": 0,        # 休符数
        "parse_error": None,
    }
    try:
        from music21 import converter, stream, key, meter
    except Exception as e:  # noqa: BLE001
        stats["parse_error"] = f"music21 import 失敗: {e}"
        return stats

    try:
        score = converter.parse(str(xml_path))
    except Exception as e:  # noqa: BLE001
        stats["parse_error"] = f"music21 parse 失敗: {e}"
        return stats

    try:
        parts = list(score.recurse().getElementsByClass(stream.Part))
        stats["part_count"] = len(parts)

        measures = list(score.recurse().getElementsByClass(stream.Measure))
        stats["measure_count"] = len(measures)
        if parts:
            per_part = [
                len(list(p.recurse().getElementsByClass(stream.Measure)))
                for p in parts
            ]
            stats["measures_per_part"] = max(per_part) if per_part else 0
        else:
            stats["measures_per_part"] = len(measures)

        # 音符 / 和音 / 臨時記号
        for n in score.recurse().notes:  # Note と Chord (休符は含まない)
            if n.isChord:
                stats["chord_count"] += 1
                stats["chord_notes"] += len(n.pitches)
                stats["note_count"] += len(n.pitches)
                pitches = list(n.pitches)
            else:
                stats["note_count"] += 1
                pitches = [n.pitch]
            for p in pitches:
                acc = p.accidental
                if acc is None:
                    continue
                # 譜面に「実際に表示されている」臨時記号だけ数える。
                # 調号由来 (D-dur の F# 等) は displayStatus=False なので除外される。
                # displayStatus が未評価 (None) の場合は表示扱いにする。
                disp = acc.displayStatus
                if disp is False:
                    continue
                name = acc.name  # 'sharp', 'flat', 'natural', 'double-sharp'...
                if "sharp" in name:
                    stats["sharp_count"] += 1
                elif "flat" in name:
                    stats["flat_count"] += 1
                elif name == "natural":
                    stats["natural_count"] += 1

        stats["rest_count"] = len(list(score.recurse().notesAndRests)) - \
            len(list(score.recurse().notes))

        # 調号
        for ks in score.recurse().getElementsByClass(key.KeySignature):
            sharps = ks.sharps
            if sharps == 0:
                label = "調号なし (C/Am)"
            elif sharps > 0:
                label = f"#×{sharps}"
            else:
                label = f"b×{abs(sharps)}"
            try:
                label += f" -> {ks.asKey().name}"
            except Exception:  # noqa: BLE001
                pass
            if label not in stats["key_signatures"]:
                stats["key_signatures"].append(label)

        # 拍子
        for ts in score.recurse().getElementsByClass(meter.TimeSignature):
            r = ts.ratioString
            if r not in stats["time_signatures"]:
                stats["time_signatures"].append(r)

    except Exception as e:  # noqa: BLE001
        stats["parse_error"] = f"統計抽出中にエラー: {e}\n{traceback.format_exc()}"

    return stats


def write_report(report_path: Path, image: Path, elapsed: float, rc: int,
                 stdout: str, stderr: str, xml_path, stats):
    lines = []
    lines.append("=" * 60)
    lines.append(f"oemer 認識結果レポート : {image.name}")
    lines.append("=" * 60)
    lines.append(f"元画像            : {image.name}")
    lines.append(f"処理時間          : {elapsed:.1f} 秒")
    lines.append(f"oemer 終了コード  : {rc}")
    if xml_path:
        lines.append(f"生成 MusicXML     : {Path(xml_path).name}")
    else:
        lines.append("生成 MusicXML     : (なし — oemer 失敗)")
    lines.append("")

    if stats is None:
        lines.append("MusicXML が生成されなかったため統計は取得できませんでした。")
    else:
        pe = stats.get("parse_error")
        lines.append("--- 認識結果サマリー ---")
        lines.append(f"認識できた音符の総数 : {stats['note_count']}  (和音内の音を含む)")
        lines.append(f"重音(和音)の数       : {stats['chord_count']}  (含まれる音: {stats['chord_notes']})")
        lines.append(f"休符数               : {stats['rest_count']}")
        lines.append(f"小節数               : {stats['measure_count']}  (全パート合計)")
        lines.append(f"パート数             : {stats['part_count']}  (1パート最大 {stats['measures_per_part']} 小節)")
        ks = ", ".join(stats["key_signatures"]) or "(検出なし)"
        ts = ", ".join(stats["time_signatures"]) or "(検出なし)"
        lines.append(f"調号                 : {ks}")
        lines.append(f"拍子                 : {ts}")
        lines.append(f"シャープ(#)の数      : {stats['sharp_count']}  (音符に付いた臨時記号)")
        lines.append(f"フラット(b)の数      : {stats['flat_count']}  (音符に付いた臨時記号)")
        lines.append(f"ナチュラルの数       : {stats['natural_count']}")
        if pe:
            lines.append("")
            lines.append("!! music21 パース/解析エラー:")
            lines.append(pe)

    lines.append("")
    lines.append("--- oemer stdout (末尾) ---")
    lines.append(_tail(stdout, 40) or "(なし)")
    lines.append("")
    lines.append("--- oemer stderr / 警告 (末尾) ---")
    lines.append(_tail(stderr, 40) or "(なし)")
    lines.append("")

    report_path.write_text("\n".join(lines), encoding="utf-8")


def _tail(text: str, n: int) -> str:
    if not text:
        return ""
    return "\n".join(text.strip().splitlines()[-n:])


def main():
    ap = argparse.ArgumentParser(
        description="oemer 精度検証: input/ の楽譜画像を処理して output/ にレポートを出力"
    )
    ap.add_argument("--input", default="input", help="入力画像ディレクトリ (既定: input)")
    ap.add_argument("--output", default="output", help="出力ディレクトリ (既定: output)")
    ap.add_argument("--use-tf", action="store_true",
                    help="oemer で ONNX でなく TensorFlow モデルを使う")
    ap.add_argument("--timeout", type=int, default=1200,
                    help="1 画像あたりの oemer タイムアウト秒 (既定: 1200)")
    args = ap.parse_args()

    base = Path(__file__).resolve().parent
    input_dir = (base / args.input) if not os.path.isabs(args.input) else Path(args.input)
    output_dir = (base / args.output) if not os.path.isabs(args.output) else Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_dir.exists():
        print(f"[ERROR] 入力ディレクトリがありません: {input_dir}", file=sys.stderr)
        sys.exit(1)

    images = find_images(input_dir)
    if not images:
        print(f"[ERROR] {input_dir} に画像がありません (対応拡張子: {sorted(IMAGE_EXTS)})",
              file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] {len(images)} 枚の画像を処理します: {input_dir}")
    # oemer 生成物は一時ディレクトリに出して名前衝突を避ける
    tmp_dir = output_dir / "_oemer_tmp"
    tmp_dir.mkdir(exist_ok=True)

    results = []
    for idx, img in enumerate(images, 1):
        print(f"\n[{idx}/{len(images)}] === {img.name} ===")
        print("  oemer 実行中... (CPU のみだと数分かかる場合があります)")
        xml_tmp, elapsed, rc, stdout, stderr = run_oemer(
            img, tmp_dir, args.use_tf, args.timeout
        )
        print(f"  完了: {elapsed:.1f}秒 / rc={rc} / musicxml={'あり' if xml_tmp else 'なし'}")

        final_xml = None
        stats = None
        if xml_tmp:
            final_xml = output_dir / f"{img.name}.musicxml"
            try:
                shutil.copyfile(xml_tmp, final_xml)
            except Exception as e:  # noqa: BLE001
                print(f"  [WARN] MusicXML コピー失敗: {e}")
                final_xml = xml_tmp
            stats = analyze_musicxml(final_xml)

        report_path = output_dir / f"{img.name}_report.txt"
        write_report(report_path, img, elapsed, rc, stdout, stderr, final_xml, stats)
        print(f"  レポート: {report_path.name}")

        results.append({
            "image": img.name,
            "ok": final_xml is not None and (stats is None or stats.get("parse_error") is None),
            "has_xml": final_xml is not None,
            "elapsed": elapsed,
            "rc": rc,
            "stats": stats,
        })

    write_summary(output_dir / "_summary.txt", results)
    print(f"\n[DONE] 集計サマリー: {output_dir / '_summary.txt'}")

    n_ok = sum(1 for r in results if r["has_xml"])
    print(f"[DONE] {n_ok}/{len(results)} 枚で MusicXML を生成しました。")


def write_summary(path: Path, results):
    total = len(results)
    with_xml = [r for r in results if r["has_xml"]]
    without_xml = [r for r in results if not r["has_xml"]]
    times = [r["elapsed"] for r in results if r["elapsed"] > 0]
    avg = sum(times) / len(times) if times else 0.0

    lines = []
    lines.append("=" * 60)
    lines.append("oemer 検証 全体サマリー")
    lines.append("=" * 60)
    lines.append(f"処理した画像数        : {total}")
    lines.append(f"MusicXML 生成 成功    : {len(with_xml)}")
    lines.append(f"MusicXML 生成 失敗    : {len(without_xml)}")
    lines.append(f"平均処理時間          : {avg:.1f} 秒")
    lines.append("")
    lines.append("--- 各画像の音符数一覧 ---")
    lines.append(f"{'画像':<40} {'音符数':>8} {'和音':>6} {'小節':>6} {'時間(s)':>9}  結果")
    lines.append("-" * 85)
    for r in results:
        s = r["stats"]
        if s and s.get("parse_error") is None:
            notes = s["note_count"]
            chords = s["chord_count"]
            meas = s["measure_count"]
        elif s and s.get("parse_error"):
            notes = chords = meas = "parse err"
        else:
            notes = chords = meas = "-"
        status = "OK" if r["ok"] else ("XMLのみ" if r["has_xml"] else "FAIL")
        lines.append(
            f"{r['image']:<40} {str(notes):>8} {str(chords):>6} {str(meas):>6} "
            f"{r['elapsed']:>9.1f}  {status}"
        )
    lines.append("")
    if without_xml:
        lines.append("--- 失敗した画像 ---")
        for r in without_xml:
            lines.append(f"  - {r['image']} (rc={r['rc']})")
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
