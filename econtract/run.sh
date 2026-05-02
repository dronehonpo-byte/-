#!/usr/bin/env bash
# 開発用 起動スクリプト
set -e
cd "$(dirname "$0")/.."

# 仮想環境のセットアップ（任意）
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r econtract/requirements.txt

export FLASK_APP=econtract.wsgi
export FLASK_DEBUG=1
flask init-db
flask seed

flask run --host=0.0.0.0 --port=5000
