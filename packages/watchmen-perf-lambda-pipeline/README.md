# watchmen-perf-lambda-pipeline

Performance testing for AWS Lambda ingestion paths to the Watchmen pipeline engine.

This package measures end-to-end performance of the four Lambda → pipeline ingestion paths
defined in `packages/watchmen-serverless-lambda`:

| Scenario | Lambda trigger | HTTP path (`rawPath`) | Through collector | Pipeline trigger |
|---|---|---|:---:|---|
| **A. HTTP direct** | Function URL | `/pipeline/data` | no | `try_to_invoke_pipelines` (sync) |
| **B. Collector async (full)** | Function URL + EventBridge | `/collector/trigger/event*` | yes (SQS 4-stage) | `run_pipeline` (sync) |
| **C. Collector online (sync)** | Function URL | `/collector/trigger/online` | yes (simplified) | `trigger_online` (sync) |
| **D. EventBridge scheduled** | EventBridge schedule | event `{listener, tenant_id}` | yes (full SQS) | `run_pipeline` (sync) |

The test stack runs entirely on **LocalStack** (zero AWS cost, fully repeatable) and reuses the
existing `watchmen-serverless-lambda` Docker image without modifying any Watchmen business code.

## Layout

```
watchmen-perf-lambda-pipeline/
├── docker/                     # perf-runner image + full environment compose
│   ├── Dockerfile
│   └── docker-compose-perf.yml
├── infra/                      # one-shot provisioning scripts
│   ├── lambda-deploy.sh        # build & deploy Lambda image to LocalStack, create Function URL
│   ├── sqs-setup.sh            # create SQS standard queues (collector fan-out)
│   ├── eventbridge-rules.sh    # register EventBridge schedule rules (listener/clean)
│   └── seed-watchmen.sh        # create tenant/PAT/topic/pipeline/collector config via doll API
├── scenarios/                  # Locust scenarios (named scenarios/, not locust/,
│   ├── base.py                 #   to avoid shadowing the third-party locust pkg)
│   ├── scenario_a_pipeline_direct.py
│   ├── scenario_b_collector_async.py
│   ├── scenario_c_collector_online.py
│   └── scenario_d_eventbridge.py
├── payloads/                   # JSON request templates (one per scenario)
├── metrics/                    # three-layer metric collectors
│   ├── collector.py            # /pipeline/log/stats (p95/avg/status counts)
│   ├── prometheus_scraper.py   # doll /metrics + LocalStack Lambda metrics
│   ├── sqs_depth.py            # SQS ApproxNumberOfMessagesVisible (backlog)
│   └── lambda_insights.py      # Lambda Duration/Invocations/Errors (CloudWatch)
├── report/                     # Markdown/HTML report generator
│   ├── generator.py
│   └── templates/report.md.j2
├── dashboards/                 # prebuilt Grafana dashboard JSON
│   └── grafana-perf-dashboard.json
├── run-matrix.sh               # parameterised multi-run driver
├── test/                       # self-tests (payload validation, metric parsing)
└── reports/                    # generated reports land here (gitignored)
```

## Quick start

```bash
# 1. Bring up the environment (LocalStack + Postgres + doll + Prometheus + Grafana + perf-runner)
docker compose -f docker/docker-compose-perf.yml up -d

# 2. Provision Lambda, SQS, EventBridge, and seed Watchmen data
bash infra/lambda-deploy.sh
bash infra/sqs-setup.sh
bash infra/eventbridge-rules.sh
bash infra/seed-watchmen.sh

# 3. Run a scenario
locust -f scenarios/scenario_a_pipeline_direct.py --headless -u 50 -r 5 -t 5m \
    --host http://localhost:8000

# 4. Collect business + resource metrics and emit a report
python -m watchmen_perf_lambda_pipeline.report.generator --scenario A \
    --out reports/scenario-a-$(date +%Y%m%d).md
```

## Configuration

All runtime knobs are environment variables (read by Locust via `os.environ`):

| Variable | Default | Purpose |
|---|---|---|
| `DOLL_BASE_URL` | `http://watchmen_doll:8000` | Watchmen doll REST base URL |
| `LAMBDA_FUNCTION_URL` | `http://localhost:4566` | LocalStack Lambda Function URL |
| `AWS_ENDPOINT_URL` | `http://localstack:4566` | LocalStack AWS endpoint |
| `PERF_PAT` | _(set by seed-watchmen.sh)_ | PAT with ADMIN/SUPER_ADMIN role |
| `PERF_TENANT_ID` | _(set by seed-watchmen.sh)_ | target tenant id |
| `PERF_TOPIC_CODE` | `perf_topic` | topic used by pipeline scenarios |
| `WARMUP` | `1` | 1 = warm Lambda before the run (isolate cold start) |
| `SCENARIO_B_POLL_INTERVAL` | `2` | seconds between `/collector/trigger/events/finished` polls |

Lambda-side batch/coordinator knobs (see `packages/watchmen-serverless-lambda/src/watchmen_serverless_lambda/common/settings.py`)
are passed to the Lambda container as env vars in `docker-compose-perf.yml`; tweak them there to
sweep the configuration matrix.

## Metric layers

1. **Driver layer (Locust native)** — QPS, concurrency, HTTP p50/p95/p99, failure rate
2. **Business layer (reuses doll APIs, zero instrumentation)** —
   - `POST /pipeline/log/stats` → `avgDurationMs`, `p95DurationMs`, `byStatus{DONE,ERROR,IGNORED}`, insert/update/delete counts
   - `POST /pipeline/log` → per-pipeline `spentInMills` and stage/unit/action breakdown
   - `GET /collector/trigger/events/finished` → collection completion rate (scenarios B/C/D)
3. **Resource layer** — Prometheus `/metrics` (doll, set `PROMETHEUS=true`), LocalStack CloudWatch
   (Lambda Duration/Invocations/Errors/Throttles, SQS `ApproxNumberOfMessagesVisible`)

## Scope boundaries

- Does **not** modify any `watchmen-serverless-lambda` / `watchmen-collector-*` / `watchmen-pipeline-*` source.
- Test dependencies (locust, boto3, httpx, jinja2) live only in this package's `pyproject.toml`.
- No machine-specific absolute paths are committed; all paths are relative or env-var driven.
- CI integration is intentionally out of scope for the first iteration; local repeatability first.
