"""jsDelivr(GitHub公開ミラー)からアプリ全ファイル＋フォントを読み込む軽量ローダHTMLを生成。

リポジトリが公開なので、stlite の files を jsDelivr の URL 参照にすることで、
本体HTMLを数KBに保ったまま、フルの日本語フォント(ipaexg.ttf)込みで配信できる。
生成した loader.html を Vercel に静的デプロイする。
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "loader.html"

REPO = "dronehonpo-byte/-"
# 反映確実性のためブランチ名でなくコミットSHAで固定
COMMIT = "3144935c62902f3bc6beb86d3f73daa474ae07e9"
BASE = f"https://cdn.jsdelivr.net/gh/{REPO}@{COMMIT}/stat_easy/"

PATHS = [
    "app.py",
    "modules/__init__.py", "modules/common.py", "modules/data_loader.py",
    "modules/data_quality.py", "modules/descriptive_stats.py",
    "modules/hypothesis_test.py", "modules/effect_size.py",
    "modules/correlation.py", "modules/clustering.py", "modules/visualizer.py",
    "exporters/__init__.py", "exporters/excel_exporter.py",
    "exporters/word_exporter.py", "exporters/pdf_exporter.py",
    "pages/00_home.py", "pages/01_upload.py", "pages/02_quality.py",
    "pages/03_descriptive.py", "pages/04_hypothesis.py", "pages/05_effect.py",
    "pages/06_regression.py", "pages/08_clustering.py", "pages/09_visualization.py",
    "sample_data/sample_experiment.csv", "sample_data/sample_survey.csv",
    "assets/style.css", ".streamlit/config.toml",
    "assets/fonts/ipaexg.ttf",
]

# Pyodideで確実に入る最小構成（reportlabは非対応の可能性があるため上流指定から除外し、
# PDF出力のみクリック時に劣化。Excel(openpyxl)/Word(python-docx)は動作）。
REQUIREMENTS = [
    "numpy", "pandas", "scipy", "scikit-learn", "statsmodels",
    "matplotlib", "seaborn", "openpyxl", "python-docx", "chardet",
]

STLITE_VERSION = "0.75.0"


def build() -> None:
    paths_json = json.dumps(PATHS)
    reqs_json = json.dumps(REQUIREMENTS)
    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>StatEasy — 自動統計解析ツール（確認用）</title>
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@stlite/mountable@{STLITE_VERSION}/build/stlite.css" />
  <style>
    html, body, #root {{ height: 100%; margin: 0; }}
    #boot {{ font-family: "Hiragino Sans","Noto Sans JP",sans-serif; color:#1E6091;
            text-align:center; padding:16vh 1rem; }}
    #boot .sub {{ color:#5A6B7B; font-size:0.9rem; margin-top:0.6rem; }}
    .spin {{ width:38px;height:38px;border:4px solid #D6E0EA;border-top-color:#1E6091;
            border-radius:50%;margin:0 auto 1rem;animation:r 1s linear infinite; }}
    @keyframes r {{ to {{ transform: rotate(360deg); }} }}
  </style>
</head>
<body>
  <div id="root">
    <div id="boot">
      <div class="spin"></div>
      <div><b>StatEasy</b> を起動しています…（版: 2026-07-09 更新版）</div>
      <div class="sub">初回はブラウザ内に統計ライブラリと日本語フォントを読み込むため<br>
      1〜2分ほどかかります。そのままお待ちください。</div>
      <div class="sub">開発：土居拓務・株式会社Miyabee</div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/@stlite/mountable@{STLITE_VERSION}/build/stlite.js"></script>
  <script>
    const BASE = {json.dumps(BASE)};
    const PATHS = {paths_json};
    const files = {{}};
    for (const p of PATHS) {{ files[p] = {{ url: BASE + p }}; }}
    stlite.mount(
      {{ requirements: {reqs_json}, entrypoint: "app.py", files: files }},
      document.getElementById("root")
    );
  </script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print(f"生成: {OUT}  ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    build()
