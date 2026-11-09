# watchmen-agent-scenario

A self-contained end-to-end evaluation scenario for the Watchmen agent interfaces.
It bundles every YAML definition plus mock data, syncs them into an (empty)
environment through **`agent-cli`**, executes the pipelines by injecting mock
records, and verifies the results through **`agent-runtime-cli`** with exact
value assertions.

```text
raw_policy ──pl──▶ silver_customer (Customer object)
    │
    └──pl──▶ silver_policy ──▶ semantic model ──▶ 2 metrics (simple + ratio)
                │
                └──▶ ontology (Customer/Policy + link + derived attribute)
```

One mock JSON file (`scenario/data/mock_policies.json`) is the single source of
truth: the driver computes expected aggregates from it and asserts that the
runtime queries return exactly those numbers.

## Quick Start

```bash
cd packages/watchmen-agent-scenario
poetry install

# point at your environment (defaults target localhost)
export SCN_DOLL_HOST=http://localhost:8000          # doll / gateway
export SCN_METRICFLOW_HOST=http://localhost:8910    # standalone metricflow
export SCN_ADMIN_USER=<admin-user>                  # or SCN_ADMIN_PAT
export SCN_ADMIN_PASSWORD=<admin-password>
export SCN_SUPER_PAT=<super-admin-pat>              # only bootstrap/teardown need it
export SCN_MYSQL_USER=<mysql-user>                  # needs CREATE DATABASE
export SCN_MYSQL_PASSWORD=<mysql-password>

poetry run agent-scenario run        # bootstrap + push + bind + inject + verify
```

Every step prints `[PASS] name - detail`; the run exits non-zero on any failure
and writes `agent-scenario-work/scenario-report.json`.

## What a `run` does

1. **bootstrap** — create the scenario MySQL database, register the datasource
   (`POST /datasource`, super-admin only), and bind the tenant infra
   monitor-log topics (same trick as `watchmen-test-harness`);
2. **push** — `agent-cli` dry-run + push of topics (the upsert response is an
   id-free view, so the driver reads the real `topicId` back from
   `/topic/list/name`), pipelines, semantic model (rendered with the real
   `topicId`), metrics, and ontology — everything through the actual CLI
   commands. The driver keeps **three vaults**: a doll-pointed one for
   topic/pipeline, a metricflow-pointed one for semantic/metric/ontology
   (agent-cli holds a single host per vault while the two endpoint families live
   on different services), and the `agent-runtime-cli` vault;
3. **bind** — patch ontology `VirtualObject.datasourceId` via
   `POST /ontology/save` (the no-id agent YAML cannot carry it, and without it
   ontology query returns empty data);
4. **inject** — POST every mock policy record to `/pipeline/data`, synchronously
   triggering both pipelines;
5. **verify** — `agent-runtime-cli health / metrics list / metrics value /
   ontology list / get / compile / query`, asserting results against expected
   aggregates computed from the same mock records.

## Subcommands

| Command | What it does | When to use |
| --- | --- | --- |
| `run` | all of the below in one shot | first-time / CI evaluation |
| `run --skip-bootstrap` | reuse an existing datasource (found by `SCN_DATASOURCE_CODE`) | environment already prepared, or no super-admin creds at hand |
| `bootstrap` | create database + datasource + bind infra topics | prepare once, then iterate on push/verify |
| `push` | render YAML and push everything via `agent-cli` | definition iteration |
| `bind` | bind ontology virtual objects to the datasource | after `push` only |
| `bind-infra` | bind tenant infra monitor topics (`raw_pipeline_monitor_log`, `pipeline_monitor_error_log`) to the scenario datasource | once per fresh tenant — pipelines otherwise log async monitor-write errors; `run` does it automatically (also with `--skip-bootstrap`) |
| `inject` | POST mock records to `/pipeline/data` | after pipelines are enabled |
| `verify` | runtime assertions via `agent-runtime-cli` | repeatable smoke check |
| `merge-check` | inject one changed record (P101 premium +100), re-run every runtime assertion against the shifted expectations (insert-or-merge **UPDATE propagation** through pipelines, metrics and the ontology derived attribute), restore the original value and assert the aggregates fall back | data-change semantics; `run` executes it automatically after `verify` |
| `teardown [--drop-db]` | best-effort removal of all scenario entities (needs `TUPLE_DELETABLE` server-side); `--drop-db` also drops the MySQL database | clean slate / CI teardown |
| `config` | print resolved settings with secrets masked | debugging env wiring |

