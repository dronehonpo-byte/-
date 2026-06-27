"""認証 — お客様(電話/SMS)、ドライバー(電話+PW)、管理者(ID+PW)、業者登録."""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from flask import (
    Blueprint,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)
from werkzeug.utils import secure_filename

from ..auth import (
    current_customer,
    login_admin,
    login_customer,
    login_driver,
    logout,
)
from ..extensions import db
from ..models import (
    PAYMENT_METHOD_KEYS,
    Admin,
    Customer,
    Driver,
    Vendor,
    VendorStatus,
)
from ..services import sms
from ..services.notifications import notify_admins

bp = Blueprint("auth", __name__, url_prefix="/auth")


# ─────────────────────────────────────────────
# お客様：電話番号 + SMS 認証コード（パスワード不要）
# ─────────────────────────────────────────────
@bp.route("/customer/login", methods=["GET", "POST"])
def customer_login():
    if current_customer() is not None:
        return redirect(url_for("customer.home"))

    if request.method == "POST":
        phone = sms.normalize_phone(request.form.get("phone", ""))
        if len(phone) < 10:
            flash("電話番号を正しく入力してください。", "danger")
            return render_template("auth/customer_login.html")
        dev_code = sms.send_code(phone)
        flash("認証コードを送信しました。", "info")
        return render_template(
            "auth/customer_verify.html", phone=phone, dev_code=dev_code
        )

    return render_template("auth/customer_login.html")


@bp.route("/customer/verify", methods=["POST"])
def customer_verify():
    phone = sms.normalize_phone(request.form.get("phone", ""))
    code = request.form.get("code", "")
    if not sms.verify_code(phone, code):
        flash("認証コードが正しくないか、有効期限が切れました。", "danger")
        return render_template("auth/customer_verify.html", phone=phone, dev_code=None)

    customer = Customer.query.filter_by(phone=phone).first()
    is_new = customer is None
    if is_new:
        customer = Customer(phone=phone)
        db.session.add(customer)
        db.session.commit()

    login_customer(customer)
    if is_new or not customer.display_name:
        return redirect(url_for("customer.profile"))
    flash("ログインしました。", "success")
    return redirect(request.args.get("next") or url_for("customer.home"))


# ─────────────────────────────────────────────
# ドライバー：電話番号 + パスワード
# ─────────────────────────────────────────────
@bp.route("/driver/login", methods=["GET", "POST"])
def driver_login():
    if request.method == "POST":
        phone = sms.normalize_phone(request.form.get("phone", ""))
        password = request.form.get("password", "")
        driver = Driver.query.filter_by(phone=phone).first()
        if driver is None or not driver.check_password(password):
            flash("電話番号またはパスワードが違います。", "danger")
            return render_template("auth/driver_login.html")
        if driver.vendor and driver.vendor.status == VendorStatus.PENDING:
            flash("業者の承認待ちです。承認後にご利用いただけます。", "warning")
        login_driver(driver)
        return redirect(request.args.get("next") or url_for("driver.dashboard"))
    return render_template("auth/driver_login.html")


# ─────────────────────────────────────────────
# 業者登録（認定書アップロード → 管理者承認）
# 初回は代表ドライバー1名を同時に作成する
# ─────────────────────────────────────────────
@bp.route("/vendor/register", methods=["GET", "POST"])
def vendor_register():
    if request.method == "POST":
        form = request.form
        vendor_name = form.get("vendor_name", "").strip()
        vendor_phone = sms.normalize_phone(form.get("vendor_phone", ""))
        driver_name = form.get("driver_name", "").strip()
        driver_phone = sms.normalize_phone(form.get("driver_phone", ""))
        password = form.get("password", "")
        payment_methods = [k for k in form.getlist("payment_methods") if k in PAYMENT_METHOD_KEYS]

        errors = []
        if not vendor_name:
            errors.append("業者名を入力してください。")
        if len(vendor_phone) < 10:
            errors.append("業者の電話番号を正しく入力してください。")
        if not driver_name:
            errors.append("代表ドライバー名を入力してください。")
        if len(driver_phone) < 10:
            errors.append("ドライバーの電話番号を正しく入力してください。")
        if len(password) < 6:
            errors.append("パスワードは6文字以上にしてください。")
        if Driver.query.filter_by(phone=driver_phone).first():
            errors.append("このドライバー電話番号は既に登録されています。")

        cert = request.files.get("cert")
        cert_filename = None
        if cert and cert.filename:
            ext = cert.filename.rsplit(".", 1)[-1].lower() if "." in cert.filename else ""
            if ext not in current_app.config["ALLOWED_CERT_EXTENSIONS"]:
                errors.append("認定書は PDF または画像（png/jpg）でアップロードしてください。")
            else:
                Path(current_app.config["CERT_DIR"]).mkdir(parents=True, exist_ok=True)
                cert_filename = f"{uuid.uuid4().hex}.{ext}"
                cert.save(os.path.join(current_app.config["CERT_DIR"], cert_filename))
        else:
            errors.append("公安委員会認定書をアップロードしてください。")

        if errors:
            for e in errors:
                flash(e, "danger")
            return render_template(
                "auth/vendor_register.html", form=form, selected_payments=set(payment_methods)
            )

        vendor = Vendor(
            name=vendor_name,
            phone=vendor_phone,
            email=form.get("email", "").strip() or None,
            cert_filename=cert_filename,
            cancellation_policy=form.get("cancellation_policy", "").strip() or None,
            payment_methods=",".join(payment_methods) or None,
            status=VendorStatus.PENDING,
        )
        db.session.add(vendor)
        db.session.flush()

        driver = Driver(vendor_id=vendor.id, name=driver_name, phone=driver_phone)
        driver.set_password(password)
        db.session.add(driver)
        db.session.commit()

        notify_admins("業者登録の申請", f"{vendor.name}（承認待ち）", None)
        flash("業者登録を申請しました。管理者の承認後にご利用いただけます。", "success")
        return redirect(url_for("auth.driver_login"))

    return render_template("auth/vendor_register.html", form={}, selected_payments=set())


# ─────────────────────────────────────────────
# 管理者：ID + パスワード
# ─────────────────────────────────────────────
@bp.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        login_id = request.form.get("login_id", "").strip()
        password = request.form.get("password", "")
        admin = Admin.query.filter_by(login_id=login_id).first()
        if admin is None or not admin.check_password(password):
            flash("IDまたはパスワードが違います。", "danger")
            return render_template("auth/admin_login.html")
        login_admin(admin)
        return redirect(request.args.get("next") or url_for("admin.dashboard"))
    return render_template("auth/admin_login.html")


# ─────────────────────────────────────────────
# ログアウト
# ─────────────────────────────────────────────
@bp.route("/logout/<role>")
def do_logout(role: str):
    if role in {"customer", "driver", "admin"}:
        logout(role)
    flash("ログアウトしました。", "info")
    return redirect(url_for("main.index"))
