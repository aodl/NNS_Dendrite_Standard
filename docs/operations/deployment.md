# Deployment

Use `DFX_IDENTITY=codex_local` for local replicas. Build and verify before installation:

```sh
npm ci
cargo xtask check
cargo xtask test
cargo xtask build
cargo xtask verify-reproducible
DFX_IDENTITY=codex_local dfx start --clean --background
DFX_IDENTITY=codex_local dfx deploy dendrite
```

Mainnet deployment is intentionally not scripted here and must not be performed without explicit authorization. Before production deployment, review the compile-time canister ID, fixed cycle reserve, domain and CSP gateway origins. The certified alternative-origin list is empty because identity is deferred. There is no mutable deployment configuration or stable application state to migrate.
