# Architecture

Dendrite is exactly one stateless Rust canister. It embeds and certifies the frontend,
accepts anonymous update `check_neuron` calls, obtains bounded live evidence from fixed
NNS Governance `list_neurons` and management-canister `canister_info` calls, evaluates
the standard, and returns the report. Certified assets are served by the sole query
application method, `http_request`.

```text
Browser -> Dendrite check_neuron -> fixed NNS/management reads -> live report -> Browser
Browser -> Internet Identity -> Governance-only browser delegation
        -> fixed NNS Governance mutations -> receipt -> fresh anonymous report
```

There is no application stable state, result cache, report or transaction history,
timer, polling, analytics, off-chain service, or background work. A small heap-only
abuse guard resets on upgrade. Dependencies are requested in batches of at most 50,
within the derived 272-ID graph bound.

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
