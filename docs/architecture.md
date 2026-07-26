# Architecture

Dendrite is exactly one stateless Rust canister. It embeds and certifies the frontend,
accepts anonymous update `check_neuron` calls, obtains bounded live evidence from fixed
NNS Governance `list_neurons` and management-canister `canister_info` calls, evaluates
the standard, and returns the report. Certified assets are served by the sole query
application method, `http_request`.

```text
Preliminary:
Browser -> anonymous signed Governance list_neurons queries
        -> strict browser validation/normalisation
        -> browser evaluator -> qualified preliminary report

Authoritative:
Browser -> Dendrite check_neuron update
        -> fixed NNS/management reads -> Rust evaluator
        -> consensus-verified report

Privileged:
Browser -> Internet Identity -> Governance-only browser delegation
        -> fresh Dendrite check_neuron preflight
        -> fixed NNS Governance mutation -> receipt -> unverified resulting state
```

There is no application stable state, result cache, report or transaction history,
timer, polling, analytics, off-chain service, or background work. A small heap-only
abuse guard resets on upgrade. Dependencies are requested in batches of at most 50,
within the derived 272-ID graph bound.

The preliminary path uses a separately generated, query-only Governance declaration
whose only method is `list_neurons`. Its production `HttpAgent` is anonymous, fixed to
`rrkah-fqaaa-aaaaa-aaaaq-cai` and `https://icp-api.io`, enables query-signature
verification, and never fetches a root key. The target is loaded first; required
anchors, managers, and committed-topic delegates are then sorted, deduplicated and
loaded in batches of at most 50 through a promise cache that is discarded on route
change or explicit refresh. Failed entries are evicted for retry. Nothing is persisted.

Browser validation rejects an entire malformed batch before normalisation. The
browser evaluator mirrors the Rust evidence and policy model, but cannot call
management-canister `canister_info`; therefore controller blackhole rules remain
indeterminate until explicit consensus verification. Preliminary evidence never enables
transaction controls and never satisfies transaction final preflight.

Internet Identity and privileged operations run only in the browser. The at-most
eight-hour delegation targets NNS Governance, never Dendrite. The browser compares its
principal with live manager evidence locally and sends reviewed typed mutations
directly to Governance. It never constructs an authenticated Dendrite actor.

The certified frontend binds served bytes to installed Wasm. It does not prove browser
integrity, operator intent, or controller policy. Dendrite's application controller is
distinct from a target neuron's blackholed controller canister and retains reviewed
upgrade authority.

The canonical Internet Identity derivation origin is an immutable production build
input. Changing it changes Dendrite principals and is a security migration. Alternative
origins are normalized, unique, bounded, certified, and operator-controlled;
unexpected origins cannot authenticate. Production configuration and identifiers are
authoritative only in [deployment](operations/deployment.md).
