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

Workspace Rust line coverage was 89.46%; pure-engine line coverage was 99.91% and
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
  `0f17c9149b87803c7c04043f86f7962da4a8da2053ae68b906c800455cb564c3`.
- Test Governance Rust SBOM:
  `5e8b8a3498d1f4f6ccabc4c0cbafc7332f2c76e8f6f9fb9d5352b56c3c47abb6`.
- Rule-engine Rust SBOM:
  `c560480cf4e9c4ba12dc6ae48f7a35d4203b7c248d263fec661eff11b42f8795`.
- IC clients Rust SBOM:
  `147f59abf75028c1f6e8489ed997e1b5761b63e14850eaf2232a77e0a6ac54e3`.
- npm SBOM:
  `3a169b7e47408e22d09b2619acb3c8145de968638a633d070a455ac97eabe413`.
- xtask Rust SBOM:
  `d92e4abd55a5ec3764c19882a870c77e2ec9b0ce16deb380b01ee06ca3d3e086`.

The Candid application API remains update `check_neuron : (nat64) -> (CheckResult)`
and query `http_request`; the unreachable public `Upstream` error was removed. The only
outbound methods remain fixed Governance `list_neurons` and management
`canister_info`. Internet Identity, authentication, hotkey onboarding, proposal
construction/simulation/submission, voting, rewards assistance, history, caches, stable
application state, timers, analytics, and background work remain deferred.

## NNS snapshot-clock release evidence — 2026-07-21

The anonymous-verifier implementation through `765cc67` was verified with explicit
reproducibility-fixture canister ID `v27v7-7x777-77774-qaaha-cai`, fixed API host
`https://icp-api.io`, and root-key fetching disabled. These deterministic fixture bytes
are not authorization to deploy to mainnet, and no mainnet deployment was performed.
The three implementation, scope-documentation, and licence commits changed 19 files,
with 475 insertions and 54 deletions relative to the starting `main`; this final evidence
section is the fourth requested documentation checkpoint.

Rust `1.94.1`, Node `24.15.0`, npm `11.12.1`, dfx `0.27.0`, and active dfx identity
`codex_local` were used. `cargo fmt --all -- --check`, strict warnings-denied workspace
Clippy, `cargo xtask check`, configured `cargo xtask test`, `cargo xtask coverage`, the
semantic interface-drift script, both PocketIC tests, `npm ci`, `npm test`, `npm run
test:coverage`, explicit-fixture `cargo xtask build`, the production asset byte-identity
check, the production dependency-reachability script, `cargo xtask security-scan`,
`cargo xtask sbom`, configured `cargo xtask build-reproducible`, and configured `cargo
xtask verify-reproducible` all exited successfully. A diagnostic direct `cargo test
--workspace --locked` invocation before fixture generation failed only because the test
Governance Wasm did not yet exist; the required configured xtask flow built the fixture
and both PocketIC tests passed.

Workspace Rust line coverage was 90.12%. Pure-engine line coverage was 99.73% and
branch coverage was 99.15%. Frontend coverage was 98.73% lines, 90.16% branches, and
97.50% functions. The checked-in production asset tree hash was
`0b81502e0f55f1c54cae487d3791a4637ffe8692c8cb8841f554f3f1e18058bd`
before and after the standalone frontend test and coverage suites. PocketIC passed the
compliant and non-compliant live graph, rejection/indeterminate behavior, real
controller inspection, certified HTTP, and certified upgrade paths; its Governance
fixture returns an explicit NNS retrieval timestamp. The derived 272-neuron graph and
50-ID dependency batching remain covered.

Production reachability excludes `pocket-ic`, `backoff`, and `instant`; `serde_cbor`
remains reachable only through the reviewed HTTP-certification libraries. Security
scans found no unapproved vulnerability. The existing documented exceptions remain
the unmaintained compile-time `paste`, PocketIC-only `backoff`/`instant`, and
HTTP-certification/PocketIC `serde_cbor`; SBOM generation emitted only the documented
non-RFC-3986 `ic-cdk-executor` metadata warning.

Production reproducibility-fixture hashes:

- Wasm, both clean builds:
  `bde9c55b20edb35f45059a4fb28907c8bc32100e4d271d181fc78c0dca2cc319`.
- Frontend file-hash manifest, both clean builds:
  `0b81502e0f55f1c54cae487d3791a4637ffe8692c8cb8841f554f3f1e18058bd`.
- Asset manifest:
  `a3fccf85161cfad6f8bad8545587b1ec3fbb018da9d7a84d4e9cb09aeefa86b8`.
- Build configuration:
  `9ea483fac33afb138b9527eda0e88d4ab8d521cac7f8350560029c700666b21b`.
- Dendrite Rust SBOM:
  `dd8f26527628a328d3ef5a012cc729d3bfecd5a711bb75c49d570ff6ac55d343`.
- Test Governance Rust SBOM:
  `37ce4e86216d4c74ab8f4e4f51f0a96248df68b0b87f07c207231739a6e6b974`.
- Rule-engine Rust SBOM:
  `d054b86a61667413430174f58bf25a5f04a79de75c1773b3c1150ae6e2d8fa8a`.
- IC clients Rust SBOM:
  `ee0f26c479439b30802a057cbb5dab31bcd8112fcee133c816b423ad555a7350`.
- npm SBOM:
  `cbf1cce702ba65292bda4501b049b82fd56fc35d56b3a07a6a5f102f02480a96`.
