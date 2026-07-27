# Security

## Threat boundaries

Starting a consensus verification immediately stales any older authoritative report.
Pending or failed verification cannot retain transaction controls or a
`Consensus verified` label; only a newly successful Dendrite update restores that
trust state. Browser-only controller rules remain indeterminate and are separated from
the public-posture headline without being inferred as passing.
Explicit operation ownership also prevents an old success, old failure, or old
`finally` block from mutating a replacement route or clearing its loading state.

Dependency query failures retain their bounded typed failure kind, message, and exact
requested IDs. Invalid batches are rejected atomically, failed promise-cache entries
remain retryable, and no analysis cache is persisted.

All neuron fields, strings, URLs, principals, errors, routes, IDs, and upstream
collections are untrusted. Typed clients enforce bounds and reject unexpected or
duplicate records before map construction. Successful omission is factual evidence;
rejection, decode failure, or structurally invalid evidence remains unavailable.
Unknown protocol semantics require a standard update.

The frontend creates text-safe DOM nodes, validates HTTPS links, never uses dynamic
`innerHTML`, and keeps NNS IDs as decimal strings or `bigint`. Production uses a
validated build-time canister principal, a fixed API origin, no root-key fetching,
strict CSP, and no third-party runtime content.

Preliminary analysis adds a separate anonymous query boundary. Its generated actor
exposes only `list_neurons`, fixes Governance as the destination, explicitly requests
only public full neurons for bounded IDs, and verifies query signatures. Every response
batch is rejected atomically for unexpected/duplicate IDs, invalid paging, duplicate
topic keys, collection or string bound violations, invalid topic variants, contradictory
stake arithmetic, or inconsistent target timestamps. The in-memory promise cache is
route-scoped, never uses browser storage, and evicts failed entries. Because browsers
cannot call management-canister `canister_info`, preliminary controller rules are
always indeterminate and blackholing is never claimed.

Internet Identity introduces a browser-only boundary. Delegations target only fixed NNS
Governance and are never logged, rendered, serialized to Dendrite, or sent to the
canister. Every mutation requires fresh authority evidence, an immutable exact review,
explicit confirmation, strict response validation, and no automatic retry. Ambiguous
outcomes block another mutation until acknowledged; this coordination and the single
current receipt are bounded, heap-only, and lost on reload.
Crossing the NNS update boundary with no conclusive response immediately marks the
context's prior authoritative report stale and removes mutation controls. Preliminary
evidence stays visible. A later successful `check_neuron` may establish newly observed
current evidence, but it does not clear the unresolved-outcome lock; acknowledgement
clears only that lock and never fabricates a verification. Known Governance rejection
and final-preflight failure remain non-ambiguous and do not take this path.

Only a current consensus report enables privileged controls. The transaction pipeline
does not trust that report as final authority: immediately before mutation it still
performs its own Dendrite `check_neuron` update and revalidates the reviewed request.
`LowCycles`, rate limiting, concurrency, duplicate-in-flight, transport, or decode
failure affects only consensus state; preliminary evidence remains visible and no NNS
mutation is sent after a failed final preflight. Successful mutation invalidates both
reports and is explicitly presented as not yet consensus verified.

Controller blackholing is proven only by successful `canister_info`, no Wasm, and no
controllers. A failed lookup is indeterminate. Dendrite's own controller can replace
both verifier code and the transaction-signing frontend and therefore remains an
explicit operator trust boundary. Other boundaries are the certified frontend, browser
runtime, Internet Identity, NNS Governance, management-canister reads, target and
manager neurons, build environment, release artifacts, and production lifecycle
identity.

Cycle exhaustion is bounded by a fixed 2T liquid-cycle reserve, at most two concurrent
checks, one in-flight check per neuron, and 20 admitted starts per 60 seconds. Guard
entries are heap-only, prune after 300 seconds, expose no counters, and reset on
upgrade.

Receiver checks request only explicit deduplicated IDs and distinguish readable,
not-returned-to-caller, and unavailable evidence. Final transaction preflight
fingerprints security-relevant authority and configuration while allowing ordinary
stake, time, and voting-power progression. A changed refresh timestamp or receiver
controller/hotkey set invalidates the review.

## Dependency exceptions

| Package/version | Reachability | Exception and removal condition |
| --- | --- | --- |
| `paste 1.0.15` | Transitive Candid compile-time macro | RUSTSEC-2024-0436 abandonment; review on Candid update or 2026-10-17 |
| `pocket-ic 15.0.0` | Workspace development only | Required local consensus scenarios; remove on compatible replacement |
| `backoff 0.4.0` | PocketIC development tree only | Remove when PocketIC removes it or if production reachability changes |
| `instant 0.1.13` | PocketIC development tree only | Remove when PocketIC removes it or if production reachability changes |
| `serde_cbor 0.11.2` | Official certification libraries and PocketIC | Not directly used by application code; review when certification reachability changes |

Automated dependency reachability fails if `pocket-ic`, `backoff`, or `instant` enters
the production Wasm normal/build tree. Lockfiles, advisory scans, reproducible
comparison, and SBOMs are compensating controls. The existing Apache-2.0 LLVM
toolchain expression remains the narrow license-policy exception.
