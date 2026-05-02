"""契約書管理ブループリント."""
from __future__ import annotations

import json
import re
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
from flask_login import current_user, login_required
from sqlalchemy import or_
from werkzeug.utils import secure_filename

from ..extensions import db
from ..models import (
    AuditLog,
    Contract,
    ContractStatus,
    Signer,
    SignerStatus,
    Template,
    User,
)
from ..services.pdf import render_completion_certificate, render_contract_pdf
from ..services.signing import file_sha256, text_sha256

bp = Blueprint("contracts", __name__, url_prefix="/contracts")


def _allowed_pdf(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]


def _log(contract: Contract, actor: str, action: str, detail: str = "") -> None:
    log = AuditLog(
        contract_id=contract.id,
        actor=actor,
        action=action,
        detail=detail,
        ip_address=request.remote_addr,
    )
    db.session.add(log)


def _accessible_q():
    """ログイン中ユーザーが閲覧できる契約のクエリ."""
    if current_user.is_admin:
        return Contract.query
    return Contract.query.filter(Contract.creator_id == current_user.id)


@bp.route("/")
@login_required
def list_contracts():
    status = request.args.get("status")
    q = (request.args.get("q") or "").strip()
    query = _accessible_q()
    if status:
        query = query.filter(Contract.status == status)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Contract.title.ilike(like), Contract.description.ilike(like)))
    contracts = query.order_by(Contract.updated_at.desc()).all()
    return render_template(
        "contracts/list.html",
        contracts=contracts,
        statuses=ContractStatus,
        current_status=status,
        q=q,
    )


@bp.route("/new", methods=["GET", "POST"])
@login_required
def new():
    templates = Template.query.order_by(Template.category, Template.name).all()
    if request.method == "POST":
        return _save_new(templates)
    template_id = request.args.get("template_id", type=int)
    selected_template = Template.query.get(template_id) if template_id else None
    return render_template(
        "contracts/new.html",
        templates=templates,
        selected_template=selected_template,
    )


def _save_new(templates):
    title = (request.form.get("title") or "").strip()
    description = (request.form.get("description") or "").strip()
    body = (request.form.get("body") or "").strip()
    expires_at_raw = request.form.get("expires_at")
    template_id = request.form.get("template_id", type=int)

    if not title or not body:
        flash("タイトルと本文は必須です。", "danger")
        return render_template("contracts/new.html", templates=templates)

    expires_at = None
    if expires_at_raw:
        try:
            expires_at = datetime.strptime(expires_at_raw, "%Y-%m-%d")
        except ValueError:
            flash("有効期限の形式が不正です。", "warning")

    contract = Contract(
        title=title,
        description=description,
        body=body,
        creator_id=current_user.id,
        template_id=template_id if template_id else None,
        expires_at=expires_at,
        status=ContractStatus.DRAFT.value,
    )
    db.session.add(contract)
    db.session.flush()  # id を採番

    # 署名者の取り込み
    names = request.form.getlist("signer_name[]")
    emails = request.form.getlist("signer_email[]")
    companies = request.form.getlist("signer_company[]")
    roles = request.form.getlist("signer_role[]")
    for i, (n, e) in enumerate(zip(names, emails)):
        n = (n or "").strip()
        e = (e or "").strip().lower()
        if not n or not e:
            continue
        signer = Signer(
            contract_id=contract.id,
            name=n,
            email=e,
            company=(companies[i] if i < len(companies) else "").strip() or None,
            role=(roles[i] if i < len(roles) else "counterparty"),
            order=i + 1,
        )
        db.session.add(signer)

    # PDF アップロード（任意）
    file = request.files.get("pdf_file")
    if file and file.filename:
        if not _allowed_pdf(file.filename):
            flash("PDF 以外のファイルはアップロードできません。", "danger")
            db.session.rollback()
            return redirect(url_for("contracts.new"))
        filename = secure_filename(f"contract_{contract.id}_{file.filename}")
        path = Path(current_app.config["CONTRACT_PDF_DIR"]) / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        file.save(str(path))
        contract.pdf_path = str(path)
        contract.document_hash = file_sha256(path)
    else:
        contract.document_hash = text_sha256(f"{contract.title}\n{contract.body}")

    _log(contract, current_user.name, "created", f"契約「{contract.title}」を作成")
    db.session.commit()
    flash("契約を作成しました。署名者に送信できます。", "success")
    return redirect(url_for("contracts.detail", contract_id=contract.id))


@bp.route("/<int:contract_id>")
@login_required
def detail(contract_id: int):
    contract = _accessible_q().filter(Contract.id == contract_id).first_or_404()
    return render_template("contracts/detail.html", contract=contract)


