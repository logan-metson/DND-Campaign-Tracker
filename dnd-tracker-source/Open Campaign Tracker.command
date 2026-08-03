#!/bin/bash
# Double-click this in Finder: rebuilds dist/dnd-campaign-tracker.html from the current source
# (so a `git pull` never leaves you playing a stale version) and opens it in your default browser.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed (or not on PATH) — install it first, e.g. \`brew install node\`."
  read -r -p "Press Return to close this window..."
  exit 1
fi

node build.js && open dist/dnd-campaign-tracker.html
