"""gunicorn 設定. 本番では `gunicorn -c econtract/gunicorn.conf.py econtract.wsgi:app` で起動."""
import multiprocessing
import os

bind = "0.0.0.0:" + os.environ.get("PORT", "8000")
workers = int(os.environ.get("WEB_CONCURRENCY", max(2, multiprocessing.cpu_count())))
worker_class = "sync"
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
forwarded_allow_ips = "*"
