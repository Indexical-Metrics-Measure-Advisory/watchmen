# Container image that runs your code
FROM python:3.9.6-slim-buster

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY change_poetry_toml.py /change_poetry_toml.py
COPY change_package_json.py /change_poetry_toml.py

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/entrypoint.sh"]