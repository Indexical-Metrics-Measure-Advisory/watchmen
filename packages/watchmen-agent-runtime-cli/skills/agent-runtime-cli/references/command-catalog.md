# Command Catalog

## Core
- `init --vault --host --pat`
- `config --vault`
- `discover`
- `health --vault`
- `date --vault`

## Metrics
- `metrics list --vault`
- `metrics dimensions <metric_name> --vault`
- `metrics find-dimensions --metrics <comma-separated-metrics> --vault`
- `metrics value <metric_name> --group-by --where --start-time --end-time --order --limit --time-granularity --vault`
- `metrics query-file <file_path> --vault`

## Usage Notes
- `--group-by` accepts comma-separated dimension names.
- `--order` accepts comma-separated order fields.
- `--metrics` accepts comma-separated metric names.
- `metrics query-file` expects a top-level JSON array.
