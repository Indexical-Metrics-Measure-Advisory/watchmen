# AGENTS.md

Guidance for AI coding agents working in this repository. Read this before making any changes.

## Project Overview

**Watchmen** is a low-code data analytics platform covering data pipelines, metadata management, data quality (DQC), indicator/metrics analysis, and data collection. It is a large monorepo (MIT license) with:

- A **Python backend** (~50 packages under `packages/`), built with **Python 3.12, FastAPI, Pydantic v2, and Poetry**.
- Several **TypeScript/React frontends** (the main one is `packages/watchmen-web-client`, plus newer Vite-based clients).
- GitHub Actions workflows (`.github/workflows/`) for testing, Docker image publishing, and PyPI releases.

The main deployable server is `packages/watchmen-rest-doll` (the "doll" app), a FastAPI application that aggregates routers from many feature packages and is served with uvicorn.

## Repository Layout

- `packages/` — all real source code lives here (see module map below).
- `docs/` — design documents and analysis reports (note: `docs/` is in `.gitignore`).
- Top-level directories like `ontology-*-design/`, `pii-dqc-management/`, `watchmen-portal/`, `watchmen-data-monitor/`, `code-quality-review/` — generated HTML design/analysis artifacts, **not** application source. Do not treat them as code to modify.
- `.trae/rules/CLAUDE.md` — behavioral rules adopted for this repo (summarized under Code Style below; they apply).
- `.github/workflows/` — CI/CD definitions.

## Module Map (packages/)

The Python backend follows a strict layered architecture. Package names use dashes (`watchmen-xxx`); the importable module uses underscores (`watchmen_xxx`) under a `src/` directory.

**Foundation**

- `watchmen-utilities` — shared helpers (`ArrayHelper`, datetime/json/string helpers, logging). Almost every package depends on it.
- `watchmen-model` — Pydantic domain models for the whole platform (admin, pipeline, console, dqc, indicator, etc.).

**Storage layer (plugin/SPI style)**

- `watchmen-storage` — storage abstraction and SPI.
- `watchmen-storage-*` — one adapter per database/backend: `mysql`, `postgresql`, `oracle`, `mssql`, `mongodb`, `rds`, `trino`, `s3`, `oss`, `adls`, plus async and vendor variants (`-mysql-async`, `-dsql`, `-dynamo`, `-aurora-limitless`, `-tdsqlb`, ...).

**Metadata & auth**

- `watchmen-meta` — metadata domain services.
- `watchmen-auth` — authentication (user / PAT based).

**Kernel / Surface pattern** — business logic ("kernel") is separated from API exposure ("surface"):

- `watchmen-pipeline-kernel` / `watchmen-pipeline-surface` — pipeline engine and its API.
- `watchmen-collector-kernel` / `watchmen-collector-surface` — data collection.
- `watchmen-data-kernel` / `watchmen-data-surface` — topic data read/write.
- `watchmen-inquiry-kernel` / `watchmen-inquiry-surface` / `watchmen-inquiry-trino` — query/inquiry.
- `watchmen-indicator-kernel` / `watchmen-indicator-surface` — metrics/indicators.

**REST applications**

- `watchmen-rest` — FastAPI base app (`RestApp`), health router, shared REST infrastructure.
- `watchmen-rest-doll` — **the main server**. `src/watchmen_rest_doll/main.py` wires all routers together; entry point is `uvicorn watchmen_rest_doll.main:app`. Database drivers and integrations (kafka, rabbit, sso, prometheus, ...) are **optional Poetry extras** (`mysql`, `oracle`, `mongodb`, `trino`, `kafka`, `sso`, ...).
- `watchmen-rest-dqc` — standalone DQC server.

**Other backend packages**: `watchmen-dqc` (data quality engine), `watchmen-lineage`, `watchmen-metricflow`, `watchmen-ai-copilot` (LLM copilot service), `watchmen-agent-cli` / `watchmen-agent-runtime-cli`, `watchmen-cli` (fire-based CLI), `watchmen-migration`, `watchmen-integration`, `watchmen-batch-writer`, `watchmen-webhook-server`, `watchmen-serverless` / `watchmen-serverless-lambda`, `watchmen-pii-classification`, `watchmen-search`, `watchmen-test-postman` (Postman/newman API test collections).

**Frontends (TypeScript/React)**

- `watchmen-web-client` — the main, mature UI: **React 18 + TypeScript 4.8, Create React App via `react-app-rewired`** (`config-overrides.js`), styled-components, echarts, monaco-editor. Uses **yarn** (`yarn.lock`).
- Newer Vite-based clients (each standalone, with their own toolchain — npm/bun, tailwind, etc.): `watchmen-portal-client`, `watchmen-analysis-client`, `watchmen-data-asset-client`, `watchmen-monitor-client`, `watchmen-next-client`, `watchmen-dqc-client`, `watchmen-ingestion-client`. Treat each as an independent app; check its own `package.json` before working in it.

