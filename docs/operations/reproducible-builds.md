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

## Browser-first upgrade candidate — 2026-07-26

Docker Engine 28.0.1 and Buildx 0.21.1 used the reviewed
`dendrite-canonical` `docker-container` builder. Two clean `--no-cache`
`linux/amd64` exports were byte-identical, including their deterministic
`SHA256SUMS`. This candidate has not been installed or otherwise submitted to
mainnet.

- Raw Wasm SHA-256:
  `c77b44945b47497a73510ec28e980fa12b006ac50722e8607be108d5d7c90402`
- `SHA256SUMS` file SHA-256:
  `4c24542af7b89760dfbc183156ede8187e4217119fbf8815f95cc0aa4cb0004b`
- Frontend tree SHA-256:
  `0507dd3edf8d4c7d48858c0fa65e2f81c8c00b2313ce8e5fb1fb72cec1cff93c`
- `asset-manifest.json` SHA-256:
  `df073e3a12c373aa0d3a6d9fc7fa2e8cf7ddea87c32e37c5f98dbe170469ab56`
- `build-configuration.txt` SHA-256:
  `ff7d399c7f3ff4baaa79904bc76e5edcd7d1c502c0eab4e5b684da444f79121d`

The candidate embeds the browser-first anonymous Governance query path, explicit
consensus-verification action, severity-first compliance presentation, and certified
asset manifest. Rust-to-JavaScript differential fixtures, interface drift, all
PocketIC scenarios, workspace coverage, frontend coverage, security scans, SBOM
generation, and local clean-build equality passed before the canonical comparison.

## Canonical Docker evidence — 2026-07-25

Docker Engine 28.0.1 and Buildx 0.21.1 used the reviewed
`dendrite-canonical` `docker-container` builder. The Buildx local exporter smoke test
passed. Two clean `--no-cache` local exports completed with identical file sets,
byte-identical files, and identical deterministic manifests. No alternate engine or
prior failed-export artifact contributed to this evidence.

- Raw Wasm SHA-256:
  `1291a51cc26bcdd1ea387f6509aeef3f9c39e19f04f58495576f842873aa371a`
- `SHA256SUMS` file SHA-256:
  `090f2cba0cfa230323506d8051bda7b18866da3a0f4f787264dfb0e56d28ad7b`
- Frontend tree SHA-256:
  `1d61cb33d96e4628570f6ad7d613dc48ac2f0644bb6dfce23d1e16db8f59e2f9`
- `asset-manifest.json` SHA-256:
  `1791938f3a445cbaf3d5c21afe6ff5a1313d309e5e652ca8a4102f60660c82eb`
- `build-configuration.txt` SHA-256:
  `ff7d399c7f3ff4baaa79904bc76e5edcd7d1c502c0eab4e5b684da444f79121d`

The earlier
`f8f856c83f1dde99f3cdb1796d0af9e3fd448e929ba3392d2a7cdde472fd9d64`
artifact was superseded before deployment because the final frontend documentation
links were corrected. It was not deployed.

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
