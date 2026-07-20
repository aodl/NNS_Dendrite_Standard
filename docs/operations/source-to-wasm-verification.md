# Source-to-Wasm verification

Check out the exact reviewed commit with its lockfiles, use the versions in `README.md`, then run `cargo xtask verify-reproducible`. Compare `sha256sum dist/dendrite.wasm` with the deployed module hash and retain `dist/frontend.sha256`, `dist/asset-manifest.json`, and SBOM hashes externally. The canister deliberately stores none of this release evidence.

`Dockerfile.repro` pins its Node and Rust base images by immutable digest. Container execution additionally requires access to a Docker-compatible daemon; local two-build verification does not. Interface provenance is fixed in `docs/standard/SOURCE_BASELINE.md`, and tests enforce both external structural compatibility and local Rust/checked-Candid equality.

## Anonymous verifier release evidence — 2026-07-19

**Superseded on 2026-07-20.** This historical evidence used the incorrect
`63_072_000`/`15_768_000` time constants and built the frontend for the management
canister fallback `aaaaa-aa`. Its hashes are retained only to preserve the meaning of
the historical record and are not current release artifacts.

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

## Historical reproducibility fixture and local functional evidence — 2026-07-20

This section supersedes the 2026-07-19 artifacts. The reviewed code commit is
`ac219087527c1fa8a68fcb7b9b13606f2c69fad0`. The recorded deterministic byte fixture
embeds fixture canister ID `v27v7-7x777-77774-qaaha-cai`, production API host
`https://icp-api.io`, and production root-key policy `false`. The standard is
`nns-dendrite/1.0-draft`, pinned to
`d55a0f4d4edfabe49d8fd543aff473084cb741f2`. These hashes demonstrate reproducibility
for those explicit inputs only. They are not a deployable release and are not hashes of
the byte sequence installed by the local functional flow. No mainnet deployment was
performed.

Tool versions were Rust `1.94.1`, Node `24.15.0`, npm `11.12.1`, dfx `0.27.0`, and
PocketIC `15.0.0`. Separately, `DFX_IDENTITY=codex_local` was used for the local
functional create/build/install flow. That flow used the actual local canister ID,
`http://127.0.0.1:4943`, and root-key fetching enabled, and successfully installed the
one canister. Its functional PocketIC/dfx results do not establish the fixture hashes
above.

The following commands exited successfully: `cargo fmt --all -- --check`, strict
warnings-denied workspace Clippy, `cargo xtask check`, `cargo xtask test`, `cargo xtask
coverage`, `cargo xtask build` with the explicit ID and host, the semantic interface
drift check, the PocketIC suite, `npm ci`, `npm test`, `npm run test:coverage`, the
production dependency reachability check, `cargo xtask security-scan`, `cargo xtask
sbom`, `cargo xtask build-reproducible`, and `cargo xtask verify-reproducible` with the
same deployment inputs. The frontend builder tests also proved absent and malformed IDs
fail, the supplied ID and host are embedded, hostname selection is irrelevant, and
production root-key fetching is rejected.

Coverage was 87.18% workspace Rust lines, 99.90% pure-engine lines, and 100.00%
pure-engine branches. Frontend coverage, including every production module, was 99.30%
lines, 86.67% branches, and 97.44% functions. PocketIC passed compliant,
non-compliant, rejected/indeterminate, real controller, certified HTTP, and upgrade
paths with the Governance fixture's `list_neurons` declared as a query.

Security scanning found no unapproved vulnerability. The approved warnings remain the
documented `paste`, PocketIC-only `backoff`/`instant`, and HTTP-certification/PocketIC
`serde_cbor` exceptions. Production reachability excludes `pocket-ic`, `backoff`, and
`instant`; `serde_cbor` remains reachable only through the reviewed official HTTP
certification libraries. SBOM generation emitted only the documented non-RFC-3986
`ic-cdk-executor` metadata warning.

Historical production reproducibility-fixture hashes:

- Wasm, clean build 1 and clean build 2:
  `775d826b93a32cc6c6fbaa62a5c4d27a5c95799b0b11ed9f3f488791776f9969`.
- Frontend file-hash manifest, clean build 1 and clean build 2:
  `3eeaeda1ef6d8edbc55c16b3b7a6e793a908bf2dbaf4447e4d5848261926589f`.
- Asset manifest:
  `6e55edb9a9b31b0f783004911b0ba753b7ae571f49ff7ba8ab843990e7a3b5f2`.
- Build-configuration evidence:
  `9ea483fac33afb138b9527eda0e88d4ab8d521cac7f8350560029c700666b21b`.
- Dendrite Rust SBOM:
  `dd2d29f4f103c3b6bd712a95133ec4fd40a1f953ded8925eedbc406e247f39b6`.
- Test Governance Rust SBOM:
  `1801a72b475da56f59e42a74ca8f97d579f52c8cdcd5023ebd058a9be59a8bf6`.
- Rule-engine Rust SBOM:
  `fe02171fd8542af6e778de2be1d70203a6dba18d5cc7aa4bb6eacd7de6ceda41`.
