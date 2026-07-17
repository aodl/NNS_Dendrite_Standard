# Source-to-Wasm verification

Check out the exact reviewed commit with its lockfiles, use the versions in `README.md`, then run `cargo xtask verify-reproducible`. Compare `sha256sum dist/dendrite.wasm` with the deployed module hash and retain `dist/frontend.sha256`, `dist/asset-manifest.json`, and SBOM hashes.

`Dockerfile.repro` pins its Node and Rust base images by immutable digest. Container execution additionally requires access to a Docker-compatible daemon; local two-build verification does not. Interface provenance is fixed in `docs/standard/SOURCE_BASELINE.md`, and tests enforce both external structural compatibility and local Rust/checked-Candid equality.
