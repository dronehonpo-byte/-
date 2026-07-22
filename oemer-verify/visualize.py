#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
visualize.py -- oemer 認識結果の可視化スクリプト (Phase 0 / 使い捨て実験用)

verify.py が output/ に吐いた MusicXML を verovio で SVG に描画し、
「oemer が元楽譜をどう解釈したか」を目視確認できるようにする。

  出力:
    output/{元ファイル名}_rendered.svg   -- 認識結果を描画した楽譜 SVG
    output/compare.html                  -- 元画像と認識結果 SVG を左右に並べた比較ページ

使い方:
    (venv 有効化後)  python visualize.py
    オプション:      python visualize.py --output out --input mydir
"""

import argparse
import base64
import html
import mimetypes
import os
import sys
from pathlib import Path


def render_svg(xml_path: Path):
    """verovio で MusicXML -> SVG 文字列。失敗時は (None, err)。"""
    try:
        import verovio
    except Exception as e:  # noqa: BLE001
        return None, f"verovio import 失敗: {e}"

    try:
        tk = verovio.toolkit()
        # 縦長 1 ページに収めて 1 枚の SVG として出せるようにする
        tk.setOptions({
            "scale": 40,
            "pageWidth": 2100,
            "pageHeight": 60000,
            "adjustPageHeight": True,
            "header": "none",
            "footer": "none",
            "breaks": "auto",
        })
        ok = tk.loadFile(str(xml_path))
        if not ok:
            # フォールバック: 文字列で読み込み (フォーマット自動判定)
            data = xml_path.read_text(encoding="utf-8", errors="replace")
            ok = tk.loadData(data)
        if not ok:
            return None, "verovio が MusicXML を読み込めませんでした"
        page_count = tk.getPageCount()
        if page_count < 1:
            return None, "描画ページがありません (空の楽譜?)"
        # 1 ページに収めているので 1 ページ目を描画
        svg = tk.renderToSVG(1)
        return svg, None
    except Exception as e:  # noqa: BLE001
        return None, f"verovio 描画中にエラー: {e}"


def find_original_image(input_dir: Path, base_name: str):
    """MusicXML の元になった画像を input/ から探す。base_name は例: 'suzuki_p12.jpg'。"""
    cand = input_dir / base_name
    if cand.exists():
        return cand
    # 拡張子違いも一応探す
    stem = Path(base_name).stem
    for p in input_dir.glob(stem + ".*"):
        if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}:
            return p
    return None


def img_to_data_uri(path: Path):
    mime, _ = mimetypes.guess_type(str(path))
    mime = mime or "image/png"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def main():
    ap = argparse.ArgumentParser(
        description="oemer 認識結果 (MusicXML) を verovio で SVG 描画し比較 HTML を生成"
    )
    ap.add_argument("--output", default="output", help="MusicXML のあるディレクトリ (既定: output)")
    ap.add_argument("--input", default="input", help="元画像ディレクトリ (既定: input)")
    args = ap.parse_args()

    base = Path(__file__).resolve().parent
    output_dir = (base / args.output) if not os.path.isabs(args.output) else Path(args.output)
    input_dir = (base / args.input) if not os.path.isabs(args.input) else Path(args.input)

    if not output_dir.exists():
        print(f"[ERROR] 出力ディレクトリがありません: {output_dir}", file=sys.stderr)
        print("        先に `python verify.py` を実行してください。", file=sys.stderr)
        sys.exit(1)

    xml_files = sorted(output_dir.glob("*.musicxml"))
    if not xml_files:
        print(f"[ERROR] {output_dir} に MusicXML がありません。先に verify.py を実行してください。",
              file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] {len(xml_files)} 件の MusicXML を描画します")

    cards = []  # compare.html 用
    for xml in xml_files:
        base_name = xml.name[:-len(".musicxml")]  # 例: 'sample.png'
        print(f"  - {xml.name} を描画中...")
        svg, err = render_svg(xml)

        svg_path = output_dir / f"{base_name}_rendered.svg"
        if svg:
            svg_path.write_text(svg, encoding="utf-8")
            print(f"    SVG: {svg_path.name}")
        else:
            print(f"    [WARN] 描画失敗: {err}")

        orig = find_original_image(input_dir, base_name)
        cards.append({
            "base_name": base_name,
            "orig": orig,
            "svg": svg,
            "err": err,
        })

    compare_path = output_dir / "compare.html"
    write_compare_html(compare_path, cards)
    print(f"\n[DONE] 比較ページ: {compare_path}")
    print("       ブラウザで開いて元画像と認識結果を見比べてください。")


def write_compare_html(path: Path, cards):
    parts = [
        "<!doctype html>",
        '<html lang="ja"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        "<title>oemer 認識結果 比較</title>",
        "<style>",
        "body{font-family:-apple-system,'Segoe UI',sans-serif;margin:0;padding:24px;background:#f5f5f5;color:#222;}",
        "h1{font-size:20px;} .meta{color:#666;font-size:13px;margin-bottom:24px;}",
        ".card{background:#fff;border:1px solid #ddd;border-radius:8px;margin-bottom:32px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);}",
        ".card h2{font-size:16px;margin:0 0 12px;}",
        ".pair{display:flex;gap:16px;flex-wrap:wrap;}",
        ".col{flex:1 1 480px;min-width:320px;border:1px solid #eee;border-radius:6px;padding:8px;background:#fafafa;}",
        ".col h3{font-size:13px;color:#555;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em;}",
        ".col img,.col svg{max-width:100%;height:auto;display:block;background:#fff;}",
        ".svgwrap{overflow-x:auto;background:#fff;}",
        ".err{color:#b00;font-size:13px;}",
        ".missing{color:#999;font-size:13px;font-style:italic;}",
        "</style></head><body>",
        "<h1>oemer 認識結果 比較 (左: 元画像 / 右: oemer 解釈)</h1>",
        '<p class="meta">verify.py + visualize.py で生成。右側は oemer が出力した MusicXML を verovio で描画したものです。'
        "元画像と見比べて、音符・小節・調号などがどこまで正しく認識されているか目視確認してください。</p>",
    ]

    for c in cards:
        parts.append('<div class="card">')
        parts.append(f'<h2>{html.escape(c["base_name"])}</h2>')
        parts.append('<div class="pair">')

        # 左: 元画像
        parts.append('<div class="col"><h3>元画像 (input)</h3>')
        if c["orig"] and c["orig"].exists():
            parts.append(f'<img src="{img_to_data_uri(c["orig"])}" alt="original">')
        else:
            parts.append('<p class="missing">元画像が input/ に見つかりませんでした。</p>')
        parts.append("</div>")

        # 右: oemer 認識結果 SVG
        parts.append('<div class="col"><h3>oemer 認識結果 (verovio 描画)</h3>')
        if c["svg"]:
            parts.append(f'<div class="svgwrap">{c["svg"]}</div>')
        else:
            parts.append(f'<p class="err">描画できませんでした: {html.escape(str(c["err"]))}</p>')
        parts.append("</div>")

        parts.append("</div></div>")

    parts.append("</body></html>")
    path.write_text("\n".join(parts), encoding="utf-8")


if __name__ == "__main__":
    main()
