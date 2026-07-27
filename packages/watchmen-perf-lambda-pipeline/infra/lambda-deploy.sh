#!/usr/bin/env bash
# Build the watchmen-serverless-lambda image and deploy it to LocalStack as a
# Lambda function with a Function URL, mirroring the production setup.
#
# Reuses the existing packages/watchmen-serverless-lambda/Dockerfile unchanged.
# The Lambda handler entrypoint is `lambda-handler.main` (see Dockerfile CMD),
# which dispatches FUNCTION_URL / SQS / S3 / EVENTBRIDGE events.
set -euo pipefail

AWS_ENDPOINT=${AWS_ENDPOINT_URL:-http://localstack:4566}
REGION=${AWS_DEFAULT_REGION:-us-east-1}
FUNCTION_NAME=${LAMBDA_FUNCTION_NAME:-watchmen-collector}
IMAGE_TAG=${LAMBDA_IMAGE_TAG:-watchmen-lambda:perf}

# Resolve repo root (this script lives in packages/watchmen-perf-lambda-pipeline/infra)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LAMBDA_DIR="$REPO_ROOT/packages/watchmen-serverless-lambda"

echo "==> Building Lambda image from $LAMBDA_DIR (tag: $IMAGE_TAG)"
docker build -t "$IMAGE_TAG" "$LAMBDA_DIR"

# LocalStack reuses the host docker daemon; the image built above is visible to it.
echo "==> Creating IAM role for Lambda"
AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
  iam create-role \
  --role-name lambda-exec-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
  2>/dev/null || true

AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
  iam attach-role-policy \
  --role-name lambda-exec-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  2>/dev/null || true

ROLE_ARN="arn:aws:iam::000000000000:role/lambda-exec-role"

echo "==> Registering image with LocalStack ECR"
REGISTRY=000000000000.dkr.ecr.${REGION}.amazonaws.com
AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
  ecr create-repository --repository-name watchmen-lambda 2>/dev/null || true
AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
  ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY"
docker tag "$IMAGE_TAG" "$REGISTRY/watchmen-lambda:perf"
docker push "$REGISTRY/watchmen-lambda:perf"
IMAGE_URI="$REGISTRY/watchmen-lambda:perf"

# Load env vars produced by sqs-setup.sh (if present)
if [ -f "$SCRIPT_DIR/../.env.d/sqs.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/../.env.d/sqs.env"
  set +a
fi

echo "==> Creating/updating Lambda function: $FUNCTION_NAME"
# Collector + doll env wiring (matches watchmen-serverless-lambda/common/settings.py
# and watchmen-rest-doll/src/watchmen_rest_doll/settings.py)
ENV_VARS=$(cat <<EOF
{
  "META_STORAGE_TYPE":"postgresql",
  "META_STORAGE_HOST":"perf_postgres",
  "META_STORAGE_PORT":"5432",
  "META_STORAGE_USER_NAME":"admin",
  "META_STORAGE_PASSWORD":"admin-pwd",
  "META_STORAGE_NAME":"watchmen",
  "META_STORAGE_ECHO":"false",
  "USE_STORAGE_DIRECTLY":"true",
  "REPLACE_TOPIC_TO_STORAGE":"true",
  "SYNC_TOPIC_TO_STORAGE":"true",
  "SERVERLESS_S3_REGION":"${REGION}",
  "SERVERLESS_QUEUE_URL":"${SERVERLESS_QUEUE_URL:-}",
  "SERVERLESS_EXTRACT_TABLE_QUEUE_URL":"${SERVERLESS_EXTRACT_TABLE_QUEUE_URL:-}",
  "AWS_ENDPOINT_URL":"${AWS_ENDPOINT}",
  "LOGGER_LEVEL":"INFO"
}
EOF
)

if AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
     lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  echo "    function exists, updating code..."
  AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
    lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --image-uri "$IMAGE_URI" \
    --publish >/dev/null
else
  AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
    lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --package-type Image \
    --code ImageUri="$IMAGE_URI" \
    --role "$ROLE_ARN" \
    --timeout 900 \
    --memory-size 1024 \
    --environment "Variables=$ENV_VARS" \
    --output text --query 'FunctionArn'
fi

echo "==> Creating Function URL (AWS_IAM auth)"
AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
  lambda create-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --auth-type AWS_IAM 2>/dev/null || true

# Add permissions so the Function URL can invoke the function
AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
  lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type AWS_IAM 2>/dev/null || true

# Wire SQS + EventBridge as additional triggers (used by scenarios B/D)
if [ -n "${SERVERLESS_QUEUE_URL:-}" ]; then
  QUEUE_ARN=$(AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
    sqs get-queue-attributes \
    --queue-url "${SERVERLESS_QUEUE_URL}" \
    --attribute-names QueueArn \
    --output text --query 'Attributes.QueueArn')
  AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
    lambda create-event-source-mapping \
    --function-name "$FUNCTION_NAME" \
    --event-source-arn "$QUEUE_ARN" \
    --batch-size 10 2>/dev/null || true
fi

FUNCTION_URL=$(AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" \
  lambda get-function-url-config \
  --function-name "$FUNCTION_NAME" \
  --output text --query 'FunctionUrl')

echo "==> Lambda Function URL: $FUNCTION_URL"
mkdir -p "$SCRIPT_DIR/../.env.d"
echo "LAMBDA_FUNCTION_URL=${FUNCTION_URL}" >"$SCRIPT_DIR/../.env.d/lambda.env"

echo "==> Lambda deploy complete"
