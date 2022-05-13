FROM python:3.9.6-slim-buster

WORKDIR /app
ADD . .
RUN pip install poetry && poetry config virtualenvs.create false && poetry install --no-dev -vv

ENV command="deploy_asset"
CMD python ./src/cli.py $command
