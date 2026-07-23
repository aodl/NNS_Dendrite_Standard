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

The anonymous verifier remains complete. Browser mutations go directly to fixed NNS
Governance; no authenticated identity reaches Dendrite. Mainnet mutation is not part of
this deployment procedure.

## Manual local Internet Identity popup smoke test

With local Internet Identity running, prefer the standard provider alias
`http://id.ai.localhost:8000/authorize` (a canister-style `.localhost` alias is also
accepted). Set `DENDRITE_DERIVATION_ORIGIN` to the explicitly labelled local test origin
and deploy with `DFX_IDENTITY=codex_local`. In an interactive browser, verify that the
popup opens and completes; the exact principal appears; reload restores the same
principal; an approved alternative origin produces that same principal; an unapproved
origin cannot sign in; sign-out clears the session; a neuron report recomputes manager
authority; and anonymous checks still work after sign-out. Record the exact origins,
certified `/.well-known/ii-alternative-origins`, provider, and result. Do not describe
this procedure as automated popup E2E.

This is an outstanding operator release gate until it is run against the finalized
canonical origin (or an explicitly labelled local test origin). No manager should add a
Dendrite principal as a hotkey before the gate passes on the final canonical origin.

## Manual controlled transaction smoke test

Using a controlled test neuron or local fixed-principal fixture, verify manager
recognition, review with no pre-confirmation mutation, fee display, proposal ID return,
a manager Yes vote, and a fresh post-operation report. This is an outstanding operator
gate unless its environment and result are recorded; it authorizes no mainnet mutation.
Also verify that open management-proposal enumeration retains Governance caller
visibility, the selected manager has a visible Unspecified ballot, final-preflight drift
discards the review, and an intentionally ambiguous transport result cannot submit the
same review twice.
The smoke test must also confirm that an in-flight call survives report and route
rerenders, sign-out is rejected until it settles, direct-operation confirmation names
the manager neuron actually mutated, and Spawn rejects an omitted or non-user
controller. Navigate to another neuron and to landing while a controlled update is
deferred and confirm settlement never restores the old route. For an intentionally
ambiguous result, confirm the digest/neuron warning survives route, report, and
sign-out/sign-in rerenders; investigate it; then confirm explicit acknowledgment makes
no call and only a wholly new review can proceed. A browser reload loses this heap-only
marker, so investigate uncertainty before reconstructing any request. These remain
operator checks and are not run by the automated release pass.
Also hold sign-in open while starting a neuron check and confirm completion leaves the
loading route owned until its report renders with authenticated controls. Hold sign-out
open after creating a review and confirm detached submit/review controls make no NNS
call, duplicate authentication transitions are rejected, and failed sign-out retains
the session/actor while requiring a new review.
