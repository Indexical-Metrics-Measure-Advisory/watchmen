#!/usr/bin/env bash
# Build and deploy the watchmen-serverless-lambda as a zip-based Lambda function
# to LocalStack community edition.
#
# This is an alternative to lambda-deploy.sh (which uses container-image Lambda,
# a LocalStack Pro feature). The zip approach works with the free community edition.
#
# Prerequisites:
#   - Docker daemon running on the host
#   - LocalStack container running (docker compose up -d localstack)
#   - SQS queues created (infra/sqs-setup.sh)
#
# Usage:
#   ./infra/lambda-zip-deploy.sh
#
# Environment variables:
#   AWS_ENDPOINT_URL       - LocalStack endpoint (default: http://localstack:4566)
#   AWS_DEFAULT_REGION     - AWS region (default: us-east-1)
#   LAMBDA_FUNCTION_NAME   - Lambda function name (default: watchmen-collector)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PKG_DIR/../.." && pwd)"
PACKAGES_DIR="$REPO_ROOT/packages"
BUILD_DIR="$PKG_DIR/build"

AWS_ENDPOINT=${AWS_ENDPOINT_URL:-http://localstack:4566}
REGION=${AWS_DEFAULT_REGION:-us-east-1}
FUNCTION_NAME=${LAMBDA_FUNCTION_NAME:-watchmen-collector}
BUILDER_TAG=${LAMBDA_ZIP_BUILDER_TAG:-watchmen-lambda-zip-builder:latest}
ZIP_PATH="$BUILD_DIR/function.zip"

# AWS CLI helper (uses LocalStack endpoint)
run_aws() {
	AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" "$@"
}

echo "==> [1/5] Building Lambda zip in Docker (Amazon Linux Lambda runtime)"
mkdir -p "$BUILD_DIR"
docker build \
	-f "$SCRIPT_DIR/Dockerfile.lambda-zip" \
	-t "$BUILDER_TAG" \
	"$PACKAGES_DIR"

echo "==> [2/5] Extracting function.zip from build image"
docker rm -f lambda-zip-temp 2>/dev/null || true
docker create --name lambda-zip-temp "$BUILDER_TAG"
docker cp lambda-zip-temp:/tmp/function.zip "$ZIP_PATH"
docker rm lambda-zip-temp

ZIP_SIZE=$(du -h "$ZIP_PATH" | cut -f1)
echo "    function.zip size: $ZIP_SIZE"

# AWS Lambda direct upload limit is 50MB; use S3 for larger zips.
ZIP_SIZE_BYTES=$(stat -f%z "$ZIP_PATH" 2>/dev/null || stat -c%s "$ZIP_PATH" 2>/dev/null)
USE_S3=false
if [ "$ZIP_SIZE_BYTES" -gt 52428800 ]; then
	echo "    zip exceeds 50MB direct upload limit, will upload via S3"
	USE_S3=true
fi

echo "==> [3/5] Creating IAM role for Lambda"
run_aws iam create-role \
	--role-name lambda-exec-role \
	--assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
	2>/dev/null || true
run_aws iam attach-role-policy \
	--role-name lambda-exec-role \
	--policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
	2>/dev/null || true
ROLE_ARN="arn:aws:iam::000000000000:role/lambda-exec-role"

# Load env vars produced by sqs-setup.sh (if present)
if [ -f "$PKG_DIR/.env.d/sqs.env" ]; then
	set -a
	# shellcheck disable=SC1091
	source "$PKG_DIR/.env.d/sqs.env"
	set +a
fi

# Build environment variables for the Lambda function
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

echo "==> [4/5] Creating/updating Lambda function: $FUNCTION_NAME (zip-based)"

if run_aws lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
	echo "    function exists, updating code..."
	if [ "$USE_S3" = true ]; then
		run_aws s3 mb "s3://lambda-zip-bucket" 2>/dev/null || true
		run_aws s3 cp "$ZIP_PATH" "s3://lambda-zip-bucket/function.zip"
		run_aws lambda update-function-code \
			--function-name "$FUNCTION_NAME" \
			--s3-bucket lambda-zip-bucket \
			--s3-key function.zip \
			--publish >/dev/null
	else
		run_aws lambda update-function-code \
			--function-name "$FUNCTION_NAME" \
			--zip-file "fileb://$ZIP_PATH" \
			--publish >/dev/null
	fi
else
	echo "    creating new function..."
	if [ "$USE_S3" = true ]; then
		run_aws s3 mb "s3://lambda-zip-bucket" 2>/dev/null || true
		run_aws s3 cp "$ZIP_PATH" "s3://lambda-zip-bucket/function.zip"
		run_aws lambda create-function \
			--function-name "$FUNCTION_NAME" \
			--runtime python3.12 \
			--handler lambda-handler.main \
			--s3-bucket lambda-zip-bucket \
			--s3-key function.zip \
			--role "$ROLE_ARN" \
			--timeout 900 \
			--memory-size 1024 \
			--environment "Variables=$ENV_VARS" \
			--output text --query 'FunctionArn'
	else
		run_aws lambda create-function \
			--function-name "$FUNCTION_NAME" \
			--runtime python3.12 \
			--handler lambda-handler.main \
			--zip-file "fileb://$ZIP_PATH" \
			--role "$ROLE_ARN" \
			--timeout 900 \
			--memory-size 1024 \
			--environment "Variables=$ENV_VARS" \
			--output text --query 'FunctionArn'
	fi
fi

echo "==> [5/5] Configuring Function URL and SQS trigger"

# Create Function URL (AWS_IAM auth)
run_aws lambda create-function-url-config \
	--function-name "$FUNCTION_NAME" \
	--auth-type AWS_IAM 2>/dev/null || true

# Allow public access to the Function URL
run_aws lambda add-permission \
	--function-name "$FUNCTION_NAME" \
	--statement-id FunctionURLAllowPublicAccess \
	--action lambda:InvokeFunctionUrl \
	--principal "*" \
	--function-url-auth-type AWS_IAM 2>/dev/null || true

# Wire SQS as event source (used by scenarios B/D)
if [ -n "${SERVERLESS_QUEUE_URL:-}" ]; then
	QUEUE_ARN=$(run_aws sqs get-queue-attributes \
		--queue-url "${SERVERLESS_QUEUE_URL}" \
		--attribute-names QueueArn \
		--output text --query 'Attributes.QueueArn')
	run_aws lambda create-event-source-mapping \
		--function-name "$FUNCTION_NAME" \
		--event-source-arn "$QUEUE_ARN" \
		--batch-size 10 2>/dev/null || true
	echo "    SQS event source mapping created: $QUEUE_ARN"
fi

# Retrieve and persist the Function URL
FUNCTION_URL=$(run_aws lambda get-function-url-config \
	--function-name "$FUNCTION_NAME" \
	--output text --query 'FunctionUrl')

echo "==> Lambda Function URL: $FUNCTION_URL"
mkdir -p "$PKG_DIR/.env.d"
echo "LAMBDA_FUNCTION_URL=${FUNCTION_URL}" >"$PKG_DIR/.env.d/lambda.env"

echo "==> Zip-based Lambda deploy complete"
echo "    Function: $FUNCTION_NAME"
echo "    Runtime:  python3.12 (zip)"
echo "    Handler:  lambda-handler.main"
echo "    URL:      $FUNCTION_URL"
