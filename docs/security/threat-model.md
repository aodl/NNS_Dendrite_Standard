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
style is loaded. No NNS mutation or authenticated NNS actor exists in this tranche.
