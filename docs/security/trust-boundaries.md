# Trust boundaries

- NNS Governance `list_neurons` and management `canister_info` are evidence sources,
  not trusted text sources.
- The Dendrite update call is trusted to bound, normalize, and evaluate one live report.
- The browser safely presents that report and retains no privileged identity in this
  tranche.
- The canister stores no application data in stable memory. Its heap-only abuse guard
  resets on upgrade and contains only transient IDs/timestamps.
- Future privileged calls must be signed in the browser and sent directly to Governance.
- Reproducible hashes and HTTP certification connect reviewed source, Wasm, and assets
  without a hosted backend or dynamic compliance-proof tree.
