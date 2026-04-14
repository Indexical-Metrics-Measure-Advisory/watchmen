---
name: "agent-runtime-cli"
description: "Queries Watchmen MetricFlow runtime APIs via CLI. Invoke when user wants runtime health checks, metric discovery, dimensions lookup, or metric value/query-file execution."
---

# Agent Runtime CLI

This skill covers the `agent-runtime-cli` package for querying runtime MetricFlow APIs from a local terminal or automation flow.

## When To Invoke

Invoke this skill when the user wants to:
- initialize runtime CLI configuration
- inspect runtime config or discover supported commands
- call runtime health or current date endpoints
- list metrics or inspect metric dimensions
- query metric values with filters, grouping, ordering, or time granularity
- run batch metric queries from a JSON file

## Install ClI and Init 
0 .make sure you alreay have pyhton 3.12+
1. Ensure CLI is installed:
   - Global: `pip install watchmen-agent-runtime-cli` 
2. Ensure vault config exists (`init` first if missing):
   - `agent-runtime-cli init --vault <vault> --host <host> --pat <token>`
3. Prefer module entrypoint for compatibility:
   - `poetry run python -m agent_runtime_cli ...`


## What It Does

- Initializes a local vault and saves runtime connection config
- Uses PAT-based authentication
- Calls runtime endpoints under `/metricflow/*`
- Returns JSON output suitable for agents, scripts, and pipelines

## Vault Layout

Configuration is stored in:

```text
<vault>/.agent-runtime-cli/config.json
```

## Supported Commands

- `init`
  - Args: `--vault`, `--host`, `--pat`
- `config`
  - Args: `--vault`
- `discover`
  - Args: none
- `health`
  - Args: `--vault`
- `date`
  - Args: `--vault`
- `metrics list`
  - Args: `--vault`
- `metrics dimensions`
  - Args: `metric_name`, `--vault`
- `metrics find-dimensions`
  - Args: `--metrics`, `--vault`
- `metrics value`
  - Args: `metric_name`, `--group-by`, `--where`, `--start-time`, `--end-time`, `--order`, `--limit`, `--time-granularity`, `--vault`
- `metrics query-file`
  - Args: `file_path`, `--vault`

## Common Usage

Initialize:

```bash
poetry run agent-runtime-cli init \
  --vault ./runtime-vault \
  --host http://localhost:8000 \
  --pat <PAT>
```

Check health:

```bash
poetry run agent-runtime-cli health --vault ./runtime-vault
```

List metrics:

```bash
poetry run agent-runtime-cli metrics list --vault ./runtime-vault
```

Query one metric:

```bash
poetry run agent-runtime-cli metrics value total_premium \
  --group-by policy_year \
  --time-granularity month \
  --vault ./runtime-vault
```

Run from JSON file:

```bash
poetry run agent-runtime-cli metrics query-file ./queries.json --vault ./runtime-vault
```

## Query File Notes

- The file used by `metrics query-file` must be a top-level JSON array.
- Each item should be a metric query payload accepted by `/metricflow/query_metrics`.

## Authentication Notes

- Recommended and documented mode is PAT authentication.
- The CLI sends:

```text
Authorization: pat <PAT>
```

## References

- Command catalog: `references/command-catalog.md`
- Runtime payload and endpoint summary: `references/source-of-truth.md`
- Installer script: `../../scripts/install-skill.sh`

## Error Guidance

- If vault config is missing, run `init` first.
- If PAT is missing, provide `--pat` during init or configure it in the vault.
- If query file parsing fails, verify the file is valid JSON and the top level is an array.
- If runtime returns 4xx/5xx, verify host, PAT, and endpoint availability.
