#!/usr/bin/env bash
# Seed watchmen via the doll REST API:
#   1. login as super admin -> JWT
#   2. create a PAT (long-lived token for the perf runner)
#   3. create a tenant
#   4. create a datasource (so topic data can be persisted to postgres)
#   5. create a raw topic + a distinct topic + a pipeline (insert-row to the distinct topic)
#   6. create collector module/model/table config (so scenarios B/D have data to collect)
#
# The script is idempotent-ish: it always creates new entities and prints their ids.
# Re-run only when starting from a clean database.
#
# Default credentials come from packages/watchmen-quick-start (imma-super / change-me).
# See packages/watchmen-rest-doll/src/watchmen_rest_doll/auth/authenticate_router.py:67
# and packages/watchmen-meta/src/watchmen_meta/common/settings.py:18.
set -euo pipefail

DOLL_BASE_URL=${DOLL_BASE_URL:-http://watchmen_doll:8000}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

python3 "$SCRIPT_DIR/seed-watchmen.py" "$DOLL_BASE_URL"
