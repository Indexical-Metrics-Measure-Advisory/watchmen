# Pipeline Development Guide

## Workflow
1. Pull reference pipeline(s):
   - `agent-cli pipeline pull-name "<name>" --vault <vault>`
   - `agent-cli pipeline list-remote --vault <vault>`
2. Edit local pipeline YAML under `<vault>/pipelines/`.
3. Push pipeline changes:
   - `agent-cli pipeline push-file <vault>/pipelines/<name>.yml --vault <vault>`
   - `agent-cli push --target pipeline --vault <vault>`

## Minimal Insert Pattern
- Use `insert-row` with explicit `mapping`.
- Keep `enabled: false` while drafting if needed.
- Validate target topic and factors exist before push.

## Common Recommendations
- Keep pipeline name unique and descriptive.
- Prefer explicit mappings over implicit behavior.
- Use computed date parts when needed (`year-of`, `month-of`).
