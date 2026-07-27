#!/usr/bin/env bash
# Create the SQS standard queues used by watchmen-serverless-lambda for fan-out.
#
# The Lambda code reads queue URLs from these env vars (see
# packages/watchmen-serverless-lambda/src/watchmen_serverless_lambda/common/settings.py):
#   SERVERLESS_QUEUE_URL              -> coordinator/worker fan-out
#   SERVERLESS_EXTRACT_TABLE_QUEUE_URL -> extract-table coordinator fan-out
#
# Standard (non-FIFO) queues are used by default; the FIFO sender in
# queue/sqs_fifo_sender.py is currently commented out in queue/__init__.py.
set -euo pipefail

AWS=${AWS:-awslocal}
AWS_ENDPOINT=${AWS_ENDPOINT_URL:-http://localstack:4566}
REGION=${AWS_DEFAULT_REGION:-us-east-1}

run_aws() {
  AWS_ENDPOINT_URL="$AWS_ENDPOINT" AWS_DEFAULT_REGION="$REGION" \
    aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" "$@"
}

echo "==> Creating SQS queues on $AWS_ENDPOINT"

COLLECTOR_QUEUE_URL=$(run_aws sqs create-queue \
  --queue-name watchmen-collector-queue \
  --output text --query 'QueueUrl')
echo "    collector queue: $COLLECTOR_QUEUE_URL"

EXTRACT_QUEUE_URL=$(run_aws sqs create-queue \
  --queue-name watchmen-extract-table-queue \
  --output text --query 'QueueUrl')
echo "    extract-table queue: $EXTRACT_QUEUE_URL"

# Persist for downstream consumers (lambda-deploy.sh reads these to set env vars on the function)
mkdir -p ./.env.d
cat >./.env.d/sqs.env <<EOF
SERVERLESS_QUEUE_URL=${COLLECTOR_QUEUE_URL}
SERVERLESS_EXTRACT_TABLE_QUEUE_URL=${EXTRACT_QUEUE_URL}
EOF

echo "==> SQS setup complete (written to .env.d/sqs.env)"