- xtask Rust SBOM:
  `f6ae066312d885e51adee4bb48989e364707df825fce803386b3af696a81ad40`.

The application Candid API remains update `check_neuron : (nat64) -> (CheckResult)` and
certified query `http_request`. Outbound calls remain fixed to NNS Governance
`list_neurons` and management `canister_info` at source revision
`d55a0f4d4edfabe49d8fd543aff473084cb741f2`. `checked_at_timestamp_seconds` now exposes
the validated NNS evidence snapshot, while local canister time is confined to the abuse
guard. The anonymous verifier tranche is complete. The product as a whole remains
incomplete against the original brief: Internet Identity and authenticated governance
functionality are the next product tranche, and identity, delegations, proposals,
voting, rewards, history, caches, stable application state, timers, and background work
remain deferred.

## Browser-only identity and read-only manager-recognition evidence — 2026-07-21

The implementation through `b23d336` was verified with fixture canister ID
`v27v7-7x777-77774-qaaha-cai`, canonical derivation origin
`https://dendrite.example`, normalized alternatives `[]`, production identity provider
`https://id.ai/authorize`, and delegation TTL `28800000000000` nanoseconds. The selected
SDK wrapper exposes no PIN-policy option, and Dendrite makes no separate PIN-policy
claim. These are reproducibility-fixture inputs, not a mainnet identity deployment or
a principal that any manager should install as a hotkey.

`npm ci`, `cargo fmt --all -- --check`, warnings-denied workspace Clippy, `cargo xtask
check`, configured `cargo xtask test`, `cargo xtask coverage`, semantic interface drift,
both PocketIC scenarios, `npm test`, `npm run test:coverage`, the production asset
byte-identity check, configured `cargo xtask build`, production dependency reachability,
`cargo xtask security-scan`, `cargo xtask sbom`, configured `cargo xtask
build-reproducible`, and configured `cargo xtask verify-reproducible` exited
successfully. The certified PocketIC assertions include the exact generated well-known
body, CORS and cross-origin resource policy, ordinary same-origin resource policy, and
popup-compatible COOP. Frontend coverage was 96.36% lines, 85.78% branches, and 95.24%
functions; the pure Rust rule engine was 98.25% lines and 99.18% branches. Existing
documented scan exceptions remained unchanged. The local popup smoke procedure was not
run because this environment had no display, interactive browser, or configured local
Internet Identity service; it is documented as a manual check in `deployment.md` and is
not claimed as automated E2E.

Production reproducibility-fixture hashes:

- Wasm: `8ad372e5930258b1ea22f0e84cc94a2383fc3fb01264218228290f67853acd42`.
- Frontend tree: `404f74ada2f57fecac60d2a8b06a2a4f1c1a506b7ea298a7fd9545ab0a5aed85`.
- Asset manifest: `dfd07d02f5634f7e1530702fa49892c4977606cf1f0e1ca307b37dc5de7ae292`.
- Build configuration: `a3b648bce333d3bdcb6e83cbc014d2e0889c4fc7a650dc61f01203302418fbe7`.
- Dendrite Rust SBOM: `870608d95188c8da277811ef2110c647d9770dcd1db349471f46f2eb4636327e`.
- Governance fixture Rust SBOM: `adc470e48bceb4656fd82299eb834543bf6098e10087ccf4391a4d64c4343d22`.
- Types Rust SBOM: `cf7fad839aba09a11b8f12e75463d4ca760d4e3933b0799108bf1bafce8533ba`.
- IC clients Rust SBOM: `e72708a330fa8e3be636e7bbcdaa889757f3069cba2851c841df73d1f87c47b5`.
- npm SBOM: `f97f562c8a2d3e8b3b7154e851209c494852ae5c0661a4a135d830f4fd95ff79`.
- xtask Rust SBOM: `9bae7865bfff1881482dc3523f11f34a148c7123be05c5abbd0fe3fce553c87e`.

Both clean builds were byte-identical with the same explicit identity inputs. The
canister remains stateless and its public methods and outbound call set are unchanged.
The delegation and authenticated principal remain browser-only; manager recognition is
read-only, and no authenticated NNS actor or mutation exists. The next product tranche
is one audited direct browser-to-NNS transaction pipeline. The full product is not yet
complete against the original brief.

## Browser-identity hardening evidence — 2026-07-21

The implementation through `3cb9413` was verified with fixture canister ID
`v27v7-7x777-77774-qaaha-cai`, canonical derivation origin
`https://dendrite.example`, normalized alternatives `[]`, production identity provider
`https://id.ai/authorize`, and delegation TTL `28800000000000` nanoseconds. The build
configuration contains no PIN-policy field, because the selected SDK wrapper exposes no
such option and Dendrite makes no separate claim. These remain reproducibility-fixture
inputs, not a mainnet deployment or a principal suitable for manager hotkey onboarding.

`npm ci`, `npm test`, `npm run test:coverage`, production-asset byte identity, `cargo
fmt --all -- --check`, warnings-denied Clippy, `cargo xtask check`, configured `cargo
xtask test`, both PocketIC scenarios, semantic interface drift, `cargo xtask coverage`,
configured `cargo xtask build`, production dependency reachability, `cargo xtask
security-scan`, `cargo xtask sbom`, configured `cargo xtask build-reproducible`, and
configured `cargo xtask verify-reproducible` exited successfully. The 35 frontend tests
passed at 99.27% lines, 89.14% branches, and 95.31% functions. Rust coverage retained
the existing thresholds. Certified alternative-origin, CORS/resource-policy, ordinary
asset policy, and popup-compatible COOP assertions passed in PocketIC. Existing scan
exceptions and the production dependency tree were unchanged.

