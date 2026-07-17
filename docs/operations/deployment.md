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

Mainnet deployment is intentionally not scripted here and must not be performed without explicit authorization. Before production deployment, review the cycle reserve, canonical domain, CSP gateway origins, and `/.well-known/ii-alternative-origins`. The current alternative-origin list is empty because authenticated phases are incomplete.
