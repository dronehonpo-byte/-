"""PDF 出力。reportlab で日本語フォント対応の APA 風表を生成する。"""
from __future__ import annotations

from io import BytesIO

import pandas as pd

_FONT_NAME = "HeiseiKakuGo-W5"  # reportlab 同梱の日本語 CID フォント


def _register_font() -> str:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont

    try:
        pdfmetrics.registerFont(UnicodeCIDFont(_FONT_NAME))
        return _FONT_NAME
    except Exception:
        return "Helvetica"


def export_report(tables: dict[str, pd.DataFrame], images: list[tuple] | None = None,
                 heading: str = "StatEasy 解析レポート") -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image,
    )

    font = _register_font()
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("t", parent=styles["Title"], fontName=font)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName=font)
    normal = ParagraphStyle("n", parent=styles["Normal"], fontName=font)

    elements = [Paragraph(heading, title_style), Spacer(1, 8)]

    for title, df in tables.items():
        elements.append(Paragraph(str(title), h2))
        data = [list(map(str, df.columns))]
        for _, row in df.iterrows():
            data.append([_fmt(v) for v in row.tolist()])
        tbl = Table(data, hAlign="LEFT")
        tbl.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), font),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E6091")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("LINEABOVE", (0, 0), (-1, 0), 1.5, colors.black),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.black),
                    ("LINEBELOW", (0, -1), (-1, -1), 1.5, colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        elements += [tbl, Spacer(1, 12)]

    if images:
        elements.append(Paragraph("図", h2))
        for caption, png in images:
            elements.append(Image(BytesIO(png), width=140 * mm, height=90 * mm,
                                  kind="proportional"))
            elements.append(Paragraph(caption, normal))
            elements.append(Spacer(1, 10))

    elements.append(Spacer(1, 16))
    elements.append(Paragraph("開発：土居拓務・株式会社Miyabee", normal))

    doc.build(elements)
    buf.seek(0)
    return buf.getvalue()


def _fmt(v):
    if isinstance(v, float):
        return f"{v:.4f}".rstrip("0").rstrip(".") if v == v else "—"
    return str(v)
