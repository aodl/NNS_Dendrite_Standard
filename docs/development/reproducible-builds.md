# Reproducible builds

Local verification runs two builds separated by `cargo clean`, while keeping reference artifacts in a temporary directory outside `target/`:

```sh
cargo xtask verify-reproducible
```

The command uses lockfiles and `--locked` Cargo invocations, sets `SOURCE_DATE_EPOCH=0`, builds the frontend before Wasm, compares exact Wasm bytes and frontend manifests, and prints SHA-256 hashes. `Dockerfile.repro` pins Node and Rust base-image indexes by digest and exports only Wasm, frontend, and hashes. Node/npm versions are pinned by `.nvmrc`, `packageManager`, and exact engines. Production builds never fetch Candid interfaces or generate broad NNS bindings dynamically.
