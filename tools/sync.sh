#!/usr/bin/env bash
# Build both plugins and copy them to ./plugins, where local Grafana loads them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PANEL="$ROOT/omer-strokesquiz-panel"
DS="$ROOT/omer-strokesquiz-datasource"
PLUGINS="$ROOT/plugins"

echo "==> building panel"
(cd "$PANEL" && npm run build >/dev/null)

echo "==> building data source"
(cd "$DS" && npm run build >/dev/null)

echo "==> syncing plugins to $PLUGINS"
mkdir -p "$PLUGINS"
rm -rf "$PLUGINS/omer-strokesquiz-panel" "$PLUGINS/omer-strokesquiz-datasource"
cp -R "$PANEL/dist" "$PLUGINS/omer-strokesquiz-panel"
cp -R "$DS/dist" "$PLUGINS/omer-strokesquiz-datasource"

echo "done"
