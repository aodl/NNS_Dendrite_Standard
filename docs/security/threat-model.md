# Threat model

Untrusted inputs include every upstream neuron field, URL, principal, error, rule value, route, and neuron ID. Bounds in typed clients and snapshot construction limit response amplification. Unknown committed variants and reserved/unknown following topics fail closed. Transport failure is not rewritten as a factual compliance failure.

The frontend uses `textContent`, constructed nodes, and HTTPS-only link validation; it contains no dynamic `innerHTML`. NNS identifiers remain strings or `bigint`, never JavaScript `number`. CSP disallows inline and third-party runtime content.

Cycle exhaustion is mitigated by a reserve threshold, a global fixed window, per-neuron cooldown, maximum concurrency, same-neuron deduplication, and fresh-cache reuse. The cache has a hard 256-record cap and deterministic timestamp/neuron-ID eviction.

The controller is blackholed only when `canister_info` succeeds, `module_hash` is absent, and the controller list is empty. Failed lookup is not evidence of blackholing.

Residual risks and incomplete functionality are recorded in `docs/operations/known-limitations.md`.
