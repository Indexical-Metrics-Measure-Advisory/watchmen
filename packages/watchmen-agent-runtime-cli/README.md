# Watchmen Agent Runtime CLI

`agent-runtime-cli` is a lightweight command line tool for querying Watchmen MetricFlow runtime APIs from a local terminal or automation workflow.

It is designed for:
- health checking runtime services
- inspecting available metrics and dimensions
- fetching a single metric value with filters and grouping
- sending batch metric queries from a JSON file

The CLI outputs JSON so it can be used directly by scripts, agents, and pipelines.

## Features

- Local vault-based connection management
- PAT authentication
- Runtime health and current date checks
- Metric discovery commands
- Single metric query with filters, grouping, ordering, and time granularity
- Batch query through a JSON request file

## Installation

From the package directory:

```bash
cd packages/watchmen-agent-runtime-cli
poetry install
```

Run commands with:

```bash
poetry run agent-runtime-cli --help
```

## Configuration

The CLI stores connection settings under the selected vault directory:

```text
<vault>/.agent-runtime-cli/config.json
```

You can initialize a vault with:

```bash
poetry run agent-runtime-cli init \
  --vault ./runtime-vault \
  --host http://localhost:8000 \
  --pat <YOUR_PAT>
```

Supported config fields:
- `host`
- `pat`

If `--host` does not start with `http://` or `https://`, the CLI automatically prefixes `http://`.

## Environment Variables

The CLI also supports environment-based defaults:

- `AGENT_RUNTIME_CLI_HOST`
- `AGENT_RUNTIME_CLI_PAT`
- `AGENT_RUNTIME_CLI_VAULT`
- `AGENT_RUNTIME_CLI_DEBUG`

Priority order is:
- explicit CLI arguments
- vault config
- environment variables

## Authentication

The CLI uses PAT authentication:

- Sends `Authorization: pat <PAT>`

If no PAT is available, the CLI fails with an authentication error.

## Commands

### Init

Initialize local vault and save runtime connection config.

```bash
poetry run agent-runtime-cli init \
  --vault ./runtime-vault \
  --host http://localhost:8000 \
  --pat <YOUR_PAT>
```

### Config

Show current vault configuration with masked credentials.

```bash
poetry run agent-runtime-cli config --vault ./runtime-vault
```

### Discover

Output the command catalog in JSON format.

```bash
poetry run agent-runtime-cli discover
```

### Health

Call `/metricflow/health`.

```bash
poetry run agent-runtime-cli health --vault ./runtime-vault
```

### Date

Call `/metricflow/current_date`.

```bash
poetry run agent-runtime-cli date --vault ./runtime-vault
```

## Metric Commands

### List Metrics

Call `/metricflow/list_metrics`.

```bash
poetry run agent-runtime-cli metrics list --vault ./runtime-vault
```

### Metric Dimensions

Call `/metricflow/dimensions_by_metric`.

```bash
poetry run agent-runtime-cli metrics dimensions total_premium --vault ./runtime-vault
```

### Find Shared Dimensions

Call `/metricflow/find_dimensions` with a metric list.

```bash
poetry run agent-runtime-cli metrics find-dimensions \
  --metrics total_premium,claim_count \
  --vault ./runtime-vault
```

### Single Metric Value

Call `/metricflow/get_metric_value`.

```bash
poetry run agent-runtime-cli metrics value total_premium \
  --group-by policy_year,product_line \
  --where "policy_year >= 2024" \
  --start-time 2026-01-01T00:00:00 \
  --end-time 2026-03-31T23:59:59 \
  --order policy_year,-total_premium \
  --limit 100 \
  --time-granularity month \
  --vault ./runtime-vault
```

Supported options:
- `metric_name` positional metric name
- `--group-by` comma-separated dimensions
- `--where` filter expression string
- `--start-time` ISO datetime
- `--end-time` ISO datetime
- `--order` comma-separated order fields
- `--limit` integer row limit
- `--time-granularity` runtime granularity value

### Batch Query From File

Call `/metricflow/query_metrics` using a JSON file.

```bash
poetry run agent-runtime-cli metrics query-file ./queries.json --vault ./runtime-vault
```

The file must be a JSON array.

Example:

```json
[
  {
    "metric": "total_premium",
    "group_by": ["policy_year"],
    "start_time": "2026-01-01T00:00:00",
    "end_time": "2026-03-31T23:59:59"
  },
  {
    "metric": "claim_count",
    "group_by": ["claim_status"]
  }
]
```

## Output Format

All successful command responses are printed as formatted JSON:

```json
{
  "status": "ok"
}
```

Errors are written to stderr.

## Debugging

To print Python tracebacks for troubleshooting:

```bash
poetry run agent-runtime-cli --debug health --vault ./runtime-vault
```

Or set:

```bash
export AGENT_RUNTIME_CLI_DEBUG=1
```

## Common Usage Flow

Initialize once:

```bash
poetry run agent-runtime-cli init --vault ./runtime-vault --host http://localhost:8000 --pat <PAT>
```

Check service:

```bash
poetry run agent-runtime-cli health --vault ./runtime-vault
poetry run agent-runtime-cli date --vault ./runtime-vault
```

Inspect available metrics:

```bash
poetry run agent-runtime-cli metrics list --vault ./runtime-vault
poetry run agent-runtime-cli metrics dimensions total_premium --vault ./runtime-vault
```

Run a metric query:

```bash
poetry run agent-runtime-cli metrics value total_premium \
  --group-by policy_year \
  --time-granularity month \
  --vault ./runtime-vault
```

## Error Notes

- **Vault config not found**
  - Run `init` first or point `--vault` to the correct directory.
- **Need PAT**
  - Provide `--pat` during init, or configure `AGENT_RUNTIME_CLI_PAT`.
- **Query file must be a JSON array**
  - Ensure the file passed to `metrics query-file` is a top-level JSON array.
- **HTTP 4xx/5xx errors**
  - Verify host, credentials, API path availability, and request parameters.

## Script Entry

This package exposes the CLI entrypoint:

```text
agent-runtime-cli = agent_runtime_cli.main:run
```
