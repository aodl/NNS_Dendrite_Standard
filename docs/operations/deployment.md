# Deployment

Use `DFX_IDENTITY=codex_local` for local replicas. Build and verify before installation:

```sh
npm ci
cargo xtask check
cargo xtask test
DENDRITE_CANISTER_ID=<reviewed-dendrite-canister-id> \
DENDRITE_DERIVATION_ORIGIN=<final-reviewed-https-origin> cargo xtask build
DENDRITE_CANISTER_ID=<reviewed-dendrite-canister-id> \
DENDRITE_DERIVATION_ORIGIN=<final-reviewed-https-origin> cargo xtask verify-reproducible
DFX_IDENTITY=codex_local dfx start --clean --background
tools/scripts/deploy-local.sh
```

The local wrapper deterministically creates the canister, obtains its ID, builds the
frontend for that exact ID and `http://127.0.0.1:4943` with explicit local root-key
fetching, builds the Wasm, and installs it. `CANISTER_ID_DENDRITE`, when supplied by
`dfx`, is accepted as the equivalent canister-ID input. Custom hostnames never affect
the configured principal.

Local functional verification and production reproducibility are separate. The local
flow uses its actual local canister ID, a supported local replica origin, and root-key
fetching. A production reproducibility fixture uses an explicit fixture canister ID,
fixed `https://icp-api.io`, and root-key fetching disabled to demonstrate deterministic
bytes only. It is not a deployable release. A production artifact may be labelled
deployable only after the operator creates and explicitly authorizes an actual mainnet
Dendrite canister ID.

Mainnet deployment is intentionally not scripted here and must not be performed without
explicit authorization. Before production deployment, review the compile-time canister
ID, fixed cycle reserve, canonical derivation origin, normalized operator-controlled
alternative origins, and CSP gateway origins. Changing the canonical origin changes
users' Dendrite principals; finalize it before any external hotkey onboarding. There is
no mutable deployment configuration or stable application state to migrate.

The anonymous verifier remains complete. Browser identity and manager recognition are
read-only; no NNS mutation exists, and the product is not complete against the original
brief.

## Manual local Internet Identity popup smoke test

With a local Internet Identity authorization service running on an explicit localhost
or loopback origin, set `DENDRITE_DERIVATION_ORIGIN` to the final test application
origin and `DENDRITE_IDENTITY_PROVIDER` to that service's `/authorize` URL, then deploy
with `DFX_IDENTITY=codex_local`. In an interactive browser, open the landing page, sign
in through the popup, confirm the exact principal and canonical origin are visible,
navigate to a neuron report, confirm authority is derived only from its current manager
rows, sign out, and confirm anonymous checks still work. Record the origins and result;
do not describe this manual procedure as automated popup E2E.
