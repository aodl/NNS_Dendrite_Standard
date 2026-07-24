# Source-to-Wasm verification

1. Check out the exact release commit and verify its tag, lockfiles, tool pins, Candid,
   Dockerfile digests, and production inputs.
2. Run the complete [testing matrix](../development/testing.md).
3. Run `tools/scripts/docker-build-release.sh` and
   `tools/scripts/verify-docker-reproducible.sh`.
4. Verify `(cd dist/release && sha256sum -c SHA256SUMS)` and
   `tools/scripts/verify-release-artifacts.sh`.
5. Confirm `icp.yaml` uses `@dfinity/prebuilt@v2.0.0`, path
   `dist/release/dendrite.wasm`, and the exact raw Wasm SHA-256.
6. After deployment, run `tools/scripts/verify-mainnet-readonly.sh` and record the live
   module, frontend tree, asset manifest, configuration, policy, declaration, and SBOM
   hashes in the [production record](production-record.md).

The prebuilt hash is release-specific. For each release, build the final canonical
artifact first, replace only the `icp.yaml` `sha256` with
`sha256sum dist/release/dendrite.wasm`, then rerun all artifact and two-build checks.
Never insert a placeholder or let production deployment rebuild source implicitly.

## Release-tooling verification — 2026-07-24

Commits `19cea38` through `4c75b79` added the production record, canonical artifact
flow, guarded lifecycle, structured operations documentation, and release-boundary
tests. The public Candid remains exactly update `check_neuron` and query
`http_request`; outbound canister calls remain Governance `list_neurons` and management
`canister_info` at pinned source `d55a0f4d4edfabe49d8fd543aff473084cb741f2`.

Formatting, warnings-denied Clippy, `cargo xtask check`, `cargo xtask test`, Rust and
frontend coverage, semantic interface drift, all three PocketIC scenarios, dependency
reachability, configured/local reproducible builds, local two-build equality, security
scan, SBOM generation, release-tooling failure paths, and documentation links passed.
Workspace Rust line coverage was 90.68%; pure-engine line/branch coverage was
98.28%/99.18%; frontend line/branch/function coverage was
99.04%/88.33%/93.43%. The local two-build raw Wasm hash was
`a485a9f8785a27c84a824ae55904f8b1791216ade89fdab0517cd58c3f6c5296`.

SBOM hashes were:

- Dendrite: `756531afb66e13985244124769b0c894952eb8dcedaca4e32c46a7ade1fae477`
- types: `5ab229f67fddfc00f2e5eddaaf21b969872bc1e1d3bc16cb465c59a75d2ba61e`
- IC clients: `1102ff54caef38d249575ef29022d4dcdfe195226394aadabfe60b507c060296`
- PocketIC fixture: `8660b1edd86b943ddeef35b69f197967435adafd4bdb999ff9d0ac08708ecda2`
- xtask: `b401bc5019429e88ec396835d3ab945eaf3c3e9be88729f8b1bda95b459ba9e5`
- npm: `ad8925c0c18a6e534c38cc53a9448ca7fceefd2579b2844d8e2c3c32c44e21fe`

Canonical Docker verification remains blocked in this environment: Docker/buildx are
installed, but the user cannot access `/var/run/docker.sock`; a rootless Podman
compatibility service completed builds but dropped both local-directory and tar exports
before completion. The real mainnet dry-run made no write, confirmed public
`module_hash: null`, and then failed closed because the active `icp-cli` identity is
anonymous and cannot call the controller-only settings endpoint. No identity was
selected, no production code was installed, and no operator gate was run.
