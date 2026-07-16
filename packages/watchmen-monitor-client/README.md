# watchmen-monitor-client

Read-only monitoring console for the Watchmen platform — a single pane of glass over the
**Ingest Monitor**, **Pipeline Monitor** (runtime + definition), and **Topic** services, plus a
cross-service **Overview** dashboard.

The UI design language follows the static mockups in `watchmen-data-monitor/` and the
frontend design document at `docs/data-monitor-frontend-design.md`.

## Tech stack

- **Vite 5** + `@vitejs/plugin-react-swc` (SWC)
- **React 18** + **TypeScript 5**
- **shadcn/ui** (Radix primitives) + **Tailwind CSS 3** + CSS variables
- **react-router-dom** v6 for routing
- **@tanstack/react-query** v5 for server-state / data fetching
- **recharts** for charts (ECharts-style area/bar visuals)
- **i18next** + react-i18next (en / zh-CN)
- **lucide-react** icons
- HTTP via native `fetch` + a shared bigint-safe helper (`src/utils/apiConfig.ts`)

## Pages

| Route | Page | Backend service(s) |
|---|---|---|
| `/` | Overview dashboard (KPIs, stage health, throughput, recent errors) | ingest + pipeline + topic (client-side aggregation) |
| `/ingestion` | Ingestion Monitor — trigger events + per-table results + record/json/task counts | `watchmen-rest-doll/ingest/monitor/*` |
| `/pipeline` | Pipeline Monitor — filterable log list + nested stage/unit/action DAG detail + rerun | `watchmen-pipeline-surface` (runtime) + `watchmen-rest-doll/admin/pipeline_*` (meta) |
| `/topics` | Topics — searchable catalog + factor table + related pipelines + YAML view | `watchmen-rest-doll/admin/topic_*` |

Disabled placeholders (gated by env flags): Alerts (`VITE_SHOW_ALERTS`), Global Map (`VITE_SHOW_GLOBAL_MAP`), Settings.

## Project layout

```
src/
├── main.tsx / App.tsx        # entry + routes + QueryClientProvider
├── context/AuthContext.tsx   # auth provider (reused from ingestion-client)
├── components/
│   ├── ui/                   # shadcn primitives
│   ├── Layout.tsx            # app shell: sidebar + topbar (search/time-range/refresh)
│   ├── AppSidebar.tsx        # nav: Overview/Ingestion/Pipeline/Topics
│   └── monitor/              # KpiTile, StatusPill, ProgressMeter, SegmentedStatusBar, EmptyState, ErrorBanner
├── hooks/
│   ├── useMonitorQueries.ts  # react-query wrappers for all services
│   └── useAutoRefresh.ts
├── services/                 # fetch-based API clients (ingestMonitor, pipelineMonitor, pipelineMeta, topic, auth, dataSource, system)
├── models/                   # TS interfaces mirroring backend models (api, monitor, pipeline, pipelineMeta, topic)
├── utils/                    # apiConfig.ts, utils.ts, monitorConstants.ts (enum→tone/label maps)
└── i18n/                     # en + zh-CN resources
```

## Configuration (`.env`)

| Var | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3030/watchmen` | watchmen-rest-doll base URL (dev) |
| `VITE_WEB_CONTEXT` | `/` | router basename |
| `VITE_FORCE_SERVICE_URL` | `false` | force `VITE_API_BASE_URL` in non-localhost |
| `VITE_APP_TITLE` | `Watchmen Data Monitor` | sidebar header |
| `VITE_SHOW_ALERTS` | `false` | show Alerts nav (dqc — not implemented) |
| `VITE_SHOW_GLOBAL_MAP` | `false` | show Global Map nav (lineage — not implemented) |

In production (non-localhost, `VITE_FORCE_SERVICE_URL=false`) the API host is derived from
`${location.protocol}//${location.host}/watchmen` (same-origin behind a proxy).

Auth uses `Authorization: Bearer <token>` only — tenant/role are derived from the JWT on the
backend. Token + account are kept in `sessionStorage`.

## Development

```bash
npm install --legacy-peer-deps   # the shadcn/radix peer set needs legacy resolution
npm run dev                       # dev server on http://localhost:8080
npm run build                     # production build → dist/
npm run lint
```

Verify type-checks with `npx tsc --noEmit -p tsconfig.app.json`.

> Start the backend (`watchmen-rest-doll`) first and point `VITE_API_BASE_URL` at it.

## Conventions

- **HTTP**: every service uses `getDefaultHeaders()` (Bearer injection) + `checkResponse()`
  (bigint-safe JSON parse + error throw). No `axios`. Snowflake-style IDs stay as strings.
- **Services**: one class per domain, exported as a singleton instance.
- **Models**: hand-written interfaces that mirror the backend Pydantic models (see the
  `Source:` comments at the top of each model file for the exact backend file).
- **Status language**: ingest `Status` and pipeline `MonitorLogStatus` render through a unified
  tone mapping in `src/utils/monitorConstants.ts` (success/warning/error/info/neutral).
- **Reused from ingestion-client**: `authService`, `accountService`, `AuthContext`, `AuthGuard`,
  `dataSourceService`, `systemService`, `apiConfig.ts`, `utils.ts`, and the shadcn primitives.

## Known gaps (tracked in design doc §7 Optimization List)

- No backend rollup endpoint — the Overview aggregates client-side from the three services.
- `/ingest/monitor/event` does not support server-side status/date filtering yet (UI filters client-side).
- `EventResultRecord` exposes counts only (no duration / error message) — flagged for backend enhancement.
- Alerts (dqc) and Global Map (lineage) are disabled placeholders pending those services.
