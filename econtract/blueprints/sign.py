"""署名ブループリント (公開URLで署名者がアクセス)."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    send_file,
    url_for,
)

from ..extensions import db
from ..models import AuditLog, Contract, ContractStatus, Signer, SignerStatus
from ..services.pdf import render_contract_pdf
from ..services.signing import (
    file_sha256,
    make_signature_hash,
    save_signature_image,
    stamp_signed_pdf,
)

bp = Blueprint("sign", __name__, url_prefix="/sign")


def _get_signer_or_404(token: str) -> Signer:
    signer = Signer.query.filter_by(access_token=token).first()
    if not signer:
        abort(404)
    return signer


@bp.route("/<token>")
def view(token: str):
    signer = _get_signer_or_404(token)
    contract = signer.contract
    if contract.status_enum in (ContractStatus.CANCELLED, ContractStatus.EXPIRED):
        return render_template("sign/closed.html", contract=contract, signer=signer)
    return render_template("sign/view.html", contract=contract, signer=signer)


@bp.route("/<token>/pdf")
def view_pdf(token: str):
    signer = _get_signer_or_404(token)
    contract = signer.contract
    path = contract.pdf_path
    if not path or not Path(path).exists():
        gen = Path(current_app.config["CONTRACT_PDF_DIR"]) / f"contract_{contract.id}.pdf"
        render_contract_pdf(
            gen,
            title=contract.title,
            body_text=contract.body or "",
            company_name=current_app.config["COMPANY_NAME"],
            contract_id=contract.id,
            creator_name=contract.creator.name,
            signers=contract.signers,
        )
        contract.pdf_path = str(gen)
        contract.document_hash = file_sha256(gen)
        db.session.commit()
        path = str(gen)
    return send_file(path, mimetype="application/pdf")


@bp.route("/<token>/sign", methods=["POST"])
def sign(token: str):
    signer = _get_signer_or_404(token)
    contract = signer.contract

    if contract.status_enum in (ContractStatus.CANCELLED, ContractStatus.EXPIRED, ContractStatus.COMPLETED):
        flash("この契約には署名できません。", "warning")
        return redirect(url_for("sign.view", token=token))
    if signer.status == SignerStatus.SIGNED.value:
        flash("既に署名済みです。", "info")
        return redirect(url_for("sign.view", token=token))

    if not request.form.get("agree"):
        flash("契約内容への同意にチェックを入れてください。", "danger")
        return redirect(url_for("sign.view", token=token))

    signature_text = (request.form.get("signature_text") or "").strip()
    signature_data_url = request.form.get("signature_image") or ""

    image_path = save_signature_image(
        signature_data_url,
        Path(current_app.config["SIGNATURE_DIR"]),
        f"signer_{signer.id}",
    )
    if not image_path and not signature_text:
        flash("お名前の入力または手書き署名を行ってください。", "danger")
        return redirect(url_for("sign.view", token=token))

    now = datetime.utcnow()
    signer.signed_at = now
    signer.signature_text = signature_text or signer.name
    signer.signature_image_path = str(image_path) if image_path else None
    signer.signed_ip = request.remote_addr
    signer.signed_user_agent = (request.headers.get("User-Agent") or "")[:255]
    signer.status = SignerStatus.SIGNED.value
    signer.signature_hash = make_signature_hash(
        str(contract.id),
        contract.document_hash or "",
        signer.email,
        signer.signature_text or "",
        now.isoformat(timespec="seconds"),
    )

    log = AuditLog(
        contract_id=contract.id,
        actor=f"{signer.name} <{signer.email}>",
        action="signed",
        detail=f"署名値: {signer.signature_hash[:16]}…",
        ip_address=request.remote_addr,
    )
    db.session.add(log)

    # 全員署名完了か判定
    if contract.is_fully_signed():
        contract.status = ContractStatus.COMPLETED.value
        contract.completed_at = now

        # 署名済PDFを生成
        sealed_path = Path(current_app.config["CONTRACT_PDF_DIR"]) / f"contract_{contract.id}_signed.pdf"
        stamp_signed_pdf(
            Path(contract.pdf_path) if contract.pdf_path else None,
            sealed_path,
            contract=contract,
            signers=contract.signers,
            company_name=current_app.config["COMPANY_NAME"],
        )
        contract.sealed_pdf_path = str(sealed_path)

        db.session.add(AuditLog(
            contract_id=contract.id,
            actor="system",
            action="completed",
            detail="全署名者の署名完了 — 契約締結",
            ip_address=request.remote_addr,
        ))
    else:
        contract.status = ContractStatus.PARTIALLY_SIGNED.value

    db.session.commit()
    return redirect(url_for("sign.done", token=token))


@bp.route("/<token>/decline", methods=["POST"])
def decline(token: str):
    signer = _get_signer_or_404(token)
    contract = signer.contract
    if signer.status != SignerStatus.PENDING.value:
        flash("既に対応済みです。", "info")
        return redirect(url_for("sign.view", token=token))
    reason = (request.form.get("reason") or "").strip()
    signer.status = SignerStatus.DECLINED.value
    signer.signed_at = datetime.utcnow()
    contract.status = ContractStatus.DECLINED.value
    db.session.add(AuditLog(
        contract_id=contract.id,
        actor=f"{signer.name} <{signer.email}>",
        action="declined",
        detail=reason or "理由なし",
        ip_address=request.remote_addr,
    ))
    db.session.commit()
    flash("署名を拒否しました。", "info")
    return redirect(url_for("sign.view", token=token))


@bp.route("/<token>/done")
def done(token: str):
    signer = _get_signer_or_404(token)
    return render_template("sign/done.html", signer=signer, contract=signer.contract)
