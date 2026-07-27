#!/usr/bin/env bash
# Parameterised multi-run driver: sweeps Lambda-side batch/coordinator knobs and
# Locust concurrency levels, running the chosen scenario for each combination
# and emitting a report per run.
#
# Example:
#   SCENARIO=B USERS="10 50 100" RECORD_BATCH="10 50 100" ./run-matrix.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SCENARIO=${SCENARIO:-B}
USERS=${USERS:-"10 50"}
SPAWN_RATE=${SPAWN_RATE:-5}
DURATION=${DURATION:-2m}
RECORD_BATCHES=${RECORD_BATCH:-"10 50"}
POST_JSON_BATCHES=${POST_JSON_BATCH:-"100 500"}
RECORD_COORDINATORS=${RECORD_COORDINATOR:-"10 20"}

SCENARIO_FILE=""
case "$SCENARIO" in
  A) SCENARIO_FILE="scenarios/scenario_a_pipeline_direct.py" ;;
  B) SCENARIO_FILE="scenarios/scenario_b_collector_async.py" ;;
  C) SCENARIO_FILE="scenarios/scenario_c_collector_online.py" ;;
  D) SCENARIO_FILE="scenarios/scenario_d_eventbridge.py" ;;
  *) echo "Unknown scenario: $SCENARIO (use A/B/C/D)"; exit 1 ;;
esac

mkdir -p reports
TS=$(date +%Y%m%d-%H%M%S)
MATRIX_DIR="reports/matrix-${SCENARIO}-${TS}"
mkdir -p "$MATRIX_DIR"

run_id=0
for users in $USERS; do
  for rb in $RECORD_BATCHES; do
    for pjb in $POST_JSON_BATCHES; do
      for rc in $RECORD_COORDINATORS; do
        run_id=$((run_id + 1))
        tag="u${users}-rb${rb}-pjb${pjb}-rc${rc}"
        echo "########## run ${run_id}: ${tag} ##########"
        # Update the running Lambda function's env vars for this combination.
        # (lambda-deploy.sh must have been run already; we just update config.)
        ENV_VARS=$(cat <<EOF
{
  "SERVERLESS_RECORD_BATCH_SIZE":"${rb}",
  "SERVERLESS_POST_JSON_BATCH_SIZE":"${pjb}",
  "SERVERLESS_NUMBER_OF_RECORD_COORDINATOR":"${rc}"
}
EOF
)
        AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL:-http://localstack:4566} \
          aws --endpoint-url="${AWS_ENDPOINT_URL:-http://localstack:4566}" \
          --region "${AWS_DEFAULT_REGION:-us-east-1}" \
          lambda update-function-configuration \
          --function-name "${LAMBDA_FUNCTION_NAME:-watchmen-collector}" \
          --environment "Variables=${ENV_VARS}" >/dev/null || true

        locust -f "$SCENARIO_FILE" --headless \
          -u "$users" -r "$SPAWN_RATE" -t "$DURATION" \
          --csv "$MATRIX_DIR/${tag}" \
          --html "$MATRIX_DIR/${tag}.html" \
          --host "${LAMBDA_FUNCTION_URL:-http://localhost:4566}" || true

        # Convert locust CSV stats to JSON for the report generator (best-effort).
        python3 - "$MATRIX_DIR/${tag}_stats.csv" "$MATRIX_DIR/${tag}.json" <<'PY' || true
import csv, json, sys
try:
    with open(sys.argv[1]) as f:
        rows = list(csv.DictReader(f))
    # Find the "Aggregated" row
    agg = next((r for r in rows if r.get('Name') == 'Aggregated'), rows[-1] if rows else {})
    json.dump({'stats': {
        'num_requests': int(float(agg.get('Request Count', 0) or 0)),
        'num_failures': int(float(agg.get('Failure Count', 0) or 0)),
        'fail_ratio': float(agg.get('Failure Count', 0) or 0) / max(1, float(agg.get('Request Count', 1) or 1)),
        'total_rps': float(agg.get('Total RPS', 0) or 0),
        'median_response_time': float(agg.get('Median Response Time', 0) or 0),
        'user_count': int(float(agg.get('User Count', 0) or 0)),
        'get_response_time_percentile': lambda p: float(agg.get('95%', 0) or 0) if p == 0.95 else float(agg.get('99%', 0) or 0),
    }}, open(sys.argv[2], 'w'), default=str)
except Exception as e:
    print(f'csv->json failed: {e}')
PY

        python3 -m watchmen_perf_lambda_pipeline.report.generator \
          --scenario "$SCENARIO" \
          --locust-stats "$MATRIX_DIR/${tag}.json" \
          --out "$MATRIX_DIR/${tag}.md" || true
      done
    done
  done
done

echo
echo "Matrix complete. Reports in $MATRIX_DIR/"
ls -1 "$MATRIX_DIR"/*.md
