# Reproducible builds

Local verification runs two builds separated by `cargo clean`, while keeping reference artifacts in a temporary directory outside `target/`:

```sh
DENDRITE_CANISTER_ID=<reviewed-dendrite-canister-id> \
  cargo xtask verify-reproducible
```

The explicit fixture ID is validated with `Principal.fromText` and embedded unchanged.
The production IC API host is fixed to `https://icp-api.io`; production root-key
fetching is fixed off. The
command records those inputs, uses lockfiles and `--locked` Cargo invocations, sets
`SOURCE_DATE_EPOCH=0`, builds the frontend before Wasm, compares exact Wasm bytes and
frontend manifests, and prints SHA-256 hashes. These bytes are a production
reproducibility fixture, not a deployable artifact, until an operator supplies an
explicitly authorized mainnet canister ID. `Dockerfile.repro` accepts the same
mandatory `DENDRITE_CANISTER_ID` build argument, pins
Node and Rust base-image indexes by digest, and exports only Wasm, frontend, and hashes.
Node/npm versions are pinned by `.nvmrc`, `packageManager`, and exact engines. Production
builds never fetch Candid interfaces or generate broad NNS bindings dynamically.
Runtime report timestamps do not enter the embedded artifact: the report's
`checked_at_timestamp_seconds` comes from each live NNS evidence response, while local
time is used only by the heap-only abuse guard.
