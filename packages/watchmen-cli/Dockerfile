FROM python:3.9.6-slim-buster

WORKDIR /app
ADD . .
RUN pip install requests && pip install fire

ENV command="deploy" host="http://0.0.0.0" username="username" password="password"
CMD python cli.py $command --host=$host --username=$username --password=$password
