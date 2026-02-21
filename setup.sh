#!/bin/bash
# LINE スクリーンショット監視ツール — 自動セットアップスクリプト
# Ubuntu / Debian 系 Linux 用
#
# 実行方法:
#   bash setup.sh

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
err()  { echo -e "  ${RED}✗${NC} $1"; }

echo ""
echo "======================================================"
echo "  LINE スクリーンショット監視ツール — セットアップ"
echo "======================================================"
echo ""

# ── 1. Python バージョン確認 ─────────────────────────
echo "[1/4] Python を確認中..."
if ! command -v python3 &>/dev/null; then
    err "python3 が見つかりません"
    echo "      sudo apt install python3"
    exit 1
fi
PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
ok "Python $PY_VER"

# ── 2. gdbus 確認 (D-Bus 通知の受信に必要) ───────────
echo ""
echo "[2/4] gdbus (D-Bus ツール) を確認中..."
if command -v gdbus &>/dev/null; then
    ok "gdbus: $(which gdbus)"
else
    warn "gdbus が見つかりません。インストールを試みます..."
    sudo apt-get install -y libglib2.0-bin
    if command -v gdbus &>/dev/null; then
        ok "gdbus をインストールしました"
    else
        err "gdbus のインストールに失敗しました"
        exit 1
    fi
fi

# ── 3. スクリーンショットツール ───────────────────────
echo ""
echo "[3/4] スクリーンショットツールを確認中..."
FOUND_TOOL=""
for tool in scrot maim gnome-screenshot; do
    if command -v "$tool" &>/dev/null; then
        ok "$tool: $(which $tool)"
        FOUND_TOOL="$tool"
        break
    fi
done

if [ -z "$FOUND_TOOL" ]; then
    warn "スクリーンショットツールが見つかりません。scrot をインストールします..."
    sudo apt-get install -y scrot
    if command -v scrot &>/dev/null; then
        ok "scrot をインストールしました"
    else
        err "scrot のインストールに失敗しました"
        warn "手動でインストールしてください: sudo apt install scrot"
    fi
fi

# ── 4. 動作テスト ─────────────────────────────────────
echo ""
echo "[4/4] スクリプトの動作テスト..."
python3 line_screenshot.py --test
TEST_RESULT=$?

echo ""
echo "======================================================"
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "  ${GREEN}セットアップ完了！${NC}"
else
    echo -e "  ${YELLOW}セットアップ完了（一部警告あり）${NC}"
fi
echo ""
echo "  使い方:"
echo "    python3 line_screenshot.py \"田中太郎\""
echo "    python3 line_screenshot.py \"田中\" \"佐藤\"   # 複数人"
echo "    python3 line_screenshot.py \"友達\" --verbose  # 全通知表示"
echo ""
echo "  ★ デスクトップ環境の GNOME ターミナルなどから実行してください"
echo "    (SSH 経由では D-Bus が使えないため動作しません)"
echo "======================================================"
echo ""
