#!/usr/bin/env bash
# Build an offline-installable tar.gz package for watchmen-rest-doll.
#
# The archive contains:
#   wheels/    - wheel of watchmen-rest-doll itself, all internal watchmen
#                packages and all third-party dependencies
#   install.sh - offline installer (pip install --no-index)
#
# IMPORTANT: binary wheels (uvloop, bcrypt, pydantic-core, ...) match the
# platform and Python version of the machine running this script. Run this
# script on a machine with the SAME OS/arch and Python 3.12 as the
# deployment target (e.g. build inside a linux/amd64 container for a
# Linux server).
#
# Prerequisites:
#   - Python 3.12
#   - Poetry (the script auto-installs poetry-plugin-export if missing)
#
# Usage:
#   ./build-offline-package.sh
#
# Environment variables:
#   SKIP_VERIFY=1    - skip the offline-install smoke test at the end
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PACKAGES_DIR="$(cd "$PKG_DIR/.." && pwd)"
BUILD_DIR="$PKG_DIR/dist/offline"
WHEELS_DIR="$BUILD_DIR/wheels"

# Internal watchmen packages required at runtime but NOT reachable from
# rest-doll's dependency graph: they are declared `optional = true` in
# watchmen-lineage's pyproject.toml without a matching extras section,
# so poetry bakes them into lineage's wheel as hard dependencies.
EXTRA_INTERNAL_PACKAGES="watchmen-inquiry-trino watchmen-storage-mysql watchmen-storage-rds"

# Third-party dependencies introduced by the packages above
# (version constraints copied from their pyproject.toml).
EXTRA_EXTERNAL_REQUIREMENTS=(
	"trino>=0.329.0,<0.330.0"
	"PyMySQL>=1.1.1,<2.0.0"
	"cryptography>=42.0.8,<43.0.0"
	"starlette-prometheus>=0.9.0,<0.10.0"
)

log() {
	echo "==> $*"
}

cd "$PKG_DIR"
VERSION="$(poetry version -s)"
log "Building watchmen-rest-doll ${VERSION} offline package"

# [0] prerequisites
if ! poetry export --help >/dev/null 2>&1; then
	log "Installing poetry-plugin-export"
	poetry self add poetry-plugin-export
fi
PY_BIN="$(poetry run which python)"
PY_VERSION="$("$PY_BIN" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
if [ "$PY_VERSION" != "3.12" ]; then
	echo "ERROR: watchmen requires Python 3.12, but poetry venv uses $PY_VERSION" >&2
	exit 1
fi

# [1] clean build directory
log "[1/7] Preparing $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$WHEELS_DIR"

# [2] build rest-doll itself
log "[2/7] Building watchmen-rest-doll wheel"
poetry build -f wheel
cp "dist/watchmen_rest_doll-${VERSION}-py3-none-any.whl" "$WHEELS_DIR/"

# [3] export full dependency graph and download third-party wheels.
# The file:// lines are kept on purpose: they let pip resolve the exact
# versions constrained by the internal packages' own dependencies.
# (pip downloads their metadata but does not save wheels for them;
# internal packages are built separately in step 4.)
log "[3/7] Downloading third-party dependencies (this may take a few minutes)"
poetry export -f requirements.txt --without-hashes -o "$BUILD_DIR/requirements.txt"
sed 's|^-e file:///|file:///|' "$BUILD_DIR/requirements.txt" > "$BUILD_DIR/requirements-download.txt"
"$PY_BIN" -m pip download -r "$BUILD_DIR/requirements-download.txt" -d "$WHEELS_DIR"

# [4] build wheels for internal watchmen packages
log "[4/7] Building internal watchmen packages"
INTERNAL_PACKAGES=$(grep "^file://" "$BUILD_DIR/requirements-download.txt" \
	| sed -E 's|^file://[^ ]*/([^/ ]+) ;.*|\1|')
for pkg in $INTERNAL_PACKAGES $EXTRA_INTERNAL_PACKAGES; do
	(
		cd "$PACKAGES_DIR/$pkg"
		poetry build -f wheel >/dev/null
		cp dist/*.whl "$WHEELS_DIR/"
	)
	echo "    built $pkg"
done

# [5] download third-party deps of the extra internal packages
log "[5/7] Downloading additional third-party dependencies"
"$PY_BIN" -m pip download --only-binary=:all: -d "$WHEELS_DIR" "${EXTRA_EXTERNAL_REQUIREMENTS[@]}"

# [6] poetry bakes path dependencies into wheel METADATA as
# "Requires-Dist: xxx @ file:///abs/path", which does not exist on the
# deployment machine. Strip the direct URL references from all internal
# wheels so they resolve against the bundled wheels instead.
log "[6/7] Removing file:// references from internal wheel metadata"
"$PY_BIN" - "$WHEELS_DIR" <<'PYEOF'
import re, sys, zipfile, shutil
from pathlib import Path

wheels_dir = Path(sys.argv[1])
for whl in sorted(wheels_dir.glob('watchmen_*.whl')):
	tmp = whl.with_suffix('.whl.tmp')
	with zipfile.ZipFile(whl) as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
		for item in zin.namelist():
			data = zin.read(item)
			if item.endswith('.dist-info/METADATA'):
				data = re.sub(r' @ file:///[^;\n]+', '', data.decode('utf-8')).encode('utf-8')
			zout.writestr(item, data)
	shutil.move(tmp, whl)
	print(f'    rewritten {whl.name}')
PYEOF

# [7] installer + archive
log "[7/7] Creating install.sh and final tar.gz"
cat > "$BUILD_DIR/install.sh" <<'INSTALLEOF'
#!/usr/bin/env bash
# Offline installation of watchmen-rest-doll and all its dependencies.
# Requires Python 3.12 on this machine.
#
# Usage:
#   ./install.sh                  # install into the current python environment
#   ./install.sh /opt/watchmen    # create a virtualenv at the given path and install there
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ $# -ge 1 ]; then
	TARGET_VENV="$1"
	echo "==> Creating virtualenv at $TARGET_VENV"
	python3 -m venv "$TARGET_VENV"
	PIP="$TARGET_VENV/bin/pip"
else
	PIP="pip"
fi

echo "==> Installing watchmen-rest-doll (offline, from bundled wheels)"
"$PIP" install --no-index --find-links "$DIR/wheels" watchmen-rest-doll

echo "==> Done. Start the server with:"
echo "    uvicorn watchmen_rest_doll.main:app --host 0.0.0.0 --port 8000"
INSTALLEOF
chmod +x "$BUILD_DIR/install.sh"

ARCHIVE="$PKG_DIR/dist/watchmen-rest-doll-${VERSION}-offline.tar.gz"
tar -czf "$ARCHIVE" -C "$BUILD_DIR" wheels install.sh

# smoke test: install into a fresh venv without network access
if [ "${SKIP_VERIFY:-0}" != "1" ]; then
	log "Verifying offline installation in a clean venv"
	TEST_VENV="$(mktemp -d)/venv"
	"$PY_BIN" -m venv "$TEST_VENV"
	"$TEST_VENV/bin/pip" install --no-index --find-links "$WHEELS_DIR" watchmen-rest-doll >/dev/null
	"$TEST_VENV/bin/python" -c "import watchmen_rest_doll; print('    offline install verified')"
	rm -rf "$(dirname "$TEST_VENV")"
fi

WHEEL_COUNT=$(ls "$WHEELS_DIR" | wc -l | tr -d ' ')
log "Done: $ARCHIVE"
echo "    wheels: $WHEEL_COUNT, size: $(du -h "$ARCHIVE" | cut -f1)"