## Build, Run, and Test Commands

**Python packages** (run inside the specific package directory, e.g. `packages/watchmen-rest-doll`):

```bash
poetry install                      # install deps (per package)
poetry install -E mysql             # with extras (rest-doll supports many extras)
uvicorn watchmen_rest_doll.main:app --host 0.0.0.0 --port 8000   # run the main server
```

**Testing**

- Python tests live in `test/watchmen_<name>_test/` inside a package and are mostly **`unittest.TestCase`-style**; `watchmen-pii-classification` and `watchmen-search` use pytest. Test coverage across packages is sparse — do not assume a global test runner exists; run tests from within the package that owns them.
- End-to-end API testing happens in CI: `.github/workflows/test-build-{mysql,mongo,pgsql,mssql,mariadb}.yml` start a real database service, boot `watchmen-rest-doll` against it (configured via env vars like `META_STORAGE_TYPE`), then run Postman collections from `watchmen-test-postman` with newman.

**Web client** (in `packages/watchmen-web-client`):

```bash
yarn start          # dev server
yarn build          # production build
yarn test           # CRA tests
yarn import-lint    # custom import-convention check (see Code Style)
```

## Code Style Guidelines

Python:

- **Tabs for indentation**, single quotes for strings — match the existing style of each file.
- All comments, docstrings, and inline annotations **must be in English**.
- Data structures are Pydantic models; extend models in `watchmen-model` rather than inventing parallel shapes.
- Cross-package dependencies are declared as Poetry **path dependencies with `develop = true`** (e.g. `watchmen-utilities = { path = "../watchmen-utilities", develop = true }`).

TypeScript/React (`watchmen-web-client`):

- Import alias `@/` maps to `src/` (see `tsconfig.extend.json`, `config-overrides.js`).
- Import convention enforced by `yarn import-lint`: imports **crossing** top-level src modules (`admin`, `console`, `widgets`, `services`, ...) must use the `@/...` alias; imports **within** the same top-level module must use relative paths. Run `yarn import-lint` after touching imports.
- UI uses styled-components and an event-bus pattern (`@/widgets/events/event-bus`); follow existing component structure.

General rules (from `.trae/rules/CLAUDE.md`, which apply here):

- Surgical changes: touch only what the task requires; don't refactor adjacent code or fix unrelated dead code.
- Simplicity first: no speculative abstractions or unrequested configurability.
- **Never commit machine-specific absolute paths** (`/Users/...`, `file:///...`). Watch Poetry lockfiles and generated configs, which leak these; use relative paths or env vars.

## Configuration & Runtime

- Backend services are configured via **environment variables** through `pydantic-settings` (see e.g. `packages/watchmen-rest-doll/src/watchmen_rest_doll/settings.py`). Examples: `META_STORAGE_TYPE`, `META_STORAGE_HOST`, `TUPLE_DELETABLE`, `LOGGER_LEVEL`, `SSO_ON`.
- The doll server exposes port **8000**; the web client dev build is served separately (default deployment at port 3030 via Docker).

## Deployment & Release Process

- **Docker images**: GitHub workflows `image-publish-*.yml` build and publish images. The doll has per-database Dockerfiles in `packages/watchmen-rest-doll/build_script/` (`Dockerfile_mysql`, `Dockerfile_all`, ...); frontends and other services have their own `Dockerfile`.
- **PyPI releases**: `.github/workflows/pypi-publish.yml` builds and publishes the Python packages in dependency order (utilities → model → storage → ... → rest-doll → cli → metricflow).
- **Versioning**: all Python packages share an aligned version (currently `18.0.0`), bumped together by `.github/workflows/version-align.yml` via the `change-poetry-version` composite action. The web client versions independently (`16.4.0`). Do not hand-edit a single package's version — releases go through the release workflows (`release-r-tag.yml`, `release-manual.yml`).

## Security Considerations

- Never commit secrets, credentials, or `.env` files. Database credentials, SSO certs, and similar must come from env vars / secrets managers (`watchmen-storage` includes an AWS secrets manager integration).
- Authentication is handled in `watchmen-auth` (user/password + PAT tokens); SSO (SAML2/OIDC) is optional in rest-doll. Preserve the auth flow when touching REST endpoints.
- The `HIDE_DATASOURCE_PWD` setting exists to avoid exposing datasource passwords through APIs — keep such redaction behavior intact.
- Before committing, scan the diff for local absolute paths and anything that looks like a credential.
