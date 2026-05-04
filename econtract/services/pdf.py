"""契約書 PDF 生成サービス."""
from __future__ import annotations

import io
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# 日本語フォント登録（reportlab 標準同梱の CID フォント）
_FONT_REGISTERED = False


def _ensure_font() -> str:
    global _FONT_REGISTERED
    if not _FONT_REGISTERED:
        pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
        _FONT_REGISTERED = True
    return "HeiseiKakuGo-W5"


def _styles():
    font = _ensure_font()
    base = getSampleStyleSheet()
    title = ParagraphStyle(
        "JpTitle",
        parent=base["Title"],
        fontName=font,
        fontSize=20,
        leading=28,
        spaceAfter=12,
        alignment=1,
    )
    h2 = ParagraphStyle(
        "JpH2",
        parent=base["Heading2"],
        fontName=font,
        fontSize=13,
        leading=20,
        spaceBefore=10,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "JpBody",
        parent=base["BodyText"],
        fontName=font,
        fontSize=10.5,
        leading=18,
    )
    small = ParagraphStyle(
        "JpSmall",
        parent=base["BodyText"],
        fontName=font,
        fontSize=9,
        leading=14,
        textColor=colors.grey,
    )
    return font, title, h2, body, small


def render_contract_pdf(
    output_path: Path,
    *,
    title: str,
    body_text: str,
    company_name: str,
    contract_id: int,
    creator_name: str,
    signers: Iterable,
    issued_at: datetime | None = None,
) -> Path:
    """契約書本文を PDF に描画して保存する."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    font, title_st, h2_st, body_st, small_st = _styles()

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=22 * mm,
        bottomMargin=22 * mm,
        title=title,
        author=company_name,
    )

    story = []
    story.append(Paragraph(title, title_st))
    story.append(Paragraph(
        f"契約番号 C-{contract_id:06d}　/　発行日 {(issued_at or datetime.utcnow()).strftime('%Y年%m月%d日')}",
        small_st,
    ))
    story.append(Spacer(1, 6))

    # 本文 — 段落ごとに描画
    for paragraph in body_text.split("\n\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        # 見出し風の行（第○条）は h2 で
        first_line = paragraph.splitlines()[0]
        if first_line.startswith("第") and "条" in first_line[:6]:
            story.append(Paragraph(first_line, h2_st))
            rest = "\n".join(paragraph.splitlines()[1:]).strip()
            if rest:
                story.append(Paragraph(rest.replace("\n", "<br/>"), body_st))
        else:
            story.append(Paragraph(paragraph.replace("\n", "<br/>"), body_st))

    story.append(Spacer(1, 14))
    story.append(Paragraph("署名欄", h2_st))

    rows = [["氏名", "会社・所属", "メール", "署名状況", "署名日時"]]
    for s in signers:
        signed_at = s.signed_at.strftime("%Y-%m-%d %H:%M") if getattr(s, "signed_at", None) else "—"
        rows.append([
            s.name,
            s.company or "",
            s.email,
            getattr(s, "status_enum", None).label if getattr(s, "status_enum", None) else "未署名",
            signed_at,
        ])
    table = Table(rows, colWidths=[28 * mm, 36 * mm, 50 * mm, 22 * mm, 30 * mm])
    table.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3a8a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)

    story.append(Spacer(1, 18))
    story.append(Paragraph(
        f"発行者: {company_name}　担当: {creator_name}",
        small_st,
    ))
    doc.build(story)
    return output_path


def render_completion_certificate(
    output_path: Path,
    *,
    contract,
    audit_logs: Iterable,
    company_name: str,
) -> Path:
    """締結完了証明書 PDF を生成."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    font, title_st, h2_st, body_st, small_st = _styles()

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
        title=f"締結証明書 - {contract.title}",
    )
    story = []
    story.append(Paragraph("電子契約 締結証明書", title_st))
    story.append(Spacer(1, 6))

    info = [
        ["契約番号", f"C-{contract.id:06d}"],
        ["契約名", contract.title],
        ["発行者", company_name],
        ["作成者", contract.creator.name if contract.creator else ""],
        ["作成日時", contract.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")],
        ["締結日時", contract.completed_at.strftime("%Y-%m-%d %H:%M:%S UTC") if contract.completed_at else "—"],
        ["文書ハッシュ (SHA-256)", contract.document_hash or "—"],
    ]
    info_table = Table(info, colWidths=[40 * mm, 130 * mm])
    info_table.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 10),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef2ff")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("署名者一覧", h2_st))
    rows = [["氏名", "会社", "メール", "署名日時", "IPアドレス", "署名値(先頭16桁)"]]
    for s in contract.signers:
        rows.append([
            s.name,
            s.company or "",
            s.email,
            s.signed_at.strftime("%Y-%m-%d %H:%M:%S") if s.signed_at else "—",
            s.signed_ip or "—",
            (s.signature_hash or "")[:16],
        ])
    t = Table(rows, colWidths=[24 * mm, 28 * mm, 44 * mm, 30 * mm, 22 * mm, 28 * mm])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 8.5),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3a8a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(t)
    story.append(Spacer(1, 14))

    story.append(Paragraph("監査ログ", h2_st))
    log_rows = [["日時 (UTC)", "実行者", "操作", "詳細", "IP"]]
    for log in audit_logs:
        log_rows.append([
            log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            log.actor,
            log.action,
            textwrap.shorten(log.detail or "", width=60, placeholder="…"),
            log.ip_address or "—",
        ])
    lt = Table(log_rows, colWidths=[30 * mm, 32 * mm, 22 * mm, 70 * mm, 22 * mm])
    lt.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), font, 8),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdfa")]),
    ]))
    story.append(lt)

    story.append(Spacer(1, 18))
    story.append(Paragraph(
        "本証明書は、上記契約が当社電子契約サービス上で電子的に締結されたことを証明するものです。"
        "署名値は契約本文・署名者・タイムスタンプに対して HMAC-SHA256 によって生成されています。",
        small_st,
    ))
    doc.build(story)
    return output_path


def bytes_render_contract_pdf(**kwargs) -> bytes:
    buf = io.BytesIO()
    # Re-render to bytes (used for hashing before saving if needed)
    from contextlib import redirect_stdout
    tmp_path = kwargs.pop("output_path")
    with open(tmp_path, "rb") as f:
        return f.read()