@bp.route("/<int:contract_id>/edit", methods=["GET", "POST"])
@login_required
def edit(contract_id: int):
    contract = _accessible_q().filter(Contract.id == contract_id).first_or_404()
    if contract.status_enum != ContractStatus.DRAFT:
        flash("下書き状態の契約のみ編集できます。", "warning")
        return redirect(url_for("contracts.detail", contract_id=contract.id))

    if request.method == "POST":
        contract.title = (request.form.get("title") or contract.title).strip()
        contract.description = (request.form.get("description") or "").strip()
        contract.body = (request.form.get("body") or contract.body).strip()
        expires_at_raw = request.form.get("expires_at")
        contract.expires_at = (
            datetime.strptime(expires_at_raw, "%Y-%m-%d") if expires_at_raw else None
        )
        # 署名者を再構築
        contract.signers.clear()
        db.session.flush()
        names = request.form.getlist("signer_name[]")
        emails = request.form.getlist("signer_email[]")
        companies = request.form.getlist("signer_company[]")
        roles = request.form.getlist("signer_role[]")
        for i, (n, e) in enumerate(zip(names, emails)):
            n = (n or "").strip()
            e = (e or "").strip().lower()
            if not n or not e:
                continue
            db.session.add(Signer(
                contract_id=contract.id,
                name=n, email=e,
                company=(companies[i] if i < len(companies) else "").strip() or None,
                role=(roles[i] if i < len(roles) else "counterparty"),
                order=i + 1,
            ))
        contract.document_hash = text_sha256(f"{contract.title}\n{contract.body}")
        _log(contract, current_user.name, "updated", "契約を編集")
        db.session.commit()
        flash("契約を更新しました。", "success")
        return redirect(url_for("contracts.detail", contract_id=contract.id))
    return render_template("contracts/edit.html", contract=contract)


@bp.route("/<int:contract_id>/send", methods=["POST"])
@login_required
def send(contract_id: int):
    contract = _accessible_q().filter(Contract.id == contract_id).first_or_404()
    if contract.status_enum != ContractStatus.DRAFT:
        flash("既に送信済みです。", "info")
        return redirect(url_for("contracts.detail", contract_id=contract.id))
    if not contract.signers:
        flash("署名者を1名以上追加してください。", "danger")
        return redirect(url_for("contracts.detail", contract_id=contract.id))

    # 本文 PDF が無ければ自動生成
    if not contract.pdf_path:
        path = Path(current_app.config["CONTRACT_PDF_DIR"]) / f"contract_{contract.id}.pdf"
        render_contract_pdf(
            path,
            title=contract.title,
            body_text=contract.body or "",
            company_name=current_app.config["COMPANY_NAME"],
            contract_id=contract.id,
            creator_name=contract.creator.name,
            signers=contract.signers,
        )
        contract.pdf_path = str(path)
        contract.document_hash = file_sha256(path)

    contract.status = ContractStatus.SENT.value
    _log(contract, current_user.name, "sent", f"{len(contract.signers)} 名に署名依頼を送信")
    db.session.commit()
    flash("署名依頼を送信しました。署名URLを各担当者に共有してください。", "success")
    return redirect(url_for("contracts.detail", contract_id=contract.id))


@bp.route("/<int:contract_id>/cancel", methods=["POST"])
@login_required
def cancel(contract_id: int):
    contract = _accessible_q().filter(Contract.id == contract_id).first_or_404()
    if contract.status_enum in (ContractStatus.COMPLETED, ContractStatus.CANCELLED):
        flash("この契約は取り消しできません。", "warning")
        return redirect(url_for("contracts.detail", contract_id=contract.id))
    contract.status = ContractStatus.CANCELLED.value
    _log(contract, current_user.name, "cancelled", "契約を取り消し")
    db.session.commit()
    flash("契約を取り消しました。", "info")
    return redirect(url_for("contracts.detail", contract_id=contract.id))


@bp.route("/<int:contract_id>/pdf")
@login_required
def download_pdf(contract_id: int):
    contract = _accessible_q().filter(Contract.id == contract_id).first_or_404()
    path = contract.sealed_pdf_path or contract.pdf_path
    if not path or not Path(path).exists():
        # 動的生成
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
        db.session.commit()
        path = str(gen)
    return send_file(path, as_attachment=True, download_name=f"contract_{contract.id}.pdf")


@bp.route("/<int:contract_id>/certificate")
@login_required
def download_certificate(contract_id: int):
    contract = _accessible_q().filter(Contract.id == contract_id).first_or_404()
    if contract.status_enum != ContractStatus.COMPLETED:
        flash("締結完了後に証明書をダウンロードできます。", "warning")
        return redirect(url_for("contracts.detail", contract_id=contract.id))
    path = Path(current_app.config["CONTRACT_PDF_DIR"]) / f"certificate_{contract.id}.pdf"
    render_completion_certificate(
        path,
        contract=contract,
        audit_logs=contract.audit_logs,
        company_name=current_app.config["COMPANY_NAME"],
    )
    return send_file(path, as_attachment=True, download_name=f"certificate_{contract.id}.pdf")


@bp.route("/templates")
@login_required
def template_list():
    templates = Template.query.order_by(Template.category, Template.name).all()
    return render_template("contracts/templates.html", templates=templates)


@bp.route("/templates/<int:template_id>")
@login_required
def template_detail(template_id: int):
    tpl = Template.query.get_or_404(template_id)
    variables = json.loads(tpl.variables_json or "[]")
    return render_template("contracts/template_detail.html", template=tpl, variables=variables)


@bp.route("/templates/<int:template_id>/use", methods=["POST"])
@login_required
def template_use(template_id: int):
    """テンプレートに変数を注入して新規作成画面に遷移."""
    tpl = Template.query.get_or_404(template_id)
    body = tpl.body
    for key, value in request.form.items():
        if key.startswith("var_"):
            var_name = key[4:]
            body = body.replace("{{" + var_name + "}}", value or "")
    # 残った {{...}} を空欄にしておく
    body = re.sub(r"\{\{[^}]+\}\}", "____", body)
    return render_template(
        "contracts/new.html",
        templates=Template.query.order_by(Template.name).all(),
        prefilled_title=tpl.name,
        prefilled_body=body,
        selected_template=tpl,
    )
