FROM python:3.9.6-slim-buster

WORKDIR /app
ADD . .
RUN pip install poetry && poetry config virtualenvs.create false && poetry -vv update && poetry install --no-dev -vv -E mysql

EXPOSE 8000
CMD ["uvicorn","watchmen_rest_doll.main:app","--host", "0.0.0.0", "--port", "80"]






