# Dendrite

Dendrite is a single-canister, anonymous verifier for the NNS Dendrite Standard. Every check is a live consensus-backed update call. The canister reads bounded public evidence from NNS Governance and the IC management canister, evaluates deterministic rules, returns the complete report directly, stores no application data, and serves its certified vanilla-JavaScript frontend from the same Rust Wasm.

The anonymous-verifier tranche is complete. The product as a whole is not yet complete
against the original brief: Internet Identity and authenticated governance functionality
remain the next product tranche.

The fixed identities are alpha-vote `2947465672511369` and omega-reject `18422777432977120264`. Omega-reject is not omega-vote. A compliant target has no hotkeys and has `not_for_profit = false`.

The anonymous neuron page validates an exact decimal `u64`, calls `check_neuron`, renders the live report safely, and can perform another live check. There is no cache, stale-result state, dynamic compliance certification, timer, or persistent operational state.
`checked_at_timestamp_seconds` is the NNS Governance evidence snapshot time returned
with the target neuron. Dendrite's local canister clock is used only by the heap-only
abuse guard.

## Local verification

Use Rust `1.94.1`, Node `24.15.0`, npm `11.12.1`, dfx `0.27.0`, and `DFX_IDENTITY=codex_local`.

```sh
npm ci
cargo xtask check
cargo xtask test
cargo xtask coverage
DENDRITE_CANISTER_ID=<reviewed-dendrite-canister-id> cargo xtask build
cargo xtask security-scan
cargo xtask sbom
DENDRITE_CANISTER_ID=<reviewed-dendrite-canister-id> cargo xtask verify-reproducible
```

See [architecture](docs/architecture/overview.md), [testing](docs/development/testing.md), [reproducible builds](docs/development/reproducible-builds.md), [threat model](docs/security/threat-model.md), and the [operator checklist](docs/operations/dendrite-neuron-setup-checklist.md).

## Scope

This tranche intentionally excludes Internet Identity, authenticated manager recognition, hotkey onboarding, proposal construction/simulation/submission, voting, reward assistance, and open-proposal views. Future privileged functionality must be signed in the browser and sent directly to NNS Governance; Dendrite never receives a user delegation. There is no proposal-history API, page, indexer, timer, cursor, high-water mark, or durable proposal storage.