Affected production reproducibility-fixture hashes:

- Wasm: `0d6692ca3129c601db26f2114af2a18847151ddf4fbfc27accfe09d2ae055960`.
- Frontend tree: `9d95768047d43770486fb4d964d6b71ea18adcce215abdc47c009919cfa3314d`.
- Asset manifest: `cbbc09d9e81bd1280a622760b2ba5a95531cf965bbbb6b38838aa2d17f746839`.
- Build configuration: `a8a4c643eacd4f5c491b761ba1897d16d71c14327582fecb3ab1f5808170b238`.

Regenerated SBOM hashes:

- Dendrite Rust: `4e6f5b2c870f785732961e720e7f9b300f89325b4efc9cb0ce90350620af56ba`.
- Governance fixture Rust: `991cf66e53f80cbf5eb668deb945f0caefa2264835fa0153a5a281aaf5c180aa`.
- Types Rust: `5d08d8b71d213c1b9b4d39f2ad4a4a48128fc52eefefdd1ec5f10ddb0bde7bc1`.
- IC clients Rust: `be9a06c3709faf2b6b517f92a5899bb2ac0fdd76eb1773d9a0f1f803f57506b7`.
- npm: `d1fb70bda96b03df02f29cc7820e9b1cd97dbf92d475e4f2c93be21482896443`.
- xtask Rust: `8a9339ebf6a267ad68b65f015130bf2cf66550d62d5778f3c696400b6285d090`.

Both clean builds were byte-identical. The real popup smoke test was not run because
this environment has no display, interactive browser, or configured local Internet
Identity service. It remains an explicit operator release gate with the full checklist
in `deployment.md`; no manager should add a Dendrite principal as a hotkey until it
passes on the finalized canonical origin. The browser-only identity tranche is frozen
after this hardening pass. No browser-to-NNS transaction work was begun.

## Browser-to-NNS management evidence — 2026-07-22

The implementation through `b7fc1e6` was verified with fixture canister ID
`v27v7-7x777-77774-qaaha-cai`, canonical derivation origin
`https://dendrite.example`, alternative-origin list `[]`, fixed Governance principal
`rrkah-fqaaa-aaaaa-aaaaq-cai`, and delegation target list containing exactly that
Governance principal. These are deterministic release-fixture inputs, not evidence of
a mainnet deployment or real transaction.

`npm ci`, `npm test`, `npm run test:coverage`, production asset byte identity, `cargo
fmt --all -- --check`, warnings-denied workspace/all-target/all-feature Clippy, `cargo
xtask check`, configured `cargo xtask test`, all three PocketIC scenarios, semantic
anonymous-verifier and Governance-transaction interface drift, `cargo xtask coverage`,
configured `cargo xtask build`, production dependency reachability, `cargo xtask
security-scan`, `cargo xtask sbom`, configured `cargo xtask build-reproducible`, and a
configured `cargo xtask verify-reproducible` starting from `cargo clean` exited
successfully. The first coverage attempt after the clean reproducibility run correctly
failed because the test-only Governance Wasm had been cleaned; the required configured
test flow regenerated it, after which the final coverage command passed. The semantic
checker emitted didc diagnostics for intentionally narrowed optional `By` and
`ProposalActionRequest` payloads, while the compatibility check and exact command and
response tag assertions passed.

The 60 frontend tests passed at 98.21% lines, 85.20% branches, and 90.86% functions.
Workspace Rust line coverage was 90.68%. The pure rule engine reached 98.28% lines and
99.18% branches. PocketIC proved the unchanged anonymous Dendrite API, fixed Governance
destination, exact outer `MakeProposal` and inner command nesting, current fee data,
proposal-ID response, direct manager `RegisterVote`, certified HTTP/alternative-origin
behavior, and absence of an authenticated call to Dendrite. Security scanning found no
unfiltered issue after the dev-only transitive `fast-uri` lock resolution was updated
from 3.1.3 to 3.1.4. Existing reviewed Rust advisory exceptions remain unchanged. SBOM
generation emitted only the existing upstream non-RFC-3986 `ic-cdk-executor` metadata
warning.

Privileged interface and capability evidence:

- Governance transaction Candid:
  `d48292d56a91e0d87930a54e34a6f6e04b4b849fe5369aeddb26e453dec92fe0`.
- Generated Governance declaration:
  `780749962674f89cbcfce88f9d89b65f64f91aca453fd84512f5856167160c02`.
- Command capability policy:
  `06a708b17d7e1bbfde4c385f3141b7c7cf6d05f6e763d1140e40d9df537df191`.
- Response capability policy:
  `ba2fd9220d1376a2b0af62a00dc710fe08f9b3bcbbab6a33001cef32ba7dad0f`.
- Enabled command families: `ClaimOrRefresh`, `Configure`, `DisburseMaturity`,
  `Follow`, `Merge`, `RefreshVotingPower`, `RegisterVote`, `SetFollowing`, `Spawn`,
  `Split`, and `StakeMaturity`; high-risk policy applies where recorded in the checked-in
  capability file.
