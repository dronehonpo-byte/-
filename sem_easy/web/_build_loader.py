"""ブラウザ実行版（stlite）のローダ HTML を生成する。

アプリ本体・日本語フォント・semopy ホイールを jsDelivr（GitHub 公開ミラー）
から読み込むため、HTML 自体は数 KB に収まる。
統計計算はブラウザ内の Pyodide 上で semopy / SciPy が実行するため、
「生成 AI を計算に使わない」原則はそのまま維持される。

  python web/_build_loader.py <commit_sha>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "loader.html"

REPO = "dronehonpo-byte/-"
DEFAULT_COMMIT = "main"

# 仮想ファイルシステムに載せるファイル
PATHS = [
    "app.py",
    "users.json",
    "modules/__init__.py", "modules/common.py", "modules/auth.py",
    "modules/data_loader.py", "modules/scales.py", "modules/model_spec.py",
    "modules/fitindices.py", "modules/estimator.py", "modules/candidates.py",
    "modules/pathdiagram.py", "modules/interpret.py", "modules/reproduce.py",
    "exporters/__init__.py", "exporters/tables.py", "exporters/excel_exporter.py",
    "exporters/word_exporter.py", "exporters/pdf_exporter.py",
    "pages/00_home.py", "pages/01_data.py", "pages/02_check.py",
    "pages/03_model.py", "pages/04_estimate.py", "pages/05_result.py",
    "sample_data/sample_cfa_正常例.csv",
    "sample_data/sample_媒介モデル.csv",
    "sample_data/sample_順序尺度_5件法.csv",
    "sample_data/sample_欠損あり.csv",
    "sample_data/sample_問題データ.csv",
    "assets/fonts/ipaexg.ttf",
    ".streamlit/config.toml",
]

# Pyodide 標準で入るもの。semopy と numdifftools は同梱ホイールから導入する。
BASE_REQUIREMENTS = [
    "numpy", "pandas", "scipy", "statsmodels", "scikit-learn",
    "sympy", "matplotlib", "openpyxl", "python-docx", "chardet",
]
WHEELS = [
    "web/wheels/numdifftools-0.10.1-py3-none-any.whl",
    "web/wheels/semopy-2.3.11-py3-none-any.whl",
]

STLITE_VERSION = "0.75.0"


def build(commit: str = DEFAULT_COMMIT) -> None:
    base = f"https://cdn.jsdelivr.net/gh/{REPO}@{commit}/sem_easy/"
    reqs = BASE_REQUIREMENTS + [base + w for w in WHEELS]
    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SEMEasy — 共分散構造分析ツール</title>
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@stlite/mountable@{STLITE_VERSION}/build/stlite.css" />
  <style>
    html, body, #root {{ height: 100%; margin: 0; }}
    #boot {{ font-family: "Hiragino Sans","Noto Sans JP",sans-serif; color:#1E4E79;
            text-align:center; padding:15vh 1rem; }}
    #boot .sub {{ color:#5A6B7B; font-size:.9rem; margin-top:.6rem; line-height:1.7; }}
    .spin {{ width:40px;height:40px;border:4px solid #D6E0EA;border-top-color:#1E4E79;
            border-radius:50%;margin:0 auto 1.2rem;animation:r 1s linear infinite; }}
    @keyframes r {{ to {{ transform: rotate(360deg); }} }}
  </style>
</head>
<body>
  <div id="root">
    <div id="boot">
      <div class="spin"></div>
      <div style="font-size:1.15rem;"><b>SEMEasy</b> を起動しています…</div>
      <div class="sub">
        初回はブラウザ内に統計ライブラリ（SciPy・statsmodels・semopy）と<br>
        日本語フォントを読み込むため、<b>2〜3分ほど</b>かかります。<br>
        そのままお待ちください。
      </div>
      <div class="sub">開発：株式会社Miyabee</div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/@stlite/mountable@{STLITE_VERSION}/build/stlite.js"></script>
  <script>
    const BASE = {json.dumps(base)};
    const PATHS = {json.dumps(PATHS, ensure_ascii=False)};
    const files = {{}};
    for (const p of PATHS) {{ files[p] = {{ url: BASE + encodeURI(p) }}; }}
    stlite.mount(
      {{ requirements: {json.dumps(reqs)}, entrypoint: "app.py", files: files }},
      document.getElementById("root")
    );
  </script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    print(f"生成: {OUT} ({OUT.stat().st_size} bytes) commit={commit}")


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_COMMIT)
