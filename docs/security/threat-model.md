# Threat model

Every upstream neuron field, name, description, URL, principal, error, topic vector,
route, and neuron ID is untrusted. Typed clients bound messages and reject unexpected or
duplicate records and topic keys before map construction. Unknown semantic variants
require a standard update. Successful omission is factual evidence; transport/decode
failure is never rewritten as a factual failure. Structural invalidity rejects the
entire affected batch, and bounded source failures name the affected IDs.
Neuron-info keys must be nonzero, requested, and unique. A returned full target must
have a matching nonzero NNS retrieval timestamp, and a refresh later than that snapshot
invalidates the batch rather than producing a factual failure.

Cycle exhaustion is limited by a fixed reserve, at most two concurrent checks,
same-neuron in-flight rejection, and a short global start window. This tiny guard is
heap-only, anonymous/global, exposes no counters, prunes entries at least 300 seconds old
on admission, and resets on upgrade. There is no
cache, persistent rate limit, stable application state, timer, or background work.
Only this guard uses Dendrite local time; reports and activity rules use the NNS snapshot.

The frontend uses constructed nodes and `textContent`, HTTPS-only link validation, and
no dynamic `innerHTML`. NNS identifiers remain strings or `bigint`, never JavaScript
`number`. Its canister ID is a mandatory validated build input, production root-key
fetching is disabled, and hostnames cannot replace the configured principal. CSP
disallows inline and third-party runtime content. Production connects only to
`https://icp-api.io`; explicit local mode is limited to the two certified local replica
origins.

The controller is blackholed only when `canister_info` succeeds, `module_hash` is absent,
and controllers are empty. Failed lookup is indeterminate. The canister receives no
delegations and exposes no arbitrary outbound primitive.

Internet Identity adds a browser-only trust boundary. The canonical derivation origin
is security-critical because changing it changes user principals; it must be finalized
before hotkey onboarding, and every alternative must remain operator-controlled.
Unexpected origins cannot authenticate. Delegations, public keys, identities, and
principals are never sent to Dendrite, and unavailable manager evidence never confers
authority. The popup uses certified `same-origin-allow-popups`; no remote script or
style is loaded. The authenticated NNS actor remains private to the browser and has a
fixed Governance destination.
Session, popup, and browser-storage failures are bounded and retryable without treating
them as permanent origin approval. A failed sign-out retains the displayed principal;
only successful SDK sign-out clears it. Identity restoration precedes initial routing,
preventing a signed-out report render from racing a restored session.

The authenticated actor has one compile-time destination and typed methods only. Every
mutation requires a current Governance-only delegation, fresh manager authority and
target evidence, immutable review, explicit confirmation, strict response tags, and no
automatic retry. The signing identity is never rendered, logged, serialized by
Dendrite, or sent to the Dendrite canister. NNS errors are bounded text.

Fresh preparation fingerprints the authenticated principal, target and proposer,
ordered raw managers, distinct-manager count, quorum, committed topics, fee, and
operation-specific evidence. Any drift clears the review. Manager voting additionally
requires a caller-visible Unspecified ballot from the proposal's fixed electoral roll.
Transport ambiguity or an unexpected post-call response cannot be retried from the same
review. Review preparation is page-session serialized and generation-owned, so stale
asynchronous work cannot replace a ready review, an in-flight update, or an unresolved
outcome. Route generations similarly prevent stale anonymous checks and detached
transaction panels from replacing the current route.
Selected-route rerenders are separate from route navigation: authentication completion
and transaction settlement cannot increment the route generation, replace a loading or
error neuron view with landing, or cancel a newer owned check. One application-local
authentication-transition marker removes mutation controls, synchronously cancels
preparing/ready work at sign-out start, and makes the pipeline's session and NNS-actor
accessors fail closed until sign-in or sign-out finishes. A failed sign-out restores
access to the retained validated session and actor, but never revives the cancelled
review.

An ambiguous ingress result retains only a bounded heap-only operation label, context
and mutation/managed neuron IDs, request digest, and display-only browser timestamp.
Mutation remains blocked across route, report, and authentication rerenders until the
operator explicitly acknowledges that the operation may have succeeded. Acknowledgment
never retries it. A full browser reload necessarily loses this coordination marker, so
the operator must investigate uncertainty before reconstructing a request; no durable
transaction state is added. Configured reward-receiver IDs are not treated as proof of existence; the
bounded live check distinguishes readable, not returned to this caller, and unavailable.

Separately, the application retains at most one bounded heap-only current known
transaction receipt. A later known result replaces it; dismissal makes no NNS call and
does not acknowledge or clear an unresolved outcome. The receipt contains only the
operation label, context and mutation/managed neuron IDs, request digest, optional
proposal ID or bounded known error, and a display-only browser timestamp. It contains
no identity, delegation, complete request, or private manager data; it is neither
history nor persistence and is lost on reload. Explicit Governance rejection is known
negative evidence, while transport ambiguity remains under the pipeline's blocking
acknowledgment authority.

After a known successful response, a selected route for the same Dendrite context
always receives one newer anonymous live check generation. That post-response check
supersedes any same-neuron check begun before settlement. Settlement on landing or a
different neuron never navigates, cancels that route's check, or restores the old
route. Proposal creation is not adoption or execution, and Dendrite performs no
automatic proposal polling, mutation retry, or adoption inference.