- Unavailable command families: target-incompatible `Disburse` and
  `DisburseToNeuron`, nested `MakeProposal`, and upstream-removed `MergeMaturity`.

Production reproducibility-fixture hashes:

- Wasm, both clean builds:
  `479a4a9d0e07318d9ba7bb6ccaabd48bad996069cfe29968cde137d902607cd7`.
- Frontend tree, both clean builds:
  `8591b926ae1f1eef9d9e61827177a74c7c3bd9d88f0e8257e85ef3e49486551c`.
- Asset manifest:
  `5329b65f2176fb2c295e6a729889691a38d9e307a0866bf9f0f0a513182169dd`.
- Build configuration:
  `a8a4c643eacd4f5c491b761ba1897d16d71c14327582fecb3ab1f5808170b238`.
- Dendrite Rust SBOM:
  `6d6324860892c7a4da38049f0e4586e32a3eae7ec6fae781d2904d48ffe0eee1`.
- Governance fixture Rust SBOM:
  `9f614c547044b9f401b74205f3acb8625083209e7657a4428e941898a80ffa4e`.
- Types Rust SBOM:
  `6ff92ac11cff955a74b75012e4b79511ef83bd9e68297fb2cb4bf7b5a2dccbac`.
- IC clients Rust SBOM:
  `6d94772905f5a1860fa488e12509e38359d2e60b0c3323d63369379673031026`.
- npm SBOM:
  `02d8f3870f57f8a26b3430e15f9ef21983d777a3df3171530ac0b5fce0d961cf`.
- xtask Rust SBOM:
  `067f12c5db419c4251f43266854a5204aa623d3625996a8adbaed33543c5b66c`.

The canister remains stateless, anonymous, and limited to `check_neuron` and
`http_request`. Browser mutations use the one fixed Governance actor and immutable
review pipeline; no proposal, transaction, authority, delegation, or history data is
stored or sent to Dendrite. `simulate_manage_neuron` is absent because the pinned NNS
does not support these outer proposal workflows. Open proposals are fetched live and
discarded, and reward calculation/distribution remains out of scope.

The real Internet Identity popup/restoration/origin/targeted-delegation/live-manager
gate and the controlled transaction smoke procedure were not run in this noninteractive
environment. They remain explicit operator deployment gates in `deployment.md`. No
mainnet mutation, proposal, manager vote, or deployment is claimed.

## Transaction release-candidate hardening evidence — 2026-07-22

Starting from `e5276fef980bd4ef9594855e65fde42bc8fb1d1e`, this pass retained
the two-method anonymous canister and existing command policy while correcting
caller-sensitive proposal visibility, NNS-state voting gates, visible ballots,
legacy/modern stored targets, fresh preparation, controller-only final authority,
non-repeatable ambiguous outcomes, exact request-byte integrity, following forms,
receiver readiness, and transaction-IDL derivation.

`npm ci`, `npm test`, `npm run test:coverage`, production asset byte identity, `cargo
fmt --all -- --check`, warnings-denied workspace/all-target/all-feature Clippy, `cargo
xtask check`, configured `cargo xtask test`, `cargo xtask coverage`, all three PocketIC
scenarios, semantic anonymous and transaction interface drift, generated transaction-IDL
equality, production dependency reachability, `cargo xtask security-scan`, `cargo xtask
sbom`, configured `cargo xtask build`, configured `cargo xtask build-reproducible`, and
configured `cargo xtask verify-reproducible` exited successfully. Frontend coverage was
99.04% lines, 85.32% branches, and 92.31% functions; workspace Rust line coverage was
90.68%. The two clean builds were byte-identical.

Release-interface and capability hashes:

- Governance transaction Candid: `128c336a20726099636defddc507332b3d9555424cca970902a7dfcff04c7d77`.
- Generated Governance declaration: `985fe39067cc3b0e62d972585283d178b1662746355e437575c2eb847a53dd2c`.
- Command capability policy: `06a708b17d7e1bbfde4c385f3141b7c7cf6d05f6e763d1140e40d9df537df191`.
- Response capability policy: `ba2fd9220d1376a2b0af62a00dc710fe08f9b3bcbbab6a33001cef32ba7dad0f`.
- Fixed Governance principal and sole delegation target: `rrkah-fqaaa-aaaaa-aaaaq-cai`.

Production reproducibility-fixture hashes:

- Wasm, both clean builds: `987528203f88ee7eedfb3f0391dc959607e408861c147013b133a565d468e9e9`.
- Frontend tree, both clean builds: `65b8ec5ed7421b58ad615bfee5f3b8819a15425d7f39cf7622bed7692c687d09`.
- Asset manifest: `c29a9bad50050f7968e6911c0d5e67c7a7da1c512ef04044165743ea3f876dfc`.
- Build configuration: `a8a4c643eacd4f5c491b761ba1897d16d71c14327582fecb3ab1f5808170b238`.
- Dendrite Rust SBOM: `9f605655fb907fc6174ca6729bc874b7bc1fabb5daec1ff5590379ae7f9f25ce`.
- Governance fixture Rust SBOM: `43a183527f7bac126278c3fd998882582c218b2d1feaf7bfd9e53dca8f427aff`.
- Types Rust SBOM: `f8a104aab632c85034a0052c1a896d569ca3d415c4dfb3dd58d04fd83a246bff`.
- IC clients Rust SBOM: `233e2118b348dba525ad7d8db6957bff7dadb5310cf4a2d9dade2cbf45f2972e`.
- npm SBOM: `f0fcad7e468c5480d01269d88fee44c10f140bc51a1d483a9284c83c1680ab4b`.
- xtask Rust SBOM: `dec97cb4f0a81ccd4a8a4c01a060fd7bc1780c26ad6d659e71b72c489a649b9b`.

