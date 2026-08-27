# watchmen-test-harness

Local full-stack e2e testing for watchmen. Mirrors `.github/workflows/test-build-mysql.yml`
step by step: real MySQL in Docker → meta/data scripts applied in CI order → doll server
started with CI-parity env → Postman collection (optional) + pytest functional scenarios.

Design doc: `docs/e2e-test-harness-design.md`.

## Prerequisites

- Docker Desktop / engine with `docker compose`
- Poetry 1.8+
- Node 20 + `npm i -g newman newman-reporter-htmlextra` (optional; without it the
  Postman phase is skipped and reported as such)

## Quick start

```bash
cd packages/watchmen-test-harness
make install   # one-time: builds a virtualenv that also contains the doll server deps
make smoke     # ~5 min: health/auth/seed checks
make test      # full suite + newman collection (~20-30 min)
```

Reports land in `test-results/<db>-<timestamp>/`: `summary.md`, junit xml,
`postman-report.html` (when newman ran), `doll-server.log`.

## Debugging a failing run

```bash
make keep      # runs everything, then leaves MySQL up and skips teardown
# inspect, re-run scenarios manually if needed, then:
make down
```

Server log tail is printed automatically when a phase fails; full log is in the
results directory.

## Configuration

Every knob has an environment override via `WHT_` prefix — e.g. `WHT_SERVER_PORT=8010`,
`WHT_MYSQL_PORT=23306`. Defaults reproduce CI. See
`src/watchmen_test_harness/settings.py` for the complete list.

| Scope | Default | Note |
|---|---|---|
| MySQL port | 13306 | offset to avoid clashing with local instances |
| Server port | 8000 | must be free before `wht run` starts |
| Login account | imma-super / change-me | seeded by meta-scripts; do not change defaults |

## How it works

1. `docker compose -p wht up -d --wait` starts mysql:8.0.21 (same image as CI).
2. `DbBootstrapper` applies `watchmen-storage-mysql/{meta,data}-scripts/**` in
   version order (`ls -v` semantics), exactly like the workflow's shell loops,
   including the root-level `log_bin_trust_function_creators` session flag.
3. uvicorn serves `watchmen_rest_doll.main:app` from this virtualenv with the CI
   environment variable set (`server_env()`).
4. newman replays the official Postman collection with `mysql.json`.
5. pytest scenarios exercise live REST flows (health/auth first; collector /
   pipeline / indicator suites arrive in Phase 2).

The stack always starts from an empty volume (`down -v`), because scripts are not
idempotent. That makes repeated runs deterministic.
