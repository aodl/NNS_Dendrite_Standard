# Architecture overview

Dendrite is exactly one stateless Rust canister. It embeds a certified static frontend,
accepts anonymous `check_neuron` updates, reads bounded live evidence through fixed NNS
Governance `list_neurons` and management `canister_info` calls, returns the report, and
stores nothing from it. Certified assets are served by `http_request`.

There is no stable application database, cache, proposal or transaction history,
timer, polling, analytics, off-chain service, or background processing. A small
heap-only global admission guard resets on upgrade.

Internet Identity runs only in the browser. The browser holds the at-most-eight-hour
session and a delegation targeted only to NNS Governance. It locally compares the
principal with a fresh report and makes privileged `manage_neuron` calls directly to
Governance. It never creates an authenticated Dendrite actor and never sends delegation
material to Dendrite.

The application canister and a target neuron's blackholed controller canister are
different trust domains. Dendrite itself retains reviewed upgrade control so releases
can replace both code and certified assets. See [trust boundaries](../security/trust-boundaries.md).