The real Internet Identity canonical/alternative-origin popup gate and controlled
transaction smoke gate were not run. They remain mandatory operator gates. No mainnet
mutation, deployment, proposal, or manager vote is claimed.

## Final transaction-coordination evidence — 2026-07-22

Starting from `4b0d318d28d60dc0c4d217df9a1a25ade01a2d40`, this pass made
mixed Open-proposal selection fail-soft, moved the transaction coordinator to page
application scope, separated direct mutation and proposal target identities, required
an explicit self-authenticating Spawn controller, deduplicated actionable managers
without changing raw audit evidence, and corrected authority wording. It added no
command, canister method, storage, retry, timer, framework, or background work.

`npm ci`, `npm test`, `npm run test:coverage`, production asset byte identity, `cargo
fmt --all -- --check`, warnings-denied workspace/all-target/all-feature Clippy, `cargo
xtask check`, configured `cargo xtask test`, all three PocketIC scenarios, `cargo xtask
coverage`, semantic anonymous/transaction interface drift, generated-IDL equality,
production dependency reachability, `cargo xtask security-scan`, `cargo xtask sbom`,
configured `cargo xtask build`, configured `cargo xtask build-reproducible`, and
configured `cargo xtask verify-reproducible` exited successfully. The 78 frontend tests
reached 99.48% lines, 87.81% branches, and 93.65% functions. Workspace Rust line
coverage was 90.68%. Two clean builds were byte-identical.

Current deterministic hashes:

- Transaction Candid: `128c336a20726099636defddc507332b3d9555424cca970902a7dfcff04c7d77`.
- Generated declaration: `985fe39067cc3b0e62d972585283d178b1662746355e437575c2eb847a53dd2c`.
- Command policy: `06a708b17d7e1bbfde4c385f3141b7c7cf6d05f6e763d1140e40d9df537df191`.
- Response policy: `ba2fd9220d1376a2b0af62a00dc710fe08f9b3bcbbab6a33001cef32ba7dad0f`.
- Wasm, both clean builds: `7534dcd8c14f49b5bee6673edfe78dd014b22ff8f367f9a0ea8de20b45853d6b`.
- Frontend tree, both clean builds: `51bd1c0b871dfccf4e895789ad10414203c9accb3b53bc943e173daf096da39b`.
- Asset manifest: `b14d15820e62f63fc3676116856f3baed0b0ab3a6f539a1c4b126bee4e62eda9`.
- Build configuration: `a8a4c643eacd4f5c491b761ba1897d16d71c14327582fecb3ab1f5808170b238`.
- Dendrite SBOM: `bc10ff58e812b6119324a519b396d4ba21311b433a586feb4e04c83139fda165`.
- Governance fixture SBOM: `7a8a513138b420838d060aa7375fb9e9c8f44f391608650dc36d4208defe1fd5`.
- Types SBOM: `ac02ef00758d2cf76ede13a2cfe6256b1c2f4251b4663ea7a18223e680857ddb`.
- IC clients SBOM: `89a72f0f5aac0ac434e08525db470e1ea3e5dd70bb796e39edf0e259451c58f3`.
- npm SBOM: `660211f3768ec1c7d3e8399b5855a590ba6b3c6868bf14377989b52745778f2c`.
- xtask SBOM: `7cce12d272d13110205aa240dd555a0b94915854c3aa9495351290bd4cd81769`.

The real Internet Identity canonical/alternative-origin popup test and controlled
transaction smoke test were not run. They remain the two mandatory operator gates. No
mainnet mutation, proposal, vote, deployment, or operator-gate success is claimed.

## Final browser-lifecycle and transaction-concurrency evidence — 2026-07-23

Starting from `620e6a7876dda73ec36cec2b582e412b2c56e809`, this correction
pass serialized asynchronous review preparation, made anonymous route loads
generation-safe, settled transactions against the current route, retained bounded
heap-only unresolved-outcome coordination until explicit acknowledgment, prepared
voting-power refresh review evidence from the fresh pipeline report, and retained the
validated actor/session on failed sign-out. It added no command, canister method,
storage, retry, timer, framework, crate, canister, or background work.

The implementation through `dc743c6` passed `git status`, `cargo fmt --all -- --check`,
warnings-denied workspace/all-target/all-feature Clippy, `cargo xtask check`,
configured `cargo xtask test`, all three PocketIC scenarios, `cargo xtask coverage`,
both semantic interface drift checks, generated transaction-IDL equality, `npm ci`,
`npm test`, `npm run test:coverage`, repeated production asset byte identity,
production dependency reachability, `cargo xtask security-scan`, `cargo xtask sbom`,
configured `cargo xtask build`, configured `cargo xtask build-reproducible`, and
configured `cargo xtask verify-reproducible`. The 86 frontend tests reached 98.88%
lines, 87.85% branches, and 92.16% functions. Workspace Rust line coverage was 90.68%.
Certified HTTP, alternative-origin assets/headers, anonymous upgrade behavior, and the
exact transaction nesting remained covered by the passing PocketIC/frontend suites.
Two clean builds were byte-identical.

