@echo off
chcp 65001 > nul
echo ============================================
echo  StatEasy セットアップを開始します...
echo ============================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [エラー] Python が見つかりません。
    echo Python 3.10 以上をインストールしてください: https://www.python.org/
    pause
    exit /b 1
)

echo [1/3] 仮想環境 (venv) を作成しています...
python -m venv venv

echo [2/3] 仮想環境を有効化しています...
call venv\Scripts\activate

echo [3/3] 依存パッケージをインストールしています（数分かかります）...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ============================================
echo  セットアップ完了！ run.bat で起動できます。
echo ============================================
pause
