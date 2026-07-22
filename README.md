# Dendrite

Dendrite is a single-canister, anonymous verifier for the NNS Dendrite Standard. Every check is a live consensus-backed update call. The canister reads bounded public evidence from NNS Governance and the IC management canister, evaluates deterministic rules, returns the complete report directly, stores no application data, and serves its certified vanilla-JavaScript frontend from the same Rust Wasm.

The anonymous verifier remains complete. Internet Identity delegations are restricted
exactly to NNS Governance and stay in the browser. One fixed Governance actor performs
live replicated reads and explicitly confirmed mutations through one immutable review
pipeline; the Dendrite actor remains anonymous. The pinned NNS cannot simulate these
proposal commands, so Dendrite performs fresh local preflight and exact review and
leaves final validation to Governance. No proposal or transaction history is stored.
Open management proposals retain Governance's caller-sensitive visibility filtering.
Voting uses replicated NNS Open status rather than the browser clock, and every mutation
revalidates fresh evidence plus the exact reviewed Candid bytes immediately before its
single, non-retried submission.

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
alternative origin must be operator-controlled. A manager proposer automatically votes
Yes, every distinct target manager has one vote, and the live management proposal fee
is charged and not refunded. Open proposals are fetched live and never retained.
Reward calculation/distribution and proposal history remain out of scope. Dendrite
never receives a user delegation.
