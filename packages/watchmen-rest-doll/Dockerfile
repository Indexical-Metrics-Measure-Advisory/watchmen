FROM python:3.9.6-slim-buster

WORKDIR /app
ADD . .
RUN pip install poetry
RUN poetry config virtualenvs.create false
RUN poetry update
RUN poetry install --no-dev -E mysql

EXPOSE 8000
CMD ["uvicorn","watchmen_rest_doll.main:app","--host", "0.0.0.0", "--port", "80"]






