# Reproducible builds

## What is verified

Release verification connects one reviewed commit and lockfiles to the raw Wasm,
embedded frontend bytes, build configuration, checked-in interfaces, and SBOMs. It
does not authorize deployment.

## Release inputs

The canonical `linux/amd64` build uses `SOURCE_DATE_EPOCH=0` and the exact immutable
production inputs in [deployment](deployment.md). Root-key fetching is disabled.

## Canonical Docker build

The digest-pinned `Dockerfile.repro`, pinned lockfiles, and `linux/amd64` platform
produce only `dendrite.wasm`, `frontend/`, `asset-manifest.json`,
`build-configuration.txt`, and deterministic `SHA256SUMS`. The latter excludes itself.

## Local determinism check

An ordinary configured `cargo xtask build` writes toolchain-local outputs.
`cargo xtask build-reproducible` packages a local configured build.
`cargo xtask verify-reproducible` compares two clean builds on the same host. These are
useful diagnostics, not the canonical public container artifact.

The canonical comparison performs two clean no-cache Docker builds into separate temporary directories and
fails on any missing, extra, or different file or manifest.

## Canonical Docker evidence — 2026-07-24

Docker Engine 28.0.1 and Buildx 0.21.1 used the reviewed
`dendrite-canonical` `docker-container` builder. The Buildx local exporter smoke test
passed. Two clean `--no-cache` local exports completed with identical file sets,
byte-identical files, and identical deterministic manifests. No alternate engine or
prior failed-export artifact contributed to this evidence.

- Raw Wasm SHA-256:
  `f8f856c83f1dde99f3cdb1796d0af9e3fd448e929ba3392d2a7cdde472fd9d64`
- `SHA256SUMS` file SHA-256:
  `5c5b00d0c02abad5c04fb1f205d28baa0777c15e62ad220804f9473b8e767788`

The release manifest excludes itself, uses relative byte-sorted paths, and verifies
from inside the release directory. `icp.yaml` binds the prebuilt recipe directly to the
raw canonical Wasm and configures no implicit production rebuild.

Clean-checkout hermeticity passed with `dist/` absent: `npm ci`, all 112 frontend tests,
and frontend coverage completed before the unchanged canonical release was restored
and reverified. The automated anonymous mainnet dry-run also passed: it verified the
mapping, empty module hash, release checksums, raw Wasm hash, and prebuilt manifest;
tolerated the expected controller-only settings rejection; printed the intended fresh
install command; and performed no write.

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
Final-origin identity and controlled transaction tests remain the two unrun
[operator gates](operator-gates.md).
