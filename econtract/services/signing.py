"""電子署名関連ユーティリティ."""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import os
from datetime import datetime
from pathlib import Path

from flask import current_app


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def text_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def make_signature_hash(*parts: str) -> str:
    """各パートを連結し、アプリのシークレットで HMAC-SHA256 を計算."""
    secret = current_app.config["SECRET_KEY"].encode("utf-8")
    msg = "|".join(parts).encode("utf-8")
    return hmac.new(secret, msg, hashlib.sha256).hexdigest()


def save_signature_image(data_url: str, dest_dir: Path, filename_base: str) -> Path | None:
    """data:image/png;base64,... のデータURLを保存."""
    if not data_url or "," not in data_url:
        return None
    header, payload = data_url.split(",", 1)
    if "base64" not in header:
        return None
    try:
        raw = base64.b64decode(payload)
    except Exception:
        return None
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / f"{filename_base}.png"
    with open(path, "wb") as f:
        f.write(raw)
    return path


def stamp_signed_pdf(
    source_pdf: Path,
    dest_pdf: Path,
    *,
    contract,
    signers,
    company_name: str,
) -> Path:
    """完了済みPDFを生成. 既存PDFがある場合は最終ページに署名情報ページを追加."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont

    try:
        pdfmetrics.getFont("HeiseiKakuGo-W5")
    except KeyError:
        pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
    font = "HeiseiKakuGo-W5"

    dest_pdf = Path(dest_pdf)
    dest_pdf.parent.mkdir(parents=True, exist_ok=True)

    # 署名証明ページを生成
    cert_buf = io.BytesIO()
    c = canvas.Canvas(cert_buf, pagesize=A4)
    width, height = A4

    c.setFillColor(colors.HexColor("#1f3a8a"))
    c.rect(0, height - 25 * mm, width, 25 * mm, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont(font, 18)
    c.drawString(20 * mm, height - 16 * mm, "電子署名 証明ページ")
    c.setFont(font, 10)
    c.drawRightString(width - 20 * mm, height - 16 * mm, company_name)

    c.setFillColor(colors.black)
    y = height - 40 * mm
    c.setFont(font, 11)
    c.drawString(20 * mm, y, f"契約番号: C-{contract.id:06d}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"契約名: {contract.title}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"締結日時: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"文書ハッシュ: {contract.document_hash or '—'}")
    y -= 10 * mm

    c.setFont(font, 12)
    c.setFillColor(colors.HexColor("#1f3a8a"))
    c.drawString(20 * mm, y, "署名者")
    y -= 8 * mm
    c.setFillColor(colors.black)

    for s in signers:
        c.setFont(font, 11)
        c.drawString(22 * mm, y, f"● {s.name}（{s.company or '個人'}）")
        y -= 5 * mm
        c.setFont(font, 9)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(26 * mm, y, f"メール: {s.email}")
        y -= 4.5 * mm
        c.drawString(
            26 * mm, y,
            f"署名日時: {s.signed_at.strftime('%Y-%m-%d %H:%M:%S UTC') if s.signed_at else '—'}　IP: {s.signed_ip or '—'}",
        )
        y -= 4.5 * mm
        c.drawString(26 * mm, y, f"署名値(HMAC-SHA256): {(s.signature_hash or '')[:48]}…")
        y -= 4.5 * mm
        if s.signature_image_path and Path(s.signature_image_path).exists():
            try:
                c.drawImage(
                    str(s.signature_image_path),
                    26 * mm, y - 18 * mm,
                    width=50 * mm, height=18 * mm,
                    preserveAspectRatio=True, mask="auto",
                )
                y -= 22 * mm
            except Exception:
                y -= 4 * mm
        elif s.signature_text:
            c.setFont(font, 14)
            c.setFillColor(colors.HexColor("#1f3a8a"))
            c.drawString(26 * mm, y - 6 * mm, s.signature_text)
            y -= 12 * mm
        c.setFillColor(colors.black)
        y -= 4 * mm
        if y < 40 * mm:
            c.showPage()
            y = height - 20 * mm

    c.setFont(font, 8)
    c.setFillColor(colors.grey)
    c.drawString(
        20 * mm, 15 * mm,
        "この証明ページは電子契約サービスにより自動生成されました。"
        "署名値は契約内容・署名者情報・タイムスタンプを基に生成された一意のハッシュです。",
    )
    c.showPage()
    c.save()
    cert_buf.seek(0)

    # 既存PDFと結合（pypdf を使えればベスト、なければ証明ページのみ書き出し）
    try:
        from pypdf import PdfReader, PdfWriter

        writer = PdfWriter()
        if source_pdf and Path(source_pdf).exists():
            reader = PdfReader(str(source_pdf))
            for p in reader.pages:
                writer.add_page(p)
        cert_reader = PdfReader(cert_buf)
        for p in cert_reader.pages:
            writer.add_page(p)
        with open(dest_pdf, "wb") as f:
            writer.write(f)
    except Exception:
        # pypdf が利用できない／結合に失敗した場合は証明ページのみ書き出し
        with open(dest_pdf, "wb") as f:
            f.write(cert_buf.getvalue())

    return dest_pdf