Reproducibility inputs were fixture canister ID
`v27v7-7x777-77774-qaaha-cai`, API host `https://icp-api.io`, root-key fetching
disabled, canonical derivation origin `https://dendrite.example`, empty alternative
origins, fixed provider `https://id.ai/authorize`, delegation TTL
`28800000000000` nanoseconds, and `SOURCE_DATE_EPOCH=0`.

Current deterministic hashes:

- Transaction Candid: `128c336a20726099636defddc507332b3d9555424cca970902a7dfcff04c7d77`.
- Generated declaration: `985fe39067cc3b0e62d972585283d178b1662746355e437575c2eb847a53dd2c`.
- Command policy: `06a708b17d7e1bbfde4c385f3141b7c7cf6d05f6e763d1140e40d9df537df191`.
- Response policy: `ba2fd9220d1376a2b0af62a00dc710fe08f9b3bcbbab6a33001cef32ba7dad0f`.
- Wasm, both clean builds: `473bcbdbed1d0de74be1fecc39e84e7f9e3debcaf0663b75377bb750a9936a0d`.
- Frontend tree, both clean builds: `767c1198c9d7c98c7fd1d61bf7a5262f1aa7da0886dbb8d6b560b0832cf4d37a`.
- Asset manifest: `7b2d172395eeff4d18c3de12d294e28c2f10f84d1b9693d18b44bc379d01dab2`.
- Build configuration: `a8a4c643eacd4f5c491b761ba1897d16d71c14327582fecb3ab1f5808170b238`.
- Dendrite SBOM: `94f26c6d4507d645339e2f762ed6bc574fe3ba42828d2d2a1edc685184f4d225`.
- Governance fixture SBOM: `62fe8adaeef2d2a4e88fa3c911935222c94cf820faf5f6811a59d5f6e74d1213`.
- Types SBOM: `71ea93e54c48623242e4386f82b9387e9b9c7bf775535fb3b506d93e259b1da5`.
- IC clients SBOM: `a1c6c600001c6dc9eaa64cbefb839a453b8658e87786c055262e600e1f807135`.
- npm SBOM: `35407f137efd048ca32b4d64ab386200c6f9dda9ada2fe0e7014a5f531a5a550`.
- xtask SBOM: `8a442d37937ae89808868c81721787a17c0b782f49eca4e12a563d190e392b81`.

The existing narrowly documented `backoff`, `instant`, `paste`, and `serde_cbor`
exceptions remain unchanged; production reachability still excludes PocketIC,
`backoff`, and `instant`, and no new exception was added.

The real Internet Identity canonical/alternative-origin popup test and controlled
transaction smoke test were not run. They remain the two mandatory operator gates
after this correction pass. No mainnet mutation, proposal, vote, deployment, or
operator-gate success is claimed.

## Final route-ownership and authentication-transition evidence — 2026-07-23

Starting from `74318417c61050bd55e7e14c435246efecb31ab8`, this correction
pass separated selected-route rerendering from landing navigation and added one
application-local authentication-transition guard. Transaction settlement and
authentication completion now preserve newer loading/error routes; sign-out
synchronously cancels preparing/ready work and denies detached controls access to the
targeted session or fixed Governance actor until the transition settles. Failed
sign-out retains the validated principal/session/actor but never revives the cancelled
review. Unresolved outcomes remain intact. No command, canister method, storage, retry,
timer, router, framework, crate, canister, or background work was added.

The implementation through `7d66aaa` passed `git status`, `cargo fmt --all --
--check`, warnings-denied workspace/all-target/all-feature Clippy, `cargo xtask check`,
configured `cargo xtask test`, all three PocketIC scenarios, `cargo xtask coverage`,
anonymous-verifier and transaction-interface semantic drift, generated
transaction-IDL equality, `npm ci`, `npm test`, `npm run test:coverage`, repeated
production asset byte identity, certified HTTP and alternative-origin checks,
production dependency reachability, `cargo xtask security-scan`, `cargo xtask sbom`,
configured `cargo xtask build`, configured `cargo xtask build-reproducible`, and
configured `cargo xtask verify-reproducible`. The 90 frontend tests reached 98.90%
lines, 87.79% branches, and 92.19% functions. Workspace Rust line coverage was 90.68%.
Two clean builds were byte-identical.

Reproducibility inputs were fixture canister ID
`v27v7-7x777-77774-qaaha-cai`, API host `https://icp-api.io`, root-key fetching
disabled, canonical derivation origin `https://dendrite.example`, empty alternative
origins, fixed provider `https://id.ai/authorize`, delegation TTL
`28800000000000` nanoseconds, and `SOURCE_DATE_EPOCH=0`.

Current deterministic hashes:

