#!/bin/sh
set -eu
mkdir -p dist/sbom
cargo cyclonedx --format json --all --manifest-path Cargo.toml
cp bom.json dist/sbom/rust.cdx.json
npx --yes @cyclonedx/cyclonedx-npm@4.0.3 --omit dev --output-file dist/sbom/npm.cdx.json

