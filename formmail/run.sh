#!/usr/bin/env bash
# formmail をローカルで起動するためのスクリプト
# 使い方: ./formmail/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."

VENV=.venv
[ -d "$VENV" ] || python3 -m venv "$VENV"
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r formmail/requirements.txt

export SECRET_KEY="${SECRET_KEY:-$("$VENV/bin/python" -c 'import secrets;print(secrets.token_urlsafe(32))')}"
export DATABASE_URL="${DATABASE_URL:-sqlite:///$(pwd)/formmail.db}"
export APP_BASE_URL="${APP_BASE_URL:-http://localhost:5000}"
export MAIL_DEBUG_LOG="${MAIL_DEBUG_LOG:-true}"

"$VENV/bin/flask" --app formmail.wsgi init-db

exec "$VENV/bin/python" -m formmail.wsgi
