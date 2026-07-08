"""stlite 版 index.html を生成する（ブラウザ内 Streamlit / WASM）。

stat_easy 配下の全ファイルを 1 枚の静的 HTML に埋め込み、Vercel に静的公開する。
統計計算はブラウザ内の Pyodide 上で SciPy/statsmodels/scikit-learn 等が実行する
（生成 AI 不使用の原則はそのまま維持される）。

  python web/_build_index.py
"""
from __future__ import annotations

import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # stat_easy/
OUT = ROOT / "web" / "index.html"

# 同梱する日本語フォント（豆腐 □ 防止・バイナリ埋め込み）
FONT_REL = "assets/fonts/ipaexg.ttf"

# 仮想ファイルシステムに載せるファイル（stat_easy/ からの相対パス）
INCLUDE = [
    "app.py",
    "modules/__init__.py",
    "modules/common.py",
    "modules/data_loader.py",
    "modules/data_quality.py",
    "modules/descriptive_stats.py",
    "modules/hypothesis_test.py",
    "modules/effect_size.py",
    "modules/correlation.py",
    "modules/clustering.py",
    "modules/visualizer.py",
    "exporters/__init__.py",
    "exporters/excel_exporter.py",
    "exporters/word_exporter.py",
    "exporters/pdf_exporter.py",
    "pages/00_home.py",
    "pages/01_upload.py",
    "pages/02_quality.py",
    "pages/03_descriptive.py",
    "pages/04_hypothesis.py",
    "pages/05_effect.py",
    "pages/06_regression.py",
    "pages/08_clustering.py",
    "pages/09_visualization.py",
    "sample_data/sample_experiment.csv",
    "sample_data/sample_survey.csv",
    "assets/style.css",
    ".streamlit/config.toml",
]

# Pyodide で利用可能なパッケージのみ（xgboost / japanize-matplotlib / pingouin /
# missingno は Pyodide 非対応または不要。コード側で欠如を許容済み）。
REQUIREMENTS = [
    "numpy",
    "pandas",
    "scipy",
    "scikit-learn",
    "statsmodels",
    "matplotlib",
    "seaborn",
    "openpyxl",
    "python-docx",
    "reportlab",
    "chardet",
]

STLITE_VERSION = "0.75.0"


def build() -> None:
    files: dict[str, str] = {}
    for rel in INCLUDE:
        p = ROOT / rel
        files[rel] = p.read_text(encoding="utf-8")

    files_json = json.dumps(files, ensure_ascii=False)
    # </script> 等で HTML が壊れないようにエスケープ
    files_json = files_json.replace("</", "<\\/")
    reqs_json = json.dumps(REQUIREMENTS)

    # 日本語フォント（バイナリ）を base64 で埋め込む
    font_b64 = base64.b64encode((ROOT / FONT_REL).read_bytes()).decode("ascii")

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>StatEasy — 自動統計解析ツール（オンライン体験版）</title>
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@stlite/mountable@{STLITE_VERSION}/build/stlite.css" />
  <style>
    html, body, #root {{ height: 100%; margin: 0; }}
    #boot {{
      font-family: -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
      color: #1E6091; text-align: center; padding: 18vh 1rem;
    }}
    #boot .sub {{ color: #5A6B7B; font-size: 0.9rem; margin-top: 0.6rem; }}
    .spin {{
      width: 38px; height: 38px; border: 4px solid #D6E0EA; border-top-color: #1E6091;
      border-radius: 50%; margin: 0 auto 1rem; animation: r 1s linear infinite;
    }}
    @keyframes r {{ to {{ transform: rotate(360deg); }} }}
  </style>
</head>
<body>
  <div id="root">
    <div id="boot">
      <div class="spin"></div>
      <div><b>StatEasy</b> を起動しています…</div>
      <div class="sub">初回はブラウザ内に統計ライブラリ（SciPy / statsmodels / scikit-learn 等）を<br>
      読み込むため 1〜2 分ほどかかります。そのままお待ちください。</div>
      <div class="sub">開発：土居拓務・株式会社Miyabee</div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/@stlite/mountable@{STLITE_VERSION}/build/stlite.js"></script>
  <script>
    const files = {files_json};
    // 日本語フォント（バイナリ）を仮想FSにマウント（豆腐 □ 防止）
    const fontB64 = "{font_b64}";
    files["{FONT_REL}"] = {{
      data: Uint8Array.from(atob(fontB64), function (c) {{ return c.charCodeAt(0); }})
    }};
    stlite.mount(
      {{
        requirements: {reqs_json},
        entrypoint: "app.py",
        files: files,
      }},
      document.getElementById("root")
    );
  </script>
</body>
</html>
"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    size_kb = OUT.stat().st_size / 1024
    print(f"生成: {OUT}  ({size_kb:.0f} KB, {len(files)} ファイル埋め込み)")


if __name__ == "__main__":
    build()
