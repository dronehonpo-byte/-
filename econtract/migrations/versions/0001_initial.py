"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-05 00:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("google_sub", sa.String(length=64), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("department", sa.String(length=120), nullable=True),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active_flag", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("google_sub", name="uq_users_google_sub"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_google_sub", "users", ["google_sub"])

    op.create_table(
        "templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("variables_json", sa.Text(), nullable=True, server_default="[]"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "contracts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("pdf_path", sa.String(length=500), nullable=True),
        sa.Column("sealed_pdf_path", sa.String(length=500), nullable=True),
        sa.Column("document_hash", sa.String(length=128), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("creator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("templates.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_contracts_status", "contracts", ["status"])

    op.create_table(
        "signers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("contract_id", sa.Integer(), sa.ForeignKey("contracts.id"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=160), nullable=True),
        sa.Column("role", sa.String(length=60), nullable=True, server_default="counterparty"),
        sa.Column("order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("access_token", sa.String(length=64), nullable=False),
        sa.Column("last_reminded_at", sa.DateTime(), nullable=True),
        sa.Column("notification_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("signed_at", sa.DateTime(), nullable=True),
        sa.Column("signature_image_path", sa.String(length=500), nullable=True),
        sa.Column("signature_text", sa.String(length=120), nullable=True),
        sa.Column("signed_ip", sa.String(length=64), nullable=True),
        sa.Column("signed_user_agent", sa.String(length=255), nullable=True),
        sa.Column("signature_hash", sa.String(length=128), nullable=True),
        sa.UniqueConstraint("access_token", name="uq_signers_token"),
    )
    op.create_index("ix_signers_contract_id", "signers", ["contract_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("contract_id", sa.Integer(), sa.ForeignKey("contracts.id"), nullable=False),
        sa.Column("actor", sa.String(length=160), nullable=False),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_contract_id", "audit_logs", ["contract_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade():
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_contract_id", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_signers_contract_id", table_name="signers")
    op.drop_table("signers")
    op.drop_index("ix_contracts_status", table_name="contracts")
    op.drop_table("contracts")
    op.drop_table("templates")
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
