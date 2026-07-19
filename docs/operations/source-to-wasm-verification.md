# Source-to-Wasm verification

Check out the exact reviewed commit with its lockfiles, use the versions in `README.md`, then run `cargo xtask verify-reproducible`. Compare `sha256sum dist/dendrite.wasm` with the deployed module hash and retain `dist/frontend.sha256`, `dist/asset-manifest.json`, and SBOM hashes externally. The canister deliberately stores none of this release evidence.

`Dockerfile.repro` pins its Node and Rust base images by immutable digest. Container execution additionally requires access to a Docker-compatible daemon; local two-build verification does not. Interface provenance is fixed in `docs/standard/SOURCE_BASELINE.md`, and tests enforce both external structural compatibility and local Rust/checked-Candid equality.

## Anonymous verifier release evidence — 2026-07-19

The public application API is update `check_neuron : (nat64) ->
(variant { Ok : ComplianceReport; Err : DendriteError })` and query `http_request`.
The only outbound methods are NNS Governance
`rrkah-fqaaa-aaaaa-aaaaq-cai.list_neurons` and management canister
`aaaaa-aa.canister_info`; the latter always requests zero changes. The reviewed source
revision is `d55a0f4d4edfabe49d8fd543aff473084cb741f2`.

The following release commands exited successfully: `cargo fmt --all -- --check`,
warnings-denied workspace Clippy through `cargo xtask check`, `cargo xtask test`,
`cargo xtask coverage`, `cargo xtask build`, the semantic interface drift script,
the PocketIC suite, `npm ci`, `npm test`, `npm run test:coverage`, the production
dependency reachability script, `cargo xtask security-scan`, `cargo xtask sbom`,
`cargo xtask build-reproducible`, and `cargo xtask verify-reproducible`.

Coverage results were 86.17% workspace Rust lines, 98.31% pure-engine lines, and
98.94% pure-engine branches. Frontend coverage was 100% lines, 89.58% branches, and
94.23% functions. PocketIC passed a compliant live check, a non-compliant live check,
an upstream-rejection/indeterminate check, real empty-controller inspection, certified
landing-page serving, and certified serving after upgrade.

The production normal/build tree excludes `pocket-ic`, `backoff`, and `instant`.
The security scan reported no unapproved advisory or vulnerability. Its dated narrow
exceptions are `RUSTSEC-2024-0436` (`paste` through Candid), `RUSTSEC-2025-0012` and
`RUSTSEC-2024-0384` (PocketIC-only `backoff` and `instant`), and
`RUSTSEC-2021-0127` (`serde_cbor` through official HTTP certification libraries and
PocketIC test tooling). See `docs/security/dependency-exceptions.md` for owners,
reachability, review date, and removal conditions.

Release hashes:

- Wasm, clean build 1 and clean build 2:
  `7b72167cc36cb2e32a6e5c75d4ccd35e6ca0faa46587e03808d6128859d5e20a`.
- Frontend manifest, clean build 1 and clean build 2:
  `7c4c8663b0753e2b3e97023282c4ce320b7dc8343fa9b36ff42095bc76322f22`.
- Asset manifest:
  `68a479d8a3b1cf0e8a58b99de96a803041736284acd21c2fe68d9890b303904d`.
- Dendrite Rust SBOM:
  `333fe7878efcfaa9f855af28e105b6090b2c41b91d1029c7c07d82af62180486`.
- Test Governance Rust SBOM:
  `1558d2b8fb38d22f67cc29ff9e4c329df3357136452979a0ec94ddb2cc5bce07`.
- Rule-engine Rust SBOM:
  `6ee979175f0500a2101c58ed17c065334612e531239fe31d8bf33d93c48482fe`.
- IC clients Rust SBOM:
  `954b987f6b9053a5e93bae03c02dbea17dd055950b87246bf692208e2af6954c`.
- npm SBOM:
  `3f87e42430de7f1270e7b0d6af82c1e900e208a02e3afb456e30f74cd469c73a`.
- xtask Rust SBOM:
  `ffcb5868c2abb20f1566ffdb0b46298b3e576f76e1e757d3723f2d3e73785c54`.

The two clean Wasm builds and frontend manifests were byte-identical. SBOM generation
emitted only the known upstream warning that `ic-cdk-executor` has a non-RFC-3986
package metadata link.

Known limitations remain deliberate: checks consume cycles and can be globally
rate-limited; reports are not retained; and the alternative-origin list is empty.
Internet Identity, manager recognition, hotkey onboarding, and every governance control
remain deferred. Future privileged calls must be browser-to-NNS and must never send a
delegation through Dendrite.
