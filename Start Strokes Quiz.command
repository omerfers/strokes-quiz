#!/bin/bash
# Double-click this file in Finder to start the Strokes Song Quiz.
#
# It builds both plugins, copies them where Grafana looks, and starts a local
# Grafana server, then opens the dashboard in your browser.
# Keep the Terminal window open while you play. Press Ctrl+C to stop.

cd "$(dirname "$0")" || exit 1

URL="http://localhost:3000/d/strokes-quiz/?kiosk&hideLogo=1"

if curl -s --max-time 2 http://localhost:3000/api/health >/dev/null 2>&1; then
  echo "Grafana is already running — opening the quiz."
  open "$URL"
  exit 0
fi

if [ ! -x ".grafana-dl/grafana-13.2.4/bin/grafana" ]; then
  echo "Grafana is not installed in this folder."
  echo "See 'Installing Grafana manually' in README.md, or ask for the .grafana-dl folder."
  read -r -p "Press Enter to close..." _
  exit 1
fi

if [ ! -d "omer-strokesquiz-panel/node_modules" ] || [ ! -d "omer-strokesquiz-datasource/node_modules" ]; then
  echo "Dependencies are missing. Run this once first:"
  echo "  (cd omer-strokesquiz-panel && npm install)"
  echo "  (cd omer-strokesquiz-datasource && npm install)"
  read -r -p "Press Enter to close..." _
  exit 1
fi

echo "Starting The Strokes Song Quiz (http://localhost:3000, admin / admin)."
echo "Keep this window open while you play. Press Ctrl+C to stop."
(sleep 12; open "$URL") &

exec ./tools/dev.sh
