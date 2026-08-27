#!/bin/bash
# Best-effort schema bootstrap, matching CI semantics: .github/workflows/test-build-*.yml
# pipe every script into psql WITHOUT ON_ERROR_STOP, so per-file failures are logged and
# skipped rather than aborting initialization. The quick-start runner script aborts on
# first error, which the full versioned trees in watchmen-storage-postgresql trip over.
set -u

run_sql_in_dir() {
	local base_dir="$1"
	[ -d "$base_dir" ] || return 0
	local dirs
	dirs=$(find "$base_dir" -maxdepth 1 -mindepth 1 -type d | sort -V)
	for d in $dirs; do
		echo "Processing version directory: $d"
		for f in $(find "$d" -maxdepth 1 -name "*.sql" | sort); do
			if ! psql -q --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f" >/dev/null 2>&1; then
				echo "    (non-fatal) $f reported errors; continuing, CI-style"
			fi
		done
	done
}

run_sql_in_dir /docker-entrypoint-initdb.d/init-scripts/meta-scripts
run_sql_in_dir /docker-entrypoint-initdb.d/init-scripts/data-scripts
echo "Watchmen Database Initialization Completed."
