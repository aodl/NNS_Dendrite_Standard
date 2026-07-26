#!/bin/sh
set -eu

frontend=${1:-dist/release/frontend}
[ -f "$frontend/index.html" ] || {
  echo "usage: tools/scripts/browser-smoke.sh [built-frontend-directory]" >&2
  exit 1
}

browser=${DENDRITE_BROWSER_BIN:-}
if [ -z "$browser" ]; then
  for candidate in chromium chromium-browser google-chrome google-chrome-stable; do
    if command -v "$candidate" >/dev/null 2>&1; then
      browser=$(command -v "$candidate")
      break
    fi
  done
fi
if [ -z "$browser" ]; then
  echo "browser smoke UNRUN: no supported Chromium browser engine is installed" >&2
  echo "manual preview: python3 -m http.server 4173 --directory $frontend" >&2
  echo "then open: http://127.0.0.1:4173/#/neuron/2947465672511369" >&2
  exit 2
fi

temporary=$(mktemp -d)
server_pid=
trap '
  [ -z "$server_pid" ] || kill "$server_pid" 2>/dev/null || true
  find "$temporary" -type f -delete
  find "$temporary" -depth -type d -empty -delete
' EXIT HUP INT TERM

python3 -m http.server 4173 --bind 127.0.0.1 --directory "$frontend" \
  >"$temporary/server.log" 2>&1 &
server_pid=$!
for _attempt in 1 2 3 4 5; do
  curl --fail --silent http://127.0.0.1:4173/ >/dev/null && break
done
curl --fail --silent http://127.0.0.1:4173/ >/dev/null

run_viewport() {
  size=$1
  output=$2
  "$browser" \
    --headless \
    --disable-gpu \
    --no-first-run \
    --no-default-browser-check \
    --user-data-dir="$temporary/profile-$size" \
    --window-size="$size" \
    --virtual-time-budget=15000 \
    --dump-dom \
    "http://127.0.0.1:4173/#/neuron/2947465672511369" \
    >"$output" 2>"$output.stderr"
  grep -q 'Verify on-chain' "$output"
  grep -Eq 'Preliminary|No public-configuration blockers found|Preliminary analysis incomplete|Preliminary issues found|Standard update required' "$output"
  ! grep -Eq 'Uncaught|ReferenceError|TypeError:' "$output.stderr"
}

run_viewport 1440,1000 "$temporary/desktop.html"
run_viewport 390,844 "$temporary/mobile.html"

manifest="$frontend/asset-manifest.json"
app=$(sed -n 's/.*"app.js":[[:space:]]*"\([^"]*\)".*/\1/p' "$manifest")
styles=$(sed -n 's/.*"styles.css":[[:space:]]*"\([^"]*\)".*/\1/p' "$manifest")
[ -n "$app" ] && [ -f "$frontend/$app" ]
[ -n "$styles" ] && [ -f "$frontend/$styles" ]
grep -q 'Loading public NNS evidence' "$frontend/$app"
grep -q 'Verify on-chain' "$frontend/$app"

echo "browser smoke passed in desktop and narrow mobile Chromium viewports"
echo "ordinary route loading rendered preliminary evidence without invoking Verify on-chain"
