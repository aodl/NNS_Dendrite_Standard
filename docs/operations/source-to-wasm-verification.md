# Source-to-Wasm verification

1. Check out the exact release commit and verify its tag, lockfiles, tool pins, Candid,
   Dockerfile digests, and production inputs.
2. Run the complete [testing matrix](../development/testing.md).
3. Run `tools/scripts/docker-build-release.sh` and
   `tools/scripts/verify-docker-reproducible.sh`.
4. Verify `sha256sum -c dist/release/SHA256SUMS` and
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
