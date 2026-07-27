FROM python:3.12-slim

# AWS CLI + awslocal helper for provisioning scripts
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl unzip bash ca-certificates \
    && curl -sSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/aws.zip \
    && unzip -q /tmp/aws.zip -d /tmp && /tmp/aws/install \
    && pip install --no-cache-dir awscli-local \
    && rm -rf /tmp/aws* /var/lib/apt/lists/*

WORKDIR /app

# Install poetry and the perf package
COPY pyproject.toml ./
RUN pip install --no-cache-dir poetry \
    && poetry config virtualenvs.create false \
    && poetry install --no-root --without dev

# Application code
COPY . /app
RUN pip install --no-cache-dir -e .

ENV AWS_ENDPOINT_URL=http://localstack:4566 \
    AWS_DEFAULT_REGION=us-east-1 \
    AWS_ACCESS_KEY_ID=test \
    AWS_SECRET_ACCESS_KEY=test \
    DOLL_BASE_URL=http://watchmen_doll:8000

CMD ["sleep", "infinity"]
