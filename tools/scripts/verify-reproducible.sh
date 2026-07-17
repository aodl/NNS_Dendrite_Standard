#!/bin/sh
set -eu
tools/scripts/build-reproducible.sh
mkdir -p target/repro-a
cp dist/dendrite.wasm dist/frontend.sha256 target/repro-a/
cargo clean
tools/scripts/build-reproducible.sh
cmp target/repro-a/dendrite.wasm dist/dendrite.wasm
cmp target/repro-a/frontend.sha256 dist/frontend.sha256
echo 'two local clean builds are byte-identical'

