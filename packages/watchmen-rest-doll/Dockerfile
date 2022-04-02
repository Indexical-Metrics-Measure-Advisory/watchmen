FROM python:3.9.6-slim-buster

WORKDIR /app
ADD . .
RUN pip install poetry && pip install passlib && pip install bcrypt \
    && pip install python-multipart && pip install watchmen-data-surface \
    && pip install watchmen-pipeline-surface && pip install watchmen-inquiry-surface \
    && pip install watchmen-indicator-surface && pip install watchmen-storage-mysql

EXPOSE 8000
CMD ["uvicorn","watchmen_rest_doll.main:app","--host", "0.0.0.0", "--port", "80"]






