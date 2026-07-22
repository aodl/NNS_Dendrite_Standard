# Trust boundaries

- NNS Governance `list_neurons` and management `canister_info` are evidence sources,
  not trusted text sources.
- The Dendrite update call is trusted to bound, normalize, and evaluate one live report.
- The browser safely presents that report and is the sole custodian of the Internet
  Identity delegation. It sends neither delegation nor principal to Dendrite. It uses
  an explicitly embedded canister ID, IC API host, and root-key policy.
- The browser locally compares the authenticated principal with current manager
  controller/hotkey evidence. This read-only result is neither persisted nor authority
  granted by the canister.
- The canister stores no application data in stable memory. Its heap-only abuse guard
  resets on upgrade and contains only transient IDs/timestamps.
- The next privileged tranche is one audited call path signed in the browser and sent
  directly to Governance; no such call exists now.
- Reproducible hashes and HTTP certification connect reviewed source, Wasm, and assets
  without a hosted backend or dynamic compliance-proof tree.
- Privileged calls use one browser path signed by a Governance-only delegation and sent
  directly to the compile-time Governance principal. Fresh anonymous evidence and
  replicated NNS reads guard the exact immutable reviewed request.
