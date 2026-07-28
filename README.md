# Dendrite

## Overview

Dendrite is one stateless Rust canister that serves a certified frontend and performs
anonymous, live NNS Dendrite Standard verification. Ordinary browsing first evaluates
strictly validated public Governance evidence in browser memory; an explicit
`Verify on-chain` action obtains the authoritative consensus report. Its public
application methods remain only update `check_neuron` and query `http_request`.

The neuron page is rules-first: after its compact identity and trust-state summary it
shows every Standard rule in canonical order with visible text and a decorative status
symbol. Filters and disclosures are memory-only. Characteristics, managers, topic
delegation, and complete technical evidence follow as expandable sections; preliminary
controller uncertainty is labelled `Requires verification`, never inferred as pass or
failure.

Production identifiers and configuration have one authoritative source in
[deployment](docs/operations/deployment.md). Factual lifecycle evidence is retained in
the [production record](docs/operations/production-record.md).

## Trust model

Dendrite stores no application state, cache, report, transaction history, or proposal
history. The browser preliminary loader has only a route-scoped in-memory promise
cache. Its anonymous query agent has a fixed Governance destination, verifies query
signatures, and does not fetch the root key in production. Internet Identity sessions
and Governance-only delegations remain in the browser and are never sent to Dendrite.
Privileged mutations go directly from the browser to fixed NNS Governance and still
require a fresh authoritative Dendrite preflight. See [security](docs/security.md).
Preliminary and consensus work is owned by explicit route-generation operations:
navigation, refresh, replacement, and transaction settlement cannot publish stale
completions or strand a loading state.

## Production deployment

`icp-cli` is the sole production lifecycle CLI. Release source verification, guarded
deployment, final-origin identity testing, and controlled transaction testing are
separate phases. The latter two are independently signable
[operator gates](docs/operations/operator-gates.md). PocketIC is the automated local
canister environment; no repository-local dfx project configuration is used.

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
