# Reproducible builds

Local verification runs two builds separated by `cargo clean`, while keeping reference artifacts in a temporary directory outside `target/`:

```sh
DENDRITE_CANISTER_ID=<reviewed-dendrite-canister-id> \
  cargo xtask verify-reproducible
```

The explicit ID is validated with `Principal.fromText` and embedded unchanged. The IC API
host defaults to `https://icp-api.io`; production root-key fetching is fixed off. The
command records those inputs, uses lockfiles and `--locked` Cargo invocations, sets
`SOURCE_DATE_EPOCH=0`, builds the frontend before Wasm, compares exact Wasm bytes and
frontend manifests, and prints SHA-256 hashes. `Dockerfile.repro` accepts the same
mandatory `DENDRITE_CANISTER_ID` build argument and optional `DENDRITE_API_HOST`, pins
Node and Rust base-image indexes by digest, and exports only Wasm, frontend, and hashes.
Node/npm versions are pinned by `.nvmrc`, `packageManager`, and exact engines. Production
builds never fetch Candid interfaces or generate broad NNS bindings dynamically.
