# watchmen-pii-classification

PII data classification platform — **business-term driven** sensitive-data
discovery and **lineage impact analysis**. Implements the design documented in
`pii-classification-design/pii-classification-design.html`.

This package depends on:

- `watchmen-meta` / `watchmen-model` — `TupleService`, `Topic`/`Factor`/`Pipeline`
- `watchmen-rest` / `watchmen-auth` — HTTP + principal plumbing

It is **hosted by** `watchmen-rest-dqc`: this package exposes one `APIRouter`
which rest-dqc includes. It does not ship its own `RestApp` / `main.py`.

## Package layout

```
src/watchmen_pii/
├── __init__.py
├── app.py                       # get_pii_router() — entrypoint for rest-dqc
├── model/                       # PIIClassificationTerm, LinkedFactor, report/discovery models
├── meta/                        # PIITermService(TupleService) + PIITermShaper
├── service/
│   ├── logic_matcher.py         # FactorType + keyword matching
│   ├── factor_discovery_service.py  # scoped discovery, manual factor linking, confirm
│   ├── upstream_lineage.py      # self-implemented upstream tracer (mirrors downstream)
│   ├── downstream_lineage.py    # self-implemented downstream tracer
│   ├── pii_lineage_report_service.py # aggregates up/down/encryption -> PiiLineageReport
│   └── pii_report_service.py    # term overview + global dashboard + CSV/xlsx export
├── router/pii_router.py         # single APIRouter mounted under /dqc/pii
├── util/trans.py                # per-package transaction wrappers
└── seed/pii_term_seed.py        # 11 built-in PII terms
```

## HTTP API

All endpoints are tagged `UserRole.ADMIN` (delete uses `SUPER_ADMIN`) and are
mounted under `/dqc/pii` by the rest-dqc host.

| Method | Path | Purpose |
|---|---|---|
| GET | `/dqc/pii-terms` | list terms for the current tenant |
| POST | `/dqc/pii-terms` | create or update a term (faked-id redress) |
| GET | `/dqc/pii-terms/{termId}` | load one term |
| PUT | `/dqc/pii-terms/{termId}` | update a term |
| DELETE | `/dqc/pii-terms/{termId}` | delete a term |
| POST | `/dqc/pii-terms/{termId}/discover` | run logic discovery within the term's `topicIds` scope; writes back `linkedFactors` |
| POST | `/dqc/pii-terms/{termId}/factors` | manually link one factor (`{topicId, factorId}`) to the term |
| POST | `/dqc/pii-terms/{termId}/confirm` | confirm / drop linked factors (keys are `topicId|factorId`) |
| POST | `/dqc/pii-terms/{termId}/lineage` | build the upstream + downstream lineage report |
| GET | `/dqc/pii-report` | global dashboard (by level / category / high-risk / top-impact) |
| POST | `/dqc/pii-report/export/{csv\|xlsx}` | download the overview table |

## Integration steps (host side)

These edits live in `watchmen-rest-dqc`, **not** in this package. They are the
only host-side changes required.

1. Add `watchmen-pii-classification` to `watchmen-rest-dqc/pyproject.toml`.
2. In `watchmen-rest-dqc/src/watchmen_rest_dqc/main.py`, include the router
   **behind the host feature flag** — the package is imported and mounted
   only when it is on (see `pii_classification_enabled()` in `main.py`):

   ```python
   if pii_classification_enabled():
       from watchmen_pii.app import get_pii_router
       routers.append(get_pii_router())
   ```

   The flag lives in `watchmen_rest_dqc/settings.py`
   (`PII_CLASSIFICATION_ENABLED`, default `false`) and is read from the
   environment. The seed import in `startup()` is gated by the same flag.
3. (Optional) Seed default terms on startup, mirroring the glossary seed
   pattern in `watchmen-metricflow`:

   ```python
   from watchmen_pii.seed import import_seed_if_empty
   from watchmen_pii.meta import PIITermService
   from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
   principal = ask_super_admin()
   svc = PIITermService(ask_meta_storage(), ask_snowflake_generator(), principal)
   import_seed_if_empty(svc, principal)
   ```

## Storage DDL

The `pii_classification_terms` table mirrors the standard tenant-Tuple shape
(see `watchmen-storage-mysql/meta-scripts/16.0.0/00025-catalogs.ddl.sql`).
Reference MySQL DDL — copy into each `watchmen-storage-<db>/meta-scripts/<version>/`
under the next free `NNNNN-` prefix when deploying:

```sql
CREATE TABLE pii_classification_terms (
    term_id              VARCHAR(50)  NOT NULL,
    name                 VARCHAR(255) NOT NULL,
    description          TEXT,
    category             VARCHAR(64),
    sensitivity_level    VARCHAR(16),
    data_level           VARCHAR(64),
    owner_department     VARCHAR(128),
    match_strategy       VARCHAR(16),
    topic_ids            MEDIUMTEXT,
    factor_type_patterns TEXT,
    keyword_patterns     TEXT,
    linked_factors       MEDIUMTEXT,
    tenant_id            VARCHAR(50)  NOT NULL,
    created_at           TIMESTAMP,
    created_by           VARCHAR(64),
    last_modified_at     TIMESTAMP,
    last_modified_by     VARCHAR(64),
    version              BIGINT NOT NULL DEFAULT 1,
    PRIMARY KEY (term_id)
);
```

PostgreSQL / MSSQL / Oracle equivalents follow the same column set with
vendor-appropriate types. The four list fields
(`topic_ids`, `factor_type_patterns`, `keyword_patterns`, `linked_factors`)
are stored as JSON-encoded text by `PIITermShaper`.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `PII_CLASSIFICATION_ENABLED` | `false` | Host-side flag (`watchmen-rest-dqc`); the PII router and seed import are only wired in when `true` |

## Tests

```
poetry install
poetry run pytest tests/
```

Tests are intentionally storage-free:

- `test_logic_matcher.py` — type/keyword scoring + dedup
- `test_factor_discovery.py` — `_merge` dedup, topicIds-scoped discovery,
  manual `add_factor`, key-based `confirm`, seed default count
- `test_downstream_lineage.py` / `test_upstream_lineage.py` — build real
  `Pipeline`/`Topic` objects and stub `_load_all_pipelines`/`_resolve_topic`
  to verify 2-hop reachability, depth capping and cycle/empty handling
- `test_pii_term_service.py` — shaper JSON round-trip

## Design notes

- **Discovery scope** is declared per term via `topicIds`: only these topics
  are scanned by the logic matcher. Factors can also be linked manually
  (`matchSource='manual'`, always confirmed); confirmed and manual links are
  never overwritten by automatic discovery.
- **Lineage** (both directions) is implemented inside this package.
  `service/upstream_lineage.py` finds the pipelines that *write* the current
  topic+factor and walks to their read sources;
  `service/downstream_lineage.py` finds pipelines whose trigger topic is the
  source (`pipeline.topicId == topic_id`) and walks to their write targets.
  There is no dependency on `watchmen-metricflow`.
- **Graph payload** (`PiiGraphData`) uses package-owned node/edge string
  kinds (`topic_factor`, `pipeline`, `maps_to`, `reads_from`, `produces`)
  defined in `model/report.py`.
- **Export** is the project's first CSV/xlsx helper; CSV uses stdlib `csv`,
  xlsx uses `openpyxl`, returned via `starlette.responses.Response` (same
  media-type pattern as the glossary YAML export).
