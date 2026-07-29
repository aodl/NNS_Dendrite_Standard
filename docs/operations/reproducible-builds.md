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

## Rules-first neuron-page upgrade candidate — 2026-07-28

Docker Engine 28.0.1, Buildx 0.21.1, and BuildKit 0.31.2 used the reviewed
`dendrite-canonical` `docker-container` builder. Two forced-clean `--no-cache`
`linux/amd64` exports had identical file sets, byte-identical files, and identical
deterministic `SHA256SUMS`. This rules-first release was subsequently installed by the
operator as the production upgrade recorded in
[production-record.md](production-record.md). It remains historical deployed-release
evidence and is not evidence that a later source-changing candidate was deployed.

- Raw Wasm SHA-256:
  `da0b1892880866e941b1c7461c0672ccc80d44a6b93fcb4727e63f26b4d36d0e`
- `SHA256SUMS` file SHA-256:
  `249064631886d6244e35a467792339dc18e5158632b0e769d443bbddde0a8559`
- Frontend tree SHA-256:
  `a1901e741fb423e3ae52d14e6a122b6124ffcf3f7592d48cb0e05dfa4050f1e1`
- `asset-manifest.json` SHA-256:
  `eeb605c876ba3aa74348f2dff3b1b210015f4d001b2d322383924c1f537bfb8b`
- `build-configuration.txt` SHA-256:
  `ff7d399c7f3ff4baaa79904bc76e5edcd7d1c502c0eab4e5b684da444f79121d`
- SBOM manifest SHA-256:
  `be5ba61c762bd244ff88acf635a2408c643f8bf1abb79b7131df0e646b2ae52a`
- Executed Chromium evidence SHA-256:
  `e636a58c615e7f818fc378aa531bd435c1eb24c71b1ef451b073bde0fd83c770`

The exact canonical frontend export passed the qualification mechanism used at that
time at 1440×1000, a 720×500 viewport with 2× device scale (a high-density reflow
scenario, not proof of actual browser zoom), and 390×844. It verified
canonical rule ordering above managers and delegation, keyboard
rule expansion, attention filtering, preliminary controller uncertainty, route-stable
section navigation, every lower disclosure, and post-interaction overflow. The run
recorded six anonymous Governance query requests, zero Dendrite requests, zero
interaction-triggered requests, zero update endpoints, zero unexpected destinations,
and no console or page errors. The Verify action was present and not activated.

The guarded anonymous `upgrade` dry-run at commit
`fd79b3ced63619b8b4477cc2919a8aa8fb7d8e42` verified the candidate binding and every
release checksum, observed the installed module, tolerated the expected anonymous
controller-settings rejection, printed the exact intended upgrade command, and exited
with `dry-run complete; no write performed`. It made no lifecycle write.

## Trust-state-hardening upgrade candidate — 2026-07-27

Docker Engine 28.0.1, Buildx 0.21.1, and BuildKit 0.31.2 used the reviewed
`dendrite-canonical` `docker-container` builder. Two forced-clean `--no-cache`
`linux/amd64` exports had identical file sets, byte-identical files, and identical
deterministic `SHA256SUMS`. This candidate has not been installed or submitted to
mainnet.

This `e2b621…` candidate is preserved as historical evidence and is superseded by the
2026-07-28 rules-first candidate. It is not the current release candidate.

- Raw Wasm SHA-256:
  `e2b621207262360035803d45c3a6e144116219751c5391c517e51b625eb28a02`
- `SHA256SUMS` file SHA-256:
  `1b0c49a189f7ea06f98634a6d14659738671929ce8610d6eb6159203d13f5477`
- Frontend tree SHA-256:
  `1b878e17e09ae3d7cbda1c87e6198469c64d5a073ee6a8dbf3144cd431f20b90`
- `asset-manifest.json` SHA-256:
  `10236d6fd0ed398f1006ef5ca382e9a6f06329ad31ca0ebae00eeac49e23d528`
- `build-configuration.txt` SHA-256:
  `ff7d399c7f3ff4baaa79904bc76e5edcd7d1c502c0eab4e5b684da444f79121d`
- SBOM manifest SHA-256:
  `7c37d5db77dca574ba004121a23c89029c97641e2e35722be4112e934c69d374`

The exact canonical frontend export passed the executed Chrome 144.0.7559.96 gate in
the digest-pinned Puppeteer 24.36.0 image. Desktop and narrow-mobile routes produced
four anonymous Governance query requests, query-signature `read_state` traffic, zero
Dendrite requests, zero update endpoints, zero unexpected destinations, no console or
page errors, and no material horizontal overflow. The Verify action was present and
was not activated.

The guarded anonymous `upgrade` dry-run at commit
`1f96a7c6836aa8546f072b7439ea67456443ad57` verified every release checksum and the
candidate binding, read the installed module status, tolerated the expected
controller-only settings rejection, printed the exact intended upgrade command, and
exited successfully with `dry-run complete; no write performed`. It made no lifecycle
write.

## Historical browser-first upgrade candidate — 2026-07-26

Docker Engine 28.0.1 and Buildx 0.21.1 used the reviewed
`dendrite-canonical` `docker-container` builder. Two clean `--no-cache`
`linux/amd64` exports were byte-identical, including their deterministic
`SHA256SUMS`. This candidate has not been installed or otherwise submitted to
mainnet.

This `ff5104…` candidate is preserved as historical evidence and was superseded by the
2026-07-27 trust-state-hardening candidate after source changes. It is not the current
release candidate.

- Raw Wasm SHA-256:
  `ff5104dbd9006228118e1b67eae0242dad026b2e487b2f4ac7a97dc65f55a75b`
- `SHA256SUMS` file SHA-256:
  `6ae0db48fa3f89fbcc67102d0c39f46248161bba6a9634737b41a008afb457f9`
- Frontend tree SHA-256:
  `d3b8e340c08226d8b00d9c0a4d34b5121aa77669f58cededcaaf581b28ac3956`
- `asset-manifest.json` SHA-256:
  `e0a51525ad9f32c01b6464d82fb52a5bcfca5e8a1cf6aff10b0a056bfd2f06f0`
- `build-configuration.txt` SHA-256:
  `ff7d399c7f3ff4baaa79904bc76e5edcd7d1c502c0eab4e5b684da444f79121d`

The candidate embeds the browser-first anonymous Governance query path, explicit
consensus-verification action, first-verification unavailable/stale distinction,
bounded target-query diagnostics, severity-first compliance presentation, and
certified asset manifest. Rust-to-JavaScript differential fixtures, interface drift,
all PocketIC scenarios, workspace coverage, frontend coverage, security scans, SBOM
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
