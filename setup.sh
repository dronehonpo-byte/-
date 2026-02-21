#!/bin/bash
# LINE スクリーンショット監視ツール セットアップスクリプト

set -e

echo "======================================"
echo "LINE スクリーンショット監視ツール"
echo "セットアップスクリプト"
echo "======================================"

# OS 判定
if [ -f /etc/debian_version ]; then
    PKG_MANAGER="apt"
elif [ -f /etc/redhat-release ]; then
    PKG_MANAGER="dnf"
elif [ -f /etc/arch-release ]; then
    PKG_MANAGER="pacman"
else
    echo "[警告] 対応していない OS です。手動でインストールしてください。"
    PKG_MANAGER="unknown"
fi

echo ""
echo "[1/3] システムの依存パッケージをインストール中..."

if [ "$PKG_MANAGER" = "apt" ]; then
    sudo apt update -q
    sudo apt install -y \
        python3-dbus \
        python3-gi \
        python3-gi-cairo \
        gir1.2-glib-2.0 \
        scrot
    echo "  scrot (スクリーンショット), python3-dbus, python3-gi をインストールしました"

elif [ "$PKG_MANAGER" = "dnf" ]; then
    sudo dnf install -y \
        python3-dbus \
        python3-gobject \
        scrot
    echo "  scrot, python3-dbus, python3-gobject をインストールしました"

elif [ "$PKG_MANAGER" = "pacman" ]; then
    sudo pacman -S --noconfirm \
        python-dbus \
        python-gobject \
        scrot
    echo "  scrot, python-dbus, python-gobject をインストールしました"

else
    echo "  手動でインストールしてください:"
    echo "  - python3-dbus (または dbus-python)"
    echo "  - python3-gi (または PyGObject)"
    echo "  - scrot または maim または gnome-screenshot"
fi

echo ""
echo "[2/3] Python パッケージを確認中..."
python3 -c "import dbus; print('  dbus-python: OK')" 2>/dev/null || \
    echo "  [警告] dbus-python が見つかりません"
python3 -c "from gi.repository import GLib; print('  PyGObject:   OK')" 2>/dev/null || \
    echo "  [警告] PyGObject が見つかりません"

echo ""
echo "[3/3] スクリーンショットツールを確認中..."
for tool in scrot maim gnome-screenshot import; do
    if command -v "$tool" &>/dev/null; then
        echo "  $tool: 利用可能"
        SCREENSHOT_TOOL="$tool"
        break
    fi
done

if [ -z "$SCREENSHOT_TOOL" ]; then
    echo "  [警告] スクリーンショットツールが見つかりません"
    echo "  インストール: sudo apt install scrot"
fi

echo ""
echo "======================================"
echo "セットアップ完了！"
echo ""
echo "使い方:"
echo "  python3 line_screenshot.py \"田中太郎\""
echo "  python3 line_screenshot.py \"田中\" \"佐藤\" \"山田\""
echo "  python3 line_screenshot.py \"友達の名前\" --verbose"
echo "======================================"
