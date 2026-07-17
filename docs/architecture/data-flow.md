# Anonymous verification data flow

1. Validate a non-zero `nat64` target ID.
2. Return a fresh stable-cache entry when available.
3. Enforce cycle reserve, cooldown, global window, in-flight, and concurrency limits.
4. Read the known-neuron catalogue and target public full neuron from fixed NNS Governance.
5. Preserve raw manager and committed-topic lists, then form a bounded unique dependency request including alpha-vote and omega-reject.
6. Read network economics and inspect the target controller with management `canister_info` requesting zero changes.
7. Normalize, evaluate all supported rules, compute a deterministic digest, and cache only eligible complete results.
8. Return the timestamped snapshot. The frontend labels cached evidence stale after its exact stale boundary.

No step accepts a destination, method, raw Candid payload, delegation, or proposal-history record from a caller.
