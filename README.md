# Dendrite

Dendrite is a single-canister, anonymous verifier for the NNS Dendrite Standard. It reads bounded public evidence from NNS Governance and the IC management canister, evaluates deterministic rules, stores at most 256 latest snapshots, and serves its certified vanilla-JavaScript frontend from the same Rust Wasm.

The fixed identities are alpha-vote `2947465672511369` and omega-reject `18422777432977120264`. Omega-reject is not omega-vote. A compliant target has no hotkeys and has `not_for_profit = false`.

## Local verification

Use Rust `1.94.1`, Node `24.15.0`, npm `11.12.1`, dfx `0.27.0`, and `DFX_IDENTITY=codex_local`.

```sh
npm ci
cargo xtask check
cargo xtask test
cargo xtask build
cargo xtask security-scan
cargo xtask sbom
cargo xtask verify-reproducible
```

See [architecture](docs/architecture/overview.md), [testing](docs/development/testing.md), [reproducible builds](docs/development/reproducible-builds.md), [threat model](docs/security/threat-model.md), and the [operator checklist](docs/operations/dendrite-neuron-setup-checklist.md).

## Scope

The anonymous verifier is under active completion. Internet Identity, authenticated manager recognition, hotkey onboarding, and Neuron Management proposal submission are not implemented. Dendrite intentionally has no proposal-history API, page, indexer, timer, cursor, high-water mark, or durable proposal storage.
