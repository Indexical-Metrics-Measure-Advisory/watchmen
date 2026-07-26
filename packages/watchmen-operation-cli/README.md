# Watchmen Operation CLI

`operation-cli` is a lightweight command line tool for fetching the latest **error data** from Watchmen backend services, covering both:

- **pipeline monitor** - pipeline runtime error logs (`/pipeline/log`, `/pipeline/log/stats`)
- **ingest / collector** - trigger events and online triggers, including failures (`/ingest/monitor/*`)

It is modeled on `watchmen-agent-runtime-cli`: `argparse` + a small `requests`-based REST client + a local vault for connection config. All successful responses are printed as JSON so the CLI can be used directly by scripts, agents, and pipelines.

## Features

- Local vault-based connection management
- PAT authentication (with username/password fallback via `/login`)
- Pipeline runtime error log fetching (filter `status=ERROR`)
- Pipeline monitor log statistics
- Ingest trigger event listing and failure filtering
- Per-event ingestion detail (including `errors` count per table)
- Ingest event statistics
- Latest online triggers (including failures)

## Installation

From the package directory:

```bash
cd packages/watchmen-operation-cli
poetry install
```

Run commands with:

```bash
poetry run operation-cli --help
```

## Configuration

The CLI stores connection settings under the selected vault directory:

```text
<vault>/.operation-cli/config.json
```

You can initialize a vault with:

```bash
poetry run operation-cli init \
  --vault ./operation-vault \
  --host http://localhost:8000 \
  --pat <YOUR_PAT> \
  --tenant-id <TENANT_ID>
```

Supported config fields:

- `host`
- `pat` (preferred) or `username` / `password`
- `tenant_id` - required only for super-admin principals; tenant admins have it forced by the server

If `--host` does not start with `http://` or `https://`, the CLI automatically prefixes `http://`.

## Environment Variables

The CLI also supports environment-based defaults:

- `OPERATION_CLI_HOST`
- `OPERATION_CLI_USERNAME`
- `OPERATION_CLI_PASSWORD`
- `OPERATION_CLI_PAT`
- `OPERATION_CLI_TENANT_ID`
- `OPERATION_CLI_VAULT`
- `OPERATION_CLI_DEBUG`

Priority order is:

1. explicit CLI arguments
2. vault config
3. environment variables

## Authentication

The CLI prefers PAT authentication and sends `Authorization: pat <PAT>`. If no PAT is configured, it falls back to username/password by calling `POST /login` and then sends `Authorization: Bearer <accessToken>`.

## Commands

### init

Initialize the local vault and save connection config.

```bash
poetry run operation-cli init \
  --vault ./operation-vault \
  --host http://localhost:8000 \
  --pat <YOUR_PAT> \
  --tenant-id <TENANT_ID>
```

### config

Show current vault configuration with masked credentials.

```bash
poetry run operation-cli config --vault ./operation-vault
```

### discover

Output the command catalog in JSON.

```bash
poetry run operation-cli discover
```

## Pipeline Commands

### pipeline errors

Fetch the latest pipeline runtime error logs (`POST /pipeline/log`, body `status=ERROR`).

```bash
poetry run operation-cli pipeline errors \
  --page-size 50 \
  --start-date 2026-07-20T00:00:00 \
  --end-date 2026-07-26T23:59:59 \
  --tenant-id <TENANT_ID> \
  --vault ./operation-vault
```

Options:

- `--page-number` (default 1)
- `--page-size` (default 50)
- `--topic-id` filter by topic
- `--pipeline-id` filter by pipeline
- `--start-date` / `--end-date` ISO datetime range
- `--trace-id` filter by trace id
- `--tenant-id` required for super-admin

### pipeline stats

Fetch pipeline monitor log statistics including the `byStatus.ERROR` count (`POST /pipeline/log/stats`).

```bash
poetry run operation-cli pipeline stats \
  --start-date 2026-07-20T00:00:00 \
  --end-date 2026-07-26T23:59:59 \
  --tenant-id <TENANT_ID> \
  --vault ./operation-vault
```

Options:

- `--topic-id`
- `--pipeline-id`
- `--start-date` / `--end-date` ISO datetime range
- `--sample-size` recent-event sample size (1-500, default 200)

## Ingest Commands

### ingest events

Fetch the latest trigger events for the tenant (`POST /ingest/monitor/event`). Returns all statuses; each event carries a `status` field where `3 = FAIL`.

```bash
poetry run operation-cli ingest events --page-size 50 --tenant-id <TENANT_ID> --vault ./operation-vault
```

### ingest failed

Same as `ingest events` but keeps only failed events (`status == 3`) client-side, since the endpoint does not accept a server-side status filter.

```bash
poetry run operation-cli ingest failed --page-size 50 --tenant-id <TENANT_ID> --vault ./operation-vault
```

### ingest detail

Fetch per-table detail for one trigger event, including the `errors` count per table (`GET /ingest/monitor/event/detail?trigger_event_id=...`).

```bash
poetry run operation-cli ingest detail 12345 --tenant-id <TENANT_ID> --vault ./operation-vault
```

### ingest stats

Fetch trigger event statistics, including `byStatus["3"]` (FAIL count) (`POST /ingest/monitor/event/stats`).

```bash
poetry run operation-cli ingest stats --sample-size 200 --tenant-id <TENANT_ID> --vault ./operation-vault
```

### ingest trigger-online

Fetch the latest 10 online triggers (`GET /ingest/monitor/trigger-online`). Failed online triggers carry the error/traceback in their `result` field.

```bash
poetry run operation-cli ingest trigger-online --tenant-id <TENANT_ID> --vault ./operation-vault
```

## Output Format

All successful command responses are printed as formatted JSON. Errors are written to stderr.

## Debugging

To print Python tracebacks for troubleshooting:

```bash
poetry run operation-cli --debug pipeline errors --vault ./operation-vault
```

Or set:

```bash
export OPERATION_CLI_DEBUG=1
```

## Common Usage Flow

Initialize once:

```bash
poetry run operation-cli init --vault ./operation-vault --host http://localhost:8000 --pat <PAT> --tenant-id <TENANT_ID>
```

Inspect the latest pipeline errors:

```bash
poetry run operation-cli pipeline errors --page-size 20 --vault ./operation-vault
```

Inspect the latest ingest failures:

```bash
poetry run operation-cli ingest failed --page-size 20 --vault ./operation-vault
poetry run operation-cli ingest detail <trigger_event_id> --vault ./operation-vault
```

## Error Notes

- **Vault config not found** - run `init` first or point `--vault` to the correct directory.
- **Need PAT** - provide `--pat` during init, or configure `OPERATION_CLI_PAT`.
- **HTTP 4xx/5xx errors** - verify host, credentials, API path availability, and request parameters.
- **Tenant id is required** - the backend rejects super-admin requests without `tenantId`; tenant admins can omit it.

## Script Entry

This package exposes the CLI entrypoint:

```text
operation-cli = operation_cli.main:run
```
