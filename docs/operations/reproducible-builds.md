# Reproducible builds

## What is verified

Release verification connects one reviewed commit and lockfiles to the raw Wasm,
embedded frontend bytes, build configuration, checked-in interfaces, and SBOMs. It
does not authorize deployment.

## Release inputs

The canonical `linux/amd64` build uses `SOURCE_DATE_EPOCH=0`, canister ID
`hp4av-oiaaa-aaaar-qcaha-cai`, derivation origin
`https://hp4av-oiaaa-aaaar-qcaha-cai.icp0.io`, exact alternative-origin document
`{"alternativeOrigins":[]}`, API host `https://icp-api.io`, root-key fetching `false`,
and identity provider `https://id.ai/authorize`.

## Canonical Docker build

Export those values as shown in the [README](../../README.md), then run:

```sh
tools/scripts/docker-build-release.sh
(cd dist/release && sha256sum -c SHA256SUMS)
```

The digest-pinned `Dockerfile.repro`, pinned lockfiles, and `linux/amd64` platform
produce only `dendrite.wasm`, `frontend/`, `asset-manifest.json`,
`build-configuration.txt`, and deterministic `SHA256SUMS`. The latter excludes itself.

## Local determinism check

An ordinary configured `cargo xtask build` writes toolchain-local outputs.
`cargo xtask build-reproducible` packages a local configured build.
`cargo xtask verify-reproducible` compares two clean builds on the same host. These are
useful diagnostics, not the canonical public container artifact.

## Two-build verification

```sh
tools/scripts/verify-docker-reproducible.sh
```

This performs two clean no-cache Docker builds into separate temporary directories and
fails on any missing, extra, or different file or manifest.

## Mainnet module-hash comparison

After installation, compare `sha256sum dist/release/dendrite.wasm` with the module hash
from `icp canister status dendrite -e ic`. The management interface defines
`module_hash` as SHA-256 of the installed module and accepts raw or gzip install input;
the IC decompresses gzip before installation. Dendrite installs the raw file, so the
live hash must equal its raw bytes directly. Do not compare a gzip container hash.

## Frontend asset verification

Record the `asset-manifest.json` hash and a deterministic frontend tree hash; require
every generated hashed asset to exist. Verify the exact alternative-origin bytes,
certified response headers, build configuration, transaction Candid, generated
declaration, command policy, and response policy hashes.

## Runtime configuration verification

Confirm the served bundle embeds the production canister ID, API host, origin,
alternative origins, identity provider, and disabled root-key policy. Hash equality
alone does not prove controller policy, cycles, canonical DNS/origin behavior, popup
behavior, or either transaction operator gate.

## Limitations

Reproducibility depends on the pinned public registries and digest availability.
Module-hash equality proves installed code bytes, not who may later replace them.
