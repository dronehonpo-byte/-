"""Word(.docx) 出力。python-docx で APA 風三線表と Methods テンプレートを生成。"""
from __future__ import annotations

from io import BytesIO

import pandas as pd

METHODS_TEMPLATE = (
    "【統計手法（Methods）テンプレート】\n"
    "本研究の統計解析はすべて Python の統計ライブラリ（SciPy, statsmodels, "
    "scikit-learn, pandas, NumPy）を用いて実施した。生成 AI による推定は一切用いておらず、"
    "同一データ・同一設定に対して常に同一の結果が得られる再現性を担保している。"
    "2 群の比較では正規性（Shapiro-Wilk 検定）と等分散性（Levene 検定）を確認した上で、"
    "適切な検定（t 検定／Mann-Whitney U 検定等）を選択した。"
    "効果量（Cohen's d / Hedges' g 等）と 95% 信頼区間を併記し、"
    "有意水準は両側 5% とした。"
)


def _add_apa_table(doc, df: pd.DataFrame, title: str | None = None):
    from docx.shared import Pt
    from docx.enum.table import WD_TABLE_ALIGNMENT

    if title:
        doc.add_heading(title, level=2)
    table = doc.add_table(rows=1, cols=len(df.columns))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"

    hdr = table.rows[0].cells
    for i, col in enumerate(df.columns):
        hdr[i].text = str(col)
        for p in hdr[i].paragraphs:
            for r in p.runs:
                r.font.bold = True
                r.font.size = Pt(10)

    for _, row in df.iterrows():
        cells = table.add_row().cells
        for i, v in enumerate(row.tolist()):
            cells[i].text = _fmt(v)
            for p in cells[i].paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
    return table


def export_report(tables: dict[str, pd.DataFrame], images: list[tuple] | None = None,
                 include_methods: bool = True, heading: str = "StatEasy 解析レポート") -> bytes:
    """tables: タイトル->DataFrame、images: [(キャプション, png_bytes), ...]。"""
    from docx import Document
    from docx.shared import Inches

    doc = Document()
    doc.add_heading(heading, level=0)

    for title, df in tables.items():
        _add_apa_table(doc, df, title)
        doc.add_paragraph("")

    if images:
        doc.add_heading("図", level=1)
        for caption, png in images:
            doc.add_picture(BytesIO(png), width=Inches(5.5))
            cap = doc.add_paragraph(caption)
            cap.alignment = 1

    if include_methods:
        doc.add_heading("統計手法（Methods）", level=1)
        doc.add_paragraph(METHODS_TEMPLATE)

    doc.add_paragraph("")
    footer = doc.add_paragraph("考案：土居拓務 ／ 制作：株式会社Miyabee")
    footer.alignment = 1

    buf = BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()


def _fmt(v):
    if isinstance(v, float):
        return f"{v:.4f}".rstrip("0").rstrip(".") if v == v else "—"
    return str(v)
