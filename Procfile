web: cd econtract && flask --app wsgi db upgrade && cd .. && gunicorn -c econtract/gunicorn.conf.py econtract.wsgi:app
