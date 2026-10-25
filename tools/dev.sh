#!/usr/bin/env bash
# Build both plugins, copy them where Grafana looks, and start local Grafana.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRAFANA_HOME="$ROOT/.grafana-dl/grafana-13.2.4"

"$ROOT/tools/sync.sh"

echo "==> starting Grafana on http://localhost:3000 (admin / admin)"
exec "$GRAFANA_HOME/bin/grafana" server --homepath "$GRAFANA_HOME" --config "$ROOT/grafana/custom.ini"
