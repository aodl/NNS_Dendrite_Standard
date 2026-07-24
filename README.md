# Dendrite

## Overview

Dendrite is one stateless Rust canister that serves a certified frontend and performs
anonymous, live NNS Dendrite Standard verification. Its public application methods are
only update `check_neuron` and query `http_request`.

The reserved production canister is empty. Production identifiers and configuration
have one authoritative source in [deployment](docs/operations/deployment.md); only a
completed [production record](docs/operations/production-record.md) may supersede the
empty-canister statement.

## Trust model

Dendrite stores no application state, cache, report, transaction history, or proposal
history. Internet Identity sessions and Governance-only delegations remain in the
browser and are never sent to Dendrite. Privileged mutations go directly from the
browser to fixed NNS Governance. See [security](docs/security.md).

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

## Repository layout

`canisters/dendrite/` contains the canister and frontend, `crates/` the pure rules and
fixed evidence client, `candid/` reviewed interface subsets, `tools/` release and test
tooling, and `docs/` architecture, development, operations, security, and the standard.

## Documentation

Start with [architecture](docs/architecture.md),
[testing matrix](docs/development/testing.md), [deployment procedure](docs/operations/deployment.md),
[reproducible-build evidence](docs/operations/reproducible-builds.md),
[operator gates](docs/operations/operator-gates.md), and [security](docs/security.md).