- IC clients Rust SBOM:
  `03d79078f4119d865cf009236bd464e84ffc8c30a91b38f294e5c73032ed71bd`.
- npm SBOM:
  `0e3bde3bfebc6bce3a10fdc8a016fc089b235ed805661a298ab58a8119d9f4b4`.
- xtask Rust SBOM:
  `75df46d699b6c9491e3e89fc724b74ab0574eb3fcf3d6bf022271a40a40c276b`.

Both clean Wasm builds, frontend file-hash manifests, asset manifests, and recorded
deployment inputs were byte-identical. Known limitations remain deliberate: live checks
consume cycles and may be globally rate-limited; reports are not retained; and the
current call API exposes only a coarse rejection code, not a reliable typed
canister-not-found condition, so `canister_info` rejection remains indeterminate rather
than being inferred from English text. Internet Identity, authentication, manager
operations, proposal construction/submission/voting, rewards assistance, history,
caches, stable application state, timers, and background work remain deferred.

## Final anonymous-verifier correction evidence — 2026-07-20

The implementation through `c0eda66` was built as a production reproducibility fixture
with explicit fixture canister ID `v27v7-7x777-77774-qaaha-cai`, fixed API host
`https://icp-api.io`, and root-key fetching disabled. This demonstrates deterministic
bytes only; it is not a deployable production release. No mainnet canister ID was
created or authorized, and no mainnet deployment was performed.

Local functional verification remained separate. PocketIC `15.0.0` passed compliant,
non-compliant, rejection/indeterminate, real controller inspection, certified HTTP,
and certified upgrade paths. The previously recorded `DFX_IDENTITY=codex_local` flow
used its actual local ID, `http://127.0.0.1:4943`, and root-key fetching enabled; this
pass does not claim its installed bytes match the production fixture.

Rust `1.94.1`, Node `24.15.0`, npm `11.12.1`, and dfx `0.27.0` were used. Formatting,
strict warnings-denied workspace Clippy, `cargo xtask check`, configured `cargo xtask
test`, `cargo xtask coverage`, semantic interface drift, PocketIC, `npm ci`, `npm test`,
`npm run test:coverage`, explicit fixture `cargo xtask build`, production dependency
reachability, `cargo xtask security-scan`, `cargo xtask sbom`, `cargo xtask
build-reproducible`, and `cargo xtask verify-reproducible` exited successfully. One
initial `cargo xtask test` without `DENDRITE_CANISTER_ID` failed as designed; the
configured rerun passed. The production asset tree hash was
`0b81502e0f55f1c54cae487d3791a4637ffe8692c8cb8841f554f3f1e18058bd`
both before and after the standalone frontend test and coverage suites.

Workspace Rust line coverage was 88.45%; pure-engine line coverage was 99.91% and
branch coverage was 100.00%. Frontend coverage was 98.73% lines, 90.16% branches, and
97.50% functions. Production reachability excludes `pocket-ic`, `backoff`, and
`instant`; `serde_cbor` remains reachable only through the reviewed official HTTP
certification libraries. Scans found no unapproved vulnerability. SBOM generation
emitted only the documented non-RFC-3986 `ic-cdk-executor` metadata warning.

Production reproducibility-fixture hashes:

- Wasm, both clean builds:
  `3e1b238b913f2ba85b821bc0af4988095ce7adbae6b3820ea600aebc682fb374`.
- Frontend file-hash manifest, both clean builds:
  `0b81502e0f55f1c54cae487d3791a4637ffe8692c8cb8841f554f3f1e18058bd`.
- Asset manifest:
  `a3fccf85161cfad6f8bad8545587b1ec3fbb018da9d7a84d4e9cb09aeefa86b8`.
- Build configuration:
  `9ea483fac33afb138b9527eda0e88d4ab8d521cac7f8350560029c700666b21b`.
- Dendrite Rust SBOM:
  `8a43f8c67e271bd34c11eabd6b88a66665d5e491fccd12d3a907da0b2c4c4012`.
- Test Governance Rust SBOM:
  `679c5aaadf2a352f2f7ad83529d89edb3870a5514163eb4332adf1e4e22d52e5`.
- Rule-engine Rust SBOM:
  `926e3e6664bf467a2b8979f369530d46a8587f52209465848b561b907099fe8b`.
- IC clients Rust SBOM:
  `29ac7e67d72111e39e4321f5c6612e9a24eabe181b6ce32b72a81d3b50405878`.
- npm SBOM:
  `374e5abecab9d564d5461ca9e4697bb4e992a8aebd8f8abd87f280e9eee78582`.
- xtask Rust SBOM:
  `84cdd8f038c3a204b89ceadacdcf94948d64f333c0a750c9160d6ba246d9d796`.

The Candid application API remains update `check_neuron : (nat64) -> (CheckResult)`
and query `http_request`; the unreachable public `Upstream` error was removed. The only
outbound methods remain fixed Governance `list_neurons` and management
`canister_info`. Internet Identity, authentication, hotkey onboarding, proposal
construction/simulation/submission, voting, rewards assistance, history, caches, stable
application state, timers, analytics, and background work remain deferred.