## What gets verified (exact values)

With the shipped 15-record mock set:

| Assertion | Expected |
| --- | --- |
| `metrics value agent_total_premium --group-by region` | east 5100, central 5000, west 5750 |
| `... --group-by policy_status` | active 11750, lapsed 4100 |
| `metrics value agent_premium_per_policy` | 1056.67 (15850 / 15) |
| `ontology list/get` | ontology + both virtual objects resolve |
| `ontology compile` (region=east, derived total_premium) | SQL contains the link JOIN |
| `ontology query` (region=east) | 2 customers; derived premiums C001 2900, C002 2200 |
| `merge-check` (P101 premium 1200→1300) | every aggregate shifts by +100: east 5200, total 15950, ratio 1063.33, C001 derived 3000; after restore all values return to the originals |

Change the mock file and every expected value follows automatically — nothing
is hand-written twice.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `SCN_DOLL_HOST` | `http://localhost:8000` | doll / gateway host for `agent-cli` |
| `SCN_METRICFLOW_HOST` | `http://localhost:8910` | metricflow host for `agent-runtime-cli` |
| `SCN_ADMIN_PAT` | — | PAT for both vaults (preferred) |
| `SCN_ADMIN_USER` / `SCN_ADMIN_PASSWORD` | — | doll login; a PAT is auto-created via `/pat/create` when omitted |
| `SCN_SUPER_PAT` | admin PAT | super-admin PAT for `POST /datasource` (bootstrap) and datasource delete (teardown); username/password is never accepted for this step |
| `SCN_MYSQL_HOST` / `SCN_MYSQL_PORT` | `127.0.0.1` / `3306` | MySQL server for the scenario database |
| `SCN_MYSQL_USER` / `SCN_MYSQL_PASSWORD` | — | MySQL credentials (needs `CREATE DATABASE`) |
| `SCN_MYSQL_DATABASE` | `watchmen_agent_scenario` | scenario database name |
| `SCN_DATASOURCE_CODE` | `agent_scenario` | `dataSourceCode` referenced by the topic YAML |
| `SCN_WORKDIR` | `agent-scenario-work` | working dir for vaults and the report |

Secrets live only inside the working directory (gitignored); never commit it.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Login failed` / 401 | wrong `SCN_ADMIN_*` or expired PAT | fix creds or provide `SCN_ADMIN_PAT` |
| bootstrap datasource 403 | `/datasource` is super-admin only | provide a super-admin PAT via `SCN_SUPER_PAT`, or use `--skip-bootstrap` with a pre-created datasource |
| `semantic push` 404 | metricflow vault points at the doll | check `SCN_METRICFLOW_HOST` really routes `/metricflow/*` and `/ontology/*` |
| `semantic push` 500 | datasource row has `params = NULL` (SQL-seeded rows) | set `params` to `[]`, or create the datasource via REST |
| `ontology list` 500 | server bug: missing `pageNumber`/`pageSize` | driver already sends them; upgrade metricflow |
| `filters is required` 400 | `ONTOLOGY_QUERY_REQUIRE_FILTERS` on | driver pins `region=east`; nothing to do |
| pipeline push `keywords must be strings` | pipeline YAML contains an `on:` key (YAML 1.1 bool) | keep `on` out of the YAML (scenario files already comply) |
| PAT rejected only via CLI | PAT starts with `-` | driver passes `--opt=value`; do the same in manual calls |
| topic data write fails on new tenant | infra monitor topics unbound | `bootstrap` handles it; without it, bind them manually |

## Notes

- The scenario is **idempotent**: re-running `run` upserts everything by name
  (`insert-or-merge` keeps row counts and metric values stable) — verified by
  running `run` twice and `verify` afterwards.
- The Typer entry of `agent-cli` misses a working `--dry-run` on
  `semantic/metric push-file`, so the driver uses the argparse entrypoint
  (`python -m agent_cli.main`) for those.
- Local development example and Chinese walkthrough: see
  `docs/agent-scenario-guide.md` in the repo `docs/` directory (gitignored).
- The full CLI contract being exercised here is documented in
  `docs/agent-cli-ai-agent-handbook.md`.
- Unit tests (`poetry run python -m unittest discover -s
  test/watchmen_agent_scenario_test -p 'test_*.py'`) validate YAML structure,
  cross-references and expected aggregates without a server.
