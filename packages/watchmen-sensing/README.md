# watchmen-sensing

Watchmen sensing system — continuously senses the data environment and turns raw
changes into structured **Signals** with ontology context for AI reasoning and action.

## Loop

```
Sensing -> Signal -> Context -> AI Reasoning -> Decision -> Action -> Verify -> Feedback
                                                                          |
                                                                          +--> Sensing
```

Core principle: the LLM never continuously observes raw data. The sensing engine
does the observation and produces compressed Signals + Context; pydantic-ai agents
do the understanding, reasoning and planning.

## Package layout

- `model/` — self-contained domain models (`Signal`, `Sensor`, `Evidence`,
  `SignalContext`, `RecommendedAction`, `AutonomousLevel`, typed payloads).
- `meta/` — storage services (`Shaper` + `TupleService` pattern).
- `sensor/` — detectors, one module per sensing type (MVP P0 sensors live here,
  P1/P2 stubs live under `sensor/_ext/`).
- `adapter/` — turns existing subsystems (DQC, pipeline monitor log, lineage,
  ontology) into read-only sensor inputs. Nothing is reimplemented.
- `engine/` — `signal_engine` (lifecycle state machine), `context_engine`
  (ontology + lineage + impact + history compression), `action_engine`
  (recommended actions + risk gates), `feedback_engine`.
- `agent/` — pydantic-ai reasoning agents (root cause, impact, action planning,
  verification). **No DSPy.**
- `service/` — orchestration (`sensing_service`, `signal_lifecycle_service`,
  `context_service`, `action_service`).
- `router/` — FastAPI routers.
- `scheduler/` + `boot/` — APScheduler periodic sensing.

## Run

The package ships its own `SensingApp(RestApp)` so it runs standalone, exactly
like `watchmen-ai-copilot`:

```bash
poetry install -E mysql
uvicorn watchmen_sensing.main:app --host 0.0.0.0 --port 8000
```

### Optional: wire into `watchmen-rest-doll`

By default sensing is **not** mounted on the doll server (keeping the doll image
free of LLM dependencies, mirroring `watchmen-ai-copilot`). To mount it:

1. In `packages/watchmen-rest-doll/pyproject.toml`, add the path dependency:
   ```toml
   watchmen-sensing = { path = "../watchmen-sensing", develop = true }
   ```
2. In `packages/watchmen-rest-doll/.../main.py`, add:
   ```python
   from watchmen_sensing import get_sensing_routers
   ...
   ArrayHelper(get_sensing_routers()).each(lambda x: app.include_router(x))
   ```

## Configuration

Sensing is env-var driven via `SensingSettings` (extends `RestSettings`), including
the LLM provider (`SENSING_LLM_MODEL` / `SENSING_LLM_API_KEY` /
`SENSING_LLM_API_BASE` / `SENSING_LLM_API_VERSION`), the periodic scheduler
(`SENSING_SCHEDULER_ENABLED`), and the autonomous-level cap
(`SENSING_AUTONOMOUS_LEVEL`, 0..3). The LLM is **off** until `SENSING_LLM_MODEL`
is set; with it off, signals still flow through sensing → context → action with
rule-based reasoning only.
