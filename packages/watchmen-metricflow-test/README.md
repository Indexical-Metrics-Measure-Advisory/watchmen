# watchmen-metricflow-test

Black-box API test-suite for **watchmen-metricflow** (指标 API). Unlike the in-package
`tests/` (fully mocked, in-process), this suite exercises the real stack: real
PostgreSQL in Docker, real PAT authentication, real HTTP against a live
`watchmen_metricflow.main:app`.

Design mirrors `packages/watchmen-test-harness` (doll functional suite); the
`pats.expired` DATE-vs-TIMESTAMP dialect bug discovered there is pre-fixed in this
stack's bootstrap (see `docker/postgres-init/z-mft-seed.sql`).

## Prerequisites

- Docker with `docker compose`
- Poetry 1.8+ with a Python 3.12 interpreter

## Quick start

```bash
cd packages/watchmen-metricflow-test
make install   # one-time: pulls the full metricflow dependency chain (dbt etc.)
make smoke     # health/auth + metric CRUD lifecycle
make test      # same suites, full markers
```

Every run starts from an empty database volume (`down -v`) because the meta/data
scripts are not idempotent. Reports land in `test-results/<timestamp>/`:
`summary.md`, `junit-scenarios.xml`, `metricflow-server.log`.

## What is covered

| Suite | Scope |
|---|---|
| `test_00_health_auth.py` | `/metricflow/health`, `/metricflow/current_date`, anonymous rejection of admin endpoints |
| `test_metric_crud.py` | metric create → get → list → update → duplicate-reject → delete → get-404 |

Phase 2 (planned): `get_metric_value` / `query_metrics` value-computation flows
against a seeded warehouse profile.

## Auth model

The app mounts **no `/login` route**; the suite authenticates with a PAT:
`Authorization: pat mft-pat-local-001`, belonging to the dedicated tenant-admin
`mft-admin` / `mft-admin-pwd` created by `docker/postgres-init/z-mft-seed.sql`.
The same file widens `pats.expired` to TIMESTAMP — without it, PAT auth dies on
`can't compare datetime.datetime to datetime.date` (postgres meta-scripts create
the column as DATE; see watchmen-test-harness findings).

## Configuration

Knobs use the `MFT_` prefix — `MFT_SERVER_PORT` (default 8100), `MFT_PG_PORT`
(default 25432), etc. See `src/watchmen_metricflow_test/settings.py`.

## Debugging

```bash
make keep      # leaves postgres + server up; re-run pytest manually if needed
make down
```
