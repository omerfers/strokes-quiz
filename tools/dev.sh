#!/usr/bin/env bash
# Build both plugins, copy them where Grafana looks, and start local Grafana.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRAFANA_HOME="$ROOT/.grafana-dl/grafana-13.2.4"

"$ROOT/tools/sync.sh"

# --config lives inside the repo, but paths are passed as environment variables
# so the project works from any directory (and from a copy on the Desktop).
export GF_PATHS_PLUGINS="$ROOT/plugins"
export GF_PATHS_PROVISIONING="$ROOT/grafana/provisioning"
export GF_PATHS_DATA="$ROOT/grafana/data"
export GF_PATHS_LOGS="$ROOT/grafana/logs"
# Used by grafana/provisioning/dashboards/dashboards.yml.
export STROKES_DASHBOARDS="$ROOT/grafana/dashboards"

mkdir -p "$GF_PATHS_DATA" "$GF_PATHS_LOGS"

echo "==> starting Grafana on http://localhost:3000 (admin / admin)"
cd "$ROOT"
exec "$GRAFANA_HOME/bin/grafana" server --homepath "$GRAFANA_HOME" --config "$ROOT/grafana/custom.ini"
