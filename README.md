# Dendrite

Dendrite is a single-canister, anonymous verifier for the NNS Dendrite Standard. Every check is a live consensus-backed update call. The canister reads bounded public evidence from NNS Governance and the IC management canister, evaluates deterministic rules, returns the complete report directly, stores no application data, and serves its certified vanilla-JavaScript frontend from the same Rust Wasm.

The anonymous verifier remains complete. The browser-only identity and read-only
manager-recognition tranche adds Internet Identity login without authenticating to
Dendrite: the delegation and exact principal remain in the browser, and authority is
compared locally against each current live manager record. No NNS mutation exists. The
product as a whole is not complete against the original brief; the next tranche is one
audited direct browser-to-NNS transaction pipeline.

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
DENDRITE_CANISTER_ID=<reviewed-dendrite-canister-id> \
DENDRITE_DERIVATION_ORIGIN=<final-reviewed-https-origin> cargo xtask build
cargo xtask security-scan
cargo xtask sbom
DENDRITE_CANISTER_ID=<reviewed-dendrite-canister-id> \
DENDRITE_DERIVATION_ORIGIN=<final-reviewed-https-origin> cargo xtask verify-reproducible
```

See [architecture](docs/architecture/overview.md), [testing](docs/development/testing.md), [reproducible builds](docs/development/reproducible-builds.md), [threat model](docs/security/threat-model.md), and the [operator checklist](docs/operations/dendrite-neuron-setup-checklist.md).

## Scope

The canonical derivation origin is security-critical: changing it changes every user's
Dendrite principal, so it must be finalized before external hotkey onboarding. Every
alternative origin must be operator-controlled. Onboarding is instruction-only and can
be confirmed only by another live report. Proposal operations, voting, following
changes, rewards, authenticated NNS actors, and every NNS mutation remain deferred.
Dendrite never receives a user delegation.
