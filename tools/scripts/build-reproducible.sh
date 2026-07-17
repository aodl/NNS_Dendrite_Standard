#!/bin/sh
set -eu
export SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-0}
npm ci --ignore-scripts
npm run build
cargo build --locked --release --target wasm32-unknown-unknown -p dendrite
mkdir -p dist
cp target/wasm32-unknown-unknown/release/dendrite.wasm dist/dendrite.wasm
cp canisters/dendrite/public/asset-manifest.json dist/asset-manifest.json
find canisters/dendrite/public -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > dist/frontend.sha256
sha256sum dist/dendrite.wasm dist/frontend.sha256 dist/asset-manifest.json > dist/artifacts.sha256
