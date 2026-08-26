"""PDF 出力（日本語フォント対応）。"""
from __future__ import annotations

from io import BytesIO

import pandas as pd

_FONT = "HeiseiKakuGo-W5"


def _font() -> str:
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont

    try:
        pdfmetrics.registerFont(UnicodeCIDFont(_FONT))
        return _FONT
    except Exception:  # noqa: BLE001
        return "Helvetica"


def export(result, tables: dict, images: list | None = None,
           heading: str = "SEM 分析レポート") -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (Image, Paragraph, SimpleDocTemplate, Spacer,
                                    Table, TableStyle)

    font = _font()
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm,
                            leftMargin=15 * mm, rightMargin=15 * mm)
    ss = getSampleStyleSheet()
    title = ParagraphStyle("t", parent=ss["Title"], fontName=font)
    h2 = ParagraphStyle("h2", parent=ss["Heading2"], fontName=font, fontSize=12)
    normal = ParagraphStyle("n", parent=ss["Normal"], fontName=font, fontSize=9, leading=13)

    el = [Paragraph(heading, title),
          Paragraph(f"モデル：{result.model_name}", normal),
          Paragraph(f"推定法：{result.estimator}／分析に用いた n = {result.n_used:,}", normal),
          Spacer(1, 8)]

    if images:
        el.append(Paragraph("パス図", h2))
        for caption, png in images:
            el.append(Image(BytesIO(png), width=165 * mm, height=100 * mm, kind="proportional"))
            el.append(Paragraph(caption, normal))
            el.append(Spacer(1, 8))

    for name, df in tables.items():
        if df is None or len(df) == 0:
            continue
        el.append(Paragraph(str(name), h2))
        data = [[Paragraph(f"<b>{c}</b>", normal) for c in df.columns]]
        for _, row in df.iterrows():
            data.append([Paragraph(_fmt(v), normal) for v in row.tolist()])
        t = Table(data, hAlign="LEFT", repeatRows=1)
        t.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), font),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E4E79")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("LINEABOVE", (0, 0), (-1, 0), 1.4, colors.black),
            ("LINEBELOW", (0, 0), (-1, 0), 0.7, colors.black),
            ("LINEBELOW", (0, -1), (-1, -1), 1.4, colors.black),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        el += [t, Spacer(1, 10)]

    el.append(Spacer(1, 12))
    el.append(Paragraph("開発：株式会社Miyabee", normal))
    doc.build(el)
    buf.seek(0)
    return buf.getvalue()


def _fmt(v) -> str:
    if isinstance(v, float):
        if v != v:
            return "—"
        return f"{v:.4f}".rstrip("0").rstrip(".")
    return str(v)
