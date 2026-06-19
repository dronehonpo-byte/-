@echo off
chcp 65001 > nul
echo StatEasy を起動しています... ブラウザが自動的に開きます。
call venv\Scripts\activate
streamlit run app.py --server.port 8501
pause
