# Dependency Chain

## Entity Dependencies
- Pipeline depends on Topic.
- Topic may depend on Enum through factor `enumId`.
- Ingestion Module contains Ingestion Models.
- Ingestion Model belongs to one Ingestion Module and contains Ingestion Tables.

## Pull Behaviors
- Pulling a pipeline should ensure its related topics are available.
- Pulling a topic should ensure referenced enums are available.
- `pull --target all` should synchronize topic + pipeline + enum.
- `ingest module pull "<module_name>" --all` should pull module + related models + related tables.
- `ingest model pull "<model_name>" --all` should pull model + parent module + related tables.

## Naming Guidance
- Ingestion pull commands use names for CLI parameters.
- Names containing spaces must be wrapped in quotes.
