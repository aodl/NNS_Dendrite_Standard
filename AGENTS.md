# Dendrite repository instructions

## Mission

Build Dendrite: a minimal, security-focused, single-production-canister Internet Computer application that verifies the NNS Dendrite Standard and helps authorised manager-neuron operators construct and submit NNS Neuron Management proposals.

Read `DENDRITE_BUILD_SPEC.md` completely before changing files. Treat it as the product and engineering contract. Do not quietly weaken a MUST requirement. Record unavoidable deviations in an ADR and surface them in the final report.

## Working method

- Start by initialising Git and creating a short implementation plan in `docs/development/implementation-plan.md`.
- Work through the plan autonomously. Do not stop after scaffolding or leave core features as TODOs.
- Make small, reviewable commits at useful checkpoints.
- Run the relevant checks after every meaningful change and the full verification suite before finishing.
- Prefer the smallest design that satisfies the specification. Avoid frameworks, abstraction layers, code generation systems, and production dependencies that do not earn their complexity.
- Never vendor private keys, Internet Identity delegations, access tokens, generated identities, or mainnet credentials.
- Do not modify the protocol constants below without a clearly documented standards update.

## Fixed protocol constants

- `ALPHA_VOTE_NEURON_ID = 2_947_465_672_511_369u64`
- `OMEGA_REJECT_NEURON_ID = 18_422_777_432_977_120_264u64`
- The omega neuron is **omega-reject**, not omega-vote.
- In JavaScript, encode neuron and proposal IDs as decimal strings or `bigint`; never use `number` for NNS IDs.
- The target Dendrite neuron MUST have `hot_keys = []`.
- The target Dendrite neuron MUST have `not_for_profit = false`.
- Proposal-history indexing and durable proposal-history storage are out of scope. Do not add them.

## Architecture constraints

- Exactly one production canister named `dendrite`.
- Rust canister embeds and serves certified frontend assets.
- Frontend should be small vanilla JavaScript modules bundled with a pinned esbuild version unless a documented technical blocker requires otherwise.
- Privileged NNS mutations are signed in the browser with the user's Internet Identity delegation and sent directly to NNS Governance. The Dendrite canister must never hold, relay, persist, or reconstruct a user delegation.
- Canister outbound calls are fixed to NNS Governance and the IC management canister. Never accept arbitrary destination canister IDs, method names, or forwarded Candid blobs.
- No off-chain database, hosted backend, analytics service, remote font, or third-party runtime dependency.
- No unbounded stable data. Cache only a bounded number of latest compliance snapshots with deterministic eviction; do not use timers or build an indexer.

## Security rules

- Treat every on-chain string, URL, error, name, and description as untrusted input. Render with text-safe DOM helpers; never use `innerHTML` with dynamic content.
- Validate every decimal ID canonically and reject signs, whitespace, overflow, fractional forms, exponent notation, and leading ambiguity.
- Fail closed on missing fields, rejected calls, unknown topic/command variants, Candid drift, stale mandatory evidence, or incomplete dependency reads.
- Before every state-changing NNS call, show the exact decoded action, simulate the exact outer `manage_neuron` request, and require explicit confirmation.
- High-risk actions need stronger warnings. A compliant Dendrite neuron cannot submit `Disburse` or `DisburseToNeuron` through Neuron Management while `not_for_profit` is false; simulation remains authoritative.
- A manager is authorised only after exact comparison of the authenticated Dendrite principal against that manager neuron's `controller` or `hot_keys`. Do not infer authority from public visibility or from `get_neuron_ids` alone.
- Adding a hotkey is controller-only under current NNS rules. Do not claim that an existing hotkey can add the Dendrite principal.

## Engineering style

Follow the Jupiter Faucet archetype:

- pinned Rust toolchain and checked-in lockfiles;
- narrow checked-in Candid subsets plus drift checks against upstream interfaces;
- pure transformation/validation modules with explicit types and stable rule IDs;
- `cargo fmt`, strict Clippy, unit tests, PocketIC integration tests, browser unit tests, and XSS regressions;
- reproducible container build with digest-pinned base image and deterministic artifact verification;
- `cargo audit`, `cargo deny`, OSV scanning, CycloneDX SBOM, documented exceptions, and production-dependency reachability review;
- detailed architecture, threat model, deployment, upgrade, recovery, source-verification, and operator documentation.

## Required top-level commands

Provide stable commands, preferably through `cargo xtask` and package scripts, for:

- `cargo xtask check`
- `cargo xtask test`
- `cargo xtask build`
- `cargo xtask build-reproducible`
- `cargo xtask verify-reproducible`
- `cargo xtask security-scan`
- `cargo xtask sbom`
- `npm test`

They must work from the repository root and be documented.

## Completion bar

Do not report completion until:

- all mandatory product flows in `DENDRITE_BUILD_SPEC.md` work;
- all tests and static checks pass;
- the production Wasm and frontend build successfully from a clean checkout;
- two reproducible builds produce byte-identical Wasm and frontend artifacts;
- no proposal-history tables, APIs, indexers, timers, or durable history remain;
- no unsafe JavaScript numeric conversion of the omega-reject ID exists;
- the final report lists commands run, test results, artifact hashes, known limitations, and any deferred work.