- Transaction Candid: `128c336a20726099636defddc507332b3d9555424cca970902a7dfcff04c7d77`.
- Generated declaration: `985fe39067cc3b0e62d972585283d178b1662746355e437575c2eb847a53dd2c`.
- Command policy: `06a708b17d7e1bbfde4c385f3141b7c7cf6d05f6e763d1140e40d9df537df191`.
- Response policy: `ba2fd9220d1376a2b0af62a00dc710fe08f9b3bcbbab6a33001cef32ba7dad0f`.
- Wasm, both clean builds: `022122f7c2ae48afb72977cf4e9ab52f7bd0467bfb558eb0a64e734d88a07434`.
- Frontend tree, both clean builds: `25de76dd5f86eb40c509bdf183a20b1f2d252b4871a097efbeb7d0927a36776d`.
- Asset manifest: `7a70184e6ba1f5e873f25844cbbb7956a38d027799ea0b16d1a95d48ba14b490`.
- Build configuration: `a8a4c643eacd4f5c491b761ba1897d16d71c14327582fecb3ab1f5808170b238`.
- Dendrite SBOM: `ed57353b909df37fa66d4b45eb45164bf599e4083b6cb04c5fe70c7d200cc246`.
- Governance fixture SBOM: `cc023e316c90ac96d2da7778f4a4379587e1f5ac1344468a0e5d06e7bd491ebd`.
- Types SBOM: `76e643fb6f6c57836efb2af853c7fc9f23cf42f293c92113511662aa47108a58`.
- IC clients SBOM: `05ee608afc4ba9b7a17fc75b295f0aeeb27b79704a10c3a8bd6d4b625a95cef2`.
- npm SBOM: `af13f8b681e5689fe1af5bb456f2a4bce6e50c0398cb6d4275d62dc98d2ac7be`.
- xtask SBOM: `4c120680c4e5865ac0fd383669f7830040c56562ab42f82e5c149ddf1319bf11`.

The existing narrowly documented `backoff`, `instant`, `paste`, and `serde_cbor`
exceptions remain unchanged; no new exception was added.

The real Internet Identity canonical/alternative-origin popup test and controlled
transaction smoke test were not run. They remain the two mandatory operator gates
after this correction. No mainnet mutation, proposal, vote, deployment, or
operator-gate success is claimed.

## Final transaction-preflight semantics evidence — 2026-07-24

Starting from `541afdaa5b65392b5cdf6255bcd88e20d6d666ed`, this correction
keeps RefreshVotingPower final preflight live while allowing ordinary NNS snapshot,
refresh-age, and voting-power progression. The stable operation fingerprint now binds
the command and reviewed target refresh timestamp; a changed refresh timestamp or
missing, negative, or contradictory evidence still invalidates the review before any
update. Reward-receiver review and final preflight now require and bind the exact
receiver controller plus the sorted, deduplicated hotkey set. Stake remains
informational. No workflow, canister method, state, history, retry, poll, timer,
framework, crate, canister, arbitrary call capability, or background work was added.

The implementation through `a3ec244`, plus regenerated certified assets and this
documentation, passed initial and final `git status`, `npm ci`, all 98 frontend tests,
frontend coverage, `cargo fmt --all -- --check`, warnings-denied
workspace/all-target/all-feature Clippy, `cargo xtask check`, configured `cargo xtask
test`, all three PocketIC scenarios, `cargo xtask coverage`, anonymous-verifier and
transaction-interface semantic drift, generated transaction-IDL equality, repeated
production asset byte identity, certified HTTP and alternative-origin checks,
production dependency reachability, `cargo xtask security-scan`, `cargo xtask sbom`,
configured `cargo xtask build`, configured `cargo xtask build-reproducible`, and
configured `cargo xtask verify-reproducible`. Frontend coverage was 99.13% lines,
88.26% branches, and 93.41% functions. Workspace Rust line coverage was 90.68%. Two
clean Wasm and frontend builds were byte-identical.

Reproducibility inputs were fixture canister ID
`v27v7-7x777-77774-qaaha-cai`, API host `https://icp-api.io`, root-key fetching
disabled, canonical derivation origin `https://dendrite.example`, empty alternative
origins, fixed provider `https://id.ai/authorize`, delegation TTL
`28800000000000` nanoseconds, `DFX_IDENTITY=codex_local` for IC tests, and
`SOURCE_DATE_EPOCH=0`.

Current deterministic hashes:

- Transaction Candid: `128c336a20726099636defddc507332b3d9555424cca970902a7dfcff04c7d77`.
- Generated declaration: `985fe39067cc3b0e62d972585283d178b1662746355e437575c2eb847a53dd2c`.
- Command policy: `06a708b17d7e1bbfde4c385f3141b7c7cf6d05f6e763d1140e40d9df537df191`.
- Response policy: `ba2fd9220d1376a2b0af62a00dc710fe08f9b3bcbbab6a33001cef32ba7dad0f`.
- Wasm, both clean builds: `dd335738b09f66287075b9814c918a048530be37a412914f0dbcae785c39f633`.
- Frontend tree, both clean builds: `e0fab32eb4b6b3b867c5ddb5eac71a7f83cfbd13bfd61264a5969093d750217a`.
- Asset manifest: `64ff2ade4cc2e910cbe33bca6e1c6cc7f8de6c385822eabfb326c7adde666ea9`.
- Build configuration: `a8a4c643eacd4f5c491b761ba1897d16d71c14327582fecb3ab1f5808170b238`.
- Dendrite SBOM: `381374b432e90814a96eb608dead91c642acd3f6aa283a6bc8d748f2a0a441f4`.
- Governance fixture SBOM: `4139b23a2beea47a7da139c5306ef21b7536c28a0eda8bd5404ef951e766b119`.
- Types SBOM: `9867eacd95ce7c71df57418fb78bef2b295b0e79de53914c8ccce706467cbf62`.
- IC clients SBOM: `3ead0b7f96de29f83a0624cd21683bb101122d8df81c166e1e09daf03cfe4e62`.
- npm SBOM: `fd73169f9232fc6c0b7595e53e659f102eff5f5864441d574016fb3dd1433fa7`.
- xtask SBOM: `ce61f732a7f36ba357088d6bc64a5b93b5c66fdff3dde627f9d8021af4807dd4`.

