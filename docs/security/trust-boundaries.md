# Trust boundaries

- NNS Governance and the management canister are evidence sources, not trusted text sources.
- The Dendrite canister is trusted to normalize, bound, evaluate, cache, and certify anonymous results.
- The browser is a presentation boundary. Future privileged calls must be signed there and sent directly to Governance.
- Stable memory contains only bounded verifier state and operational metadata; it contains no delegations, secrets, proposal bodies, or proposal history.
- Reproducible hashes and certification let reviewers connect source, Wasm, and served assets without trusting a hosted backend.
