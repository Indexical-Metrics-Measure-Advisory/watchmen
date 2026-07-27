#!/usr/bin/env bash
# Register EventBridge schedule rules that drive the collector listener and the
# timeout clean worker.
#
# In production these fire the `EVENTBRIDGE` branch of lambda-handler.main
# (see packages/watchmen-serverless-lambda/src/lambda-handler.py:41), which
# constructs a CollectorListener with listener_type in
# {event, table, record, json, task, clean} (see model/type.py:10).
#
# For perf testing we register rules with a short (60s) interval so runs don't
# have to wait for the production cadence. The event payload shape is
#   {"listener": "<type>", "tenant_id": "<tenant>"}
# (see trigger/bridge.py:9).
set -euo pipefail

AWS_ENDPOINT=${AWS_ENDPOINT_URL:-http://localstack:4566}
REGION=${AWS_DEFAULT_REGION:-us-east-1}
FUNCTION_NAME=${LAMBDA_FUNCTION_NAME:-watchmen-collector}
TENANT_ID=${PERF_TENANT_ID:-perf-tenant}
RULE_INTERVAL_SECONDS=${EVENTBRIDGE_INTERVAL_SECONDS:-60}
# AWS EventBridge requires rate(value unit) where unit is minute(s)/hour(s)/day(s)
RULE_INTERVAL_MINUTES=$(( (RULE_INTERVAL_SECONDS + 59) / 60 ))
[ "$RULE_INTERVAL_MINUTES" -lt 1 ] && RULE_INTERVAL_MINUTES=1
if [ "$RULE_INTERVAL_MINUTES" -eq 1 ]; then
  SCHEDULE_EXPR="rate(${RULE_INTERVAL_MINUTES} minute)"
else
  SCHEDULE_EXPR="rate(${RULE_INTERVAL_MINUTES} minutes)"
fi

run_aws() {
  AWS_ENDPOINT_URL="$AWS_ENDPOINT" aws --endpoint-url="$AWS_ENDPOINT" --region "$REGION" "$@"
}

# Resolve the Lambda ARN
FUNCTION_ARN=$(run_aws lambda get-function \
  --function-name "$FUNCTION_NAME" \
  --output text --query 'Configuration.FunctionArn')

register_rule() {
  local listener_type=$1
  local rule_name="perf-${listener_type}-rule"
  echo "==> Registering EventBridge rule: $rule_name (listener=${listener_type}, interval=${RULE_INTERVAL_SECONDS}s)"

  run_aws events put-rule \
    --name "$rule_name" \
    --schedule-expression "$SCHEDULE_EXPR" \
    --state ENABLED >/dev/null

  # Event payload matches what trigger/bridge.py expects
  PAYLOAD=$(printf '{"listener":"%s","tenant_id":"%s"}' "$listener_type" "$TENANT_ID")
  run_aws events put-targets \
    --rule "$rule_name" \
    --targets "[{\"Id\":\"1\",\"Arn\":\"$FUNCTION_ARN\",\"Input\":$(echo "$PAYLOAD" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}]"

  # Allow EventBridge to invoke the Lambda
  run_aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "EventBridgeInvoke-${listener_type}" \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${REGION}:000000000000:rule/${rule_name}" \
    2>/dev/null || true
}

# Listener types from watchmen-serverless-lambda/model/type.py:10
for t in event table record json task clean; do
  register_rule "$t"
done

echo "==> EventBridge rules registered (interval=${RULE_INTERVAL_SECONDS}s)"