The public Candid API remains update `check_neuron : (nat64) -> (CheckResult)` and
certified query `http_request`. Production reachability still excludes PocketIC,
`backoff`, and `instant`; the existing narrowly documented `backoff`, `instant`,
`paste`, and `serde_cbor` exceptions remain unchanged.

The real Internet Identity canonical/alternative-origin popup test and controlled
transaction smoke test were not run. They remain the two mandatory operator gates
after this correction. No mainnet mutation, proposal, vote, deployment, or
operator-gate success is claimed.

## Final transaction-receipt and post-settlement evidence — 2026-07-24

Starting from `58d02801d8a8e6b1d0f606f9d07ac1d18f815524`, this correction
added one bounded, heap-only current known transaction receipt at application scope.
It is not transaction history, is never persisted or sent to Dendrite, and is lost on
reload. Structured success, explicit Governance rejection, and final-preflight
outcomes now survive application rerenders. Proposal IDs and dashboard links remain
visible after report refresh. A successful transaction on the selected context neuron
always starts one newer post-response anonymous live check generation, while
settlement on landing or another neuron never navigates or replaces that route. No
canister method, stable state, cache, history, retry, poll, timer, framework, crate,
canister, arbitrary call capability, or background work was added.

The implementation and tests through `8eb0ba6`, plus the generated assets and
documentation recorded by the final documentation commit, passed `git status`, `npm
ci`, all 94 frontend tests, frontend coverage, `cargo fmt --all -- --check`, explicit
warnings-denied workspace/all-target/all-feature Clippy, `cargo xtask check`,
configured `cargo xtask test`, all three PocketIC scenarios, `cargo xtask coverage`,
anonymous-verifier and transaction-interface semantic drift, generated
transaction-IDL equality, production asset byte identity, certified HTTP and
alternative-origin checks, production dependency reachability, `cargo xtask
security-scan`, `cargo xtask sbom`, configured `cargo xtask build`, configured `cargo
xtask build-reproducible`, and configured `cargo xtask verify-reproducible`.
Frontend coverage was 99.12% lines, 88.06% branches, and 93.07% functions. Workspace
Rust line coverage was 90.68%. The clean Wasm and frontend builds were byte-identical.

Reproducibility inputs were fixture canister ID
`v27v7-7x777-77774-qaaha-cai`, API host `https://icp-api.io`, root-key fetching
disabled, canonical derivation origin `https://dendrite.example`, empty alternative
origins, fixed provider `https://id.ai/authorize`, delegation TTL
`28800000000000` nanoseconds, and `SOURCE_DATE_EPOCH=0`.

Current deterministic hashes:

- Transaction Candid: `128c336a20726099636defddc507332b3d9555424cca970902a7dfcff04c7d77`.
- Generated declaration: `985fe39067cc3b0e62d972585283d178b1662746355e437575c2eb847a53dd2c`.
- Command policy: `06a708b17d7e1bbfde4c385f3141b7c7cf6d05f6e763d1140e40d9df537df191`.
- Response policy: `ba2fd9220d1376a2b0af62a00dc710fe08f9b3bcbbab6a33001cef32ba7dad0f`.
- Wasm, both clean builds: `823bff48c50eb458c8329b301bd494208f211cc36887f6206f39db087dc09aa3`.
- Frontend tree, both clean builds: `ea7a54e0ca82cf93929e71aed00834b6b966f93fc0a4815b987663173477c56b`.
- Asset manifest: `2dce81c930d5638292f6701772d78ebb3ad1c576ad89e424346aeede224b7fb4`.
- Build configuration: `a8a4c643eacd4f5c491b761ba1897d16d71c14327582fecb3ab1f5808170b238`.
- Dendrite SBOM: `df25866f75ba99f3dbf85cfbf815ae5a658ccf79d8531282622f56baed054f10`.
- Governance fixture SBOM: `645748cf1301e9862ff63d62f430970d10b49f981173a3951645a59870b065e8`.
- Types SBOM: `fcd863e83470c856d901f564c881f00ed159ecc22d98370d315c05411d9058d8`.
- IC clients SBOM: `be5c082c36d33b9bfb58916a87555bf374da533aecba66b994e9a1908895dcae`.
- npm SBOM: `b3bbe23a7fafd0489d3c39c57e625209a5cb27aefb8e770d706eb03040e1fce8`.
- xtask SBOM: `78a5162f5ec710d44b91ff0616f8a7471958ac19b166d39fe72f0203fc3c6623`.

The public Candid API remains update `check_neuron : (nat64) -> (CheckResult)` and
certified query `http_request`. Canister outbound calls remain fixed to NNS Governance
`list_neurons` and management `canister_info` at source revision
`d55a0f4d4edfabe49d8fd543aff473084cb741f2`. Production reachability still excludes
PocketIC, `backoff`, and `instant`; the existing narrowly documented `backoff`,
`instant`, `paste`, and `serde_cbor` exceptions remain unchanged.

The real Internet Identity canonical/alternative-origin popup test and controlled
transaction smoke test were not run. They remain the two mandatory operator gates
after this correction. No mainnet mutation, proposal, vote, deployment, or
operator-gate success is claimed.
