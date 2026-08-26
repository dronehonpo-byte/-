@echo off
chcp 65001 > nul
echo ============================================
echo  SEMEasy セットアップを開始します
echo ============================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [エラー] Python が見つかりません。
    echo Python 3.10 以上をインストールしてください: https://www.python.org/
    echo インストール時に「Add Python to PATH」にチェックを入れてください。
    pause
    exit /b 1
)

echo [1/4] 仮想環境 (venv) を作成しています...
python -m venv venv

echo [2/4] 仮想環境を有効化しています...
call venv\Scripts\activate

echo [3/4] インストール補助ツールを準備しています...
python -m pip install --upgrade pip
rem semopy のインストールに必要な設定
python -m pip install "setuptools<60" wheel

echo [4/4] 必要なパッケージをインストールしています（数分かかります）...
pip install -r requirements.txt

echo.
echo ============================================
echo  セットアップ完了！ run.bat で起動できます。
echo ============================================
echo.
echo  ※ 初期の利用者アカウントは README.md をご確認ください。
echo     パスワードの変更は次のコマンドで行えます：
echo       python manage_users.py passwd ^<ID^> ^<新しいパスワード^>
echo.
pause
