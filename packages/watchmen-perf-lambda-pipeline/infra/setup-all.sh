#!/usr/bin/env bash
# One-shot provisioning: SQS -> Lambda -> EventBridge -> Watchmen seed data.
# Run this after `docker compose -f docker/docker-compose-perf.yml up -d`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "########## 1/4 SQS ##########"
bash "$SCRIPT_DIR/sqs-setup.sh"

echo "########## 2/4 Lambda ##########"
bash "$SCRIPT_DIR/lambda-deploy.sh"

echo "########## 3/4 EventBridge ##########"
bash "$SCRIPT_DIR/eventbridge-rules.sh"

echo "########## 4/4 Watchmen seed ##########"
bash "$SCRIPT_DIR/seed-watchmen.sh"

echo
echo "Provisioning complete. Env files in $SCRIPT_DIR/../.env.d/:"
ls -1 "$SCRIPT_DIR/../.env.d/"
