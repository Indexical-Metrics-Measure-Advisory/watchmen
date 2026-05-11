# Command Catalog

## Token-Efficient Discovery Examples
- Find a factor ID by name in a large topic YAML:
  `grep -A 5 "name: factor_name" path/to/topic__id.yml`
- List all remote topics and search for a keyword:
  `poetry run python -m agent_cli.main topic list-remote --vault <vault> | grep "keyword"`
- Check for existing factor in target topic before update:
  `grep "name: factor_name" path/to/target_topic.yml`

## Core
- `init --vault --host --username --password --pat`
- `pull --target topic|pipeline|enum|semantic|metric|ingest_table|ingest_model|ingest_module|all [--vault]`
- `pull --all --vault`  (equivalent to `--target all`)
- `push --target topic|pipeline --vault`
- `tenant --vault`
- `config --vault`
- `discover`

## Topic
- `topic pull <topic_id> --vault`
- `topic pull-name "<topic_name>" --vault`
- `topic push-file <file_path> --vault`
- `topic list --vault`
- `topic list-remote --vault`

## Pipeline
- `pipeline pull <pipeline_id> --vault`
- `pipeline pull-name "<pipeline_name>" --vault`
- `pipeline push-file <file_path> --vault`
- `pipeline list --vault`
- `pipeline list-remote --vault`

## Enum
- `enum pull <enum_id> --vault`
- `enum pull-name "<enum_name>" --vault`
- `enum push-file <file_path> --vault`
- `enum list --vault`
- `enum list-remote --vault`

## Semantic Model (MetricFlow)
- `semantic pull-name "<model_name>" --vault`
- `semantic push-file <file_path> --vault`
- `semantic list --vault`
- `semantic list-remote --vault`

## Metric (MetricFlow)
- `metric pull-name "<metric_name>" --vault`
- `metric push-file <file_path> --vault`
- `metric list --vault`
- `metric list-remote --vault`

## Ingestion
- `ingest table pull "<table_name>" --vault`
- `ingest table push-file <file_path> --vault`
- `ingest table list --vault`
- `ingest table list-remote --vault`
- `ingest model pull "<model_name>" --all --vault`
- `ingest model push-file <file_path> --vault`
- `ingest model list --vault`
- `ingest model create-raw-topic "<model_name>" --vault`
- `ingest model list-remote --vault`
- `ingest module pull "<module_name>" --all --vault`
- `ingest module push-file <file_path> --vault`
- `ingest module list --vault`
- `ingest module list-remote --vault`

