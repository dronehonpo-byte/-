# 社内向け電子契約ツール — 本番イメージ
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    FLASK_ENV=production \
    PORT=8000

# 日本語PDFのため fonts と libpq (psycopg2) ランタイム
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      fonts-noto-cjk \
      libpq5 \
      curl \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 依存だけ先にインストールしてキャッシュ効かせる
COPY econtract/requirements.txt /app/econtract/requirements.txt
RUN pip install -r /app/econtract/requirements.txt

# アプリ本体
COPY econtract /app/econtract

# storage は volume にして永続化推奨
RUN mkdir -p /app/econtract/storage/contracts /app/econtract/storage/signatures /app/econtract/instance
VOLUME ["/app/econtract/storage", "/app/econtract/instance"]

EXPOSE 8000

# 起動: db upgrade → gunicorn
CMD ["sh", "-c", "cd /app && flask --app econtract.wsgi db upgrade && gunicorn -c /app/econtract/gunicorn.conf.py econtract.wsgi:app"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/healthz || exit 1
