# Dendrite

## Overview

Dendrite is one stateless Rust canister that serves a certified frontend and performs
anonymous, live NNS Dendrite Standard verification. Its public application methods are
only update `check_neuron` and query `http_request`.

| Item | Production value |
| --- | --- |
| Canister name | `dendrite` |
| Reserved canister ID | `hp4av-oiaaa-aaaar-qcaha-cai` |
| Canonical URL | `https://hp4av-oiaaa-aaaar-qcaha-cai.icp0.io` |

The ID is reserved, but the production Wasm has not been installed. Only a completed
[production record](docs/operations/production-record.md) may supersede that statement.

## Trust model

Dendrite stores no application state, cache, report, transaction history, or proposal
history. Internet Identity sessions and Governance-only delegations remain in the
browser and are never sent to Dendrite. Privileged mutations go directly from the
browser to fixed NNS Governance. See the [threat model](docs/security/threat-model.md).

## Production deployment

`icp-cli` is the sole production lifecycle CLI. Release source verification, guarded
deployment, final-origin identity testing, and controlled transaction testing are
separate phases. The latter two are independently signable
[operator gates](docs/operations/operator-gates.md). `dfx` remains local-test tooling
only; `codex_local` must never be used as the production identity.

## Source verification

The canonical public artifact comes from the digest-pinned Docker build. Its raw Wasm
SHA-256 is bound in `icp.yaml`, checked against `dist/release/SHA256SUMS`, and compared
with the installed module hash after deployment. See
[reproducible builds](docs/operations/reproducible-builds.md).

## Common commands

```sh
npm ci
cargo xtask check
cargo xtask test
cargo xtask coverage
cargo xtask security-scan
cargo xtask sbom

export DENDRITE_CANISTER_ID=hp4av-oiaaa-aaaar-qcaha-cai
export DENDRITE_DERIVATION_ORIGIN=https://hp4av-oiaaa-aaaar-qcaha-cai.icp0.io
export DENDRITE_ALTERNATIVE_ORIGINS_JSON='{"alternativeOrigins":[]}'
export DENDRITE_API_HOST=https://icp-api.io
export DENDRITE_IDENTITY_PROVIDER=https://id.ai/authorize
export DENDRITE_FETCH_ROOT_KEY=false
export SOURCE_DATE_EPOCH=0
tools/scripts/docker-build-release.sh
```

## Repository layout

`canisters/dendrite/` contains the canister and frontend, `crates/` the pure rules and
fixed evidence client, `candid/` reviewed interface subsets, `tools/` release and test
tooling, and `docs/` architecture, development, operations, security, and the standard.

## Documentation

Start with the [architecture overview](docs/architecture/overview.md),
[testing matrix](docs/development/testing.md), [deployment procedure](docs/operations/deployment.md),
[release checklist](docs/operations/release-checklist.md), and
[source-to-Wasm verification](docs/operations/source-to-wasm-verification.md).
