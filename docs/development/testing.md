# Testing

Build commands use the production values from [deployment](../operations/deployment.md). Local
replica commands additionally use `DFX_IDENTITY=codex_local`, a local API/provider,
and root-key fetching `true`; production commands require root-key fetching `false`.

| Layer | Command | Network | Writes state? | Automated or manual | Purpose | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend unit | `npm test` | None | Files in temp only | Automated | Preliminary query/validation/evaluator/state/UI, identity, transaction rules | Passing tests |
| Frontend coverage | `npm run test:coverage` | None | Coverage output | Automated | 85% thresholds | Coverage summary |
| Rust unit/workspace | `cargo test --workspace --locked` | None | Build files | Automated | Rules and collector | Passing tests |
| Complete suite/PocketIC | `cargo xtask test` | Local PocketIC | Local only | Automated | Live graphs, rejection, certified HTTP/upgrade | Passing scenarios |
| Rust coverage | `cargo xtask coverage` | None | Coverage output | Automated | Workspace >85%, engine >95% | Coverage summary |
| Interface drift | `tools/scripts/check-interface-drift.sh` | Pinned GitHub source | No IC state | Automated | Canister read subset, separate anonymous browser query declaration, transaction Candid semantics, generated IDL equality | Pinned revision pass |
| Certified HTTP/alternatives | `cargo xtask test` | PocketIC | Local only | Automated | Headers and exact well-known bytes | Assertions pass |
| Production asset identity | `npm test` | None | Temp only | Automated | Checked-in assets unchanged by tests | Tree hash equality |
| Dependency reachability | `tools/scripts/check-production-dependencies.sh` | Registry metadata | No IC state | Automated | Exclude PocketIC packages from Wasm | Tree report |
| Security scan | `cargo xtask security-scan` | Public registries/GitHub | No IC state | Automated | Advisories, policy, drift, secrets | No unapproved finding |
| SBOM | `cargo xtask sbom` | None | `dist/sbom` | Automated | CycloneDX evidence | SBOM hashes |
| Configured local build | `cargo xtask build` | None | Build output | Automated | Current toolchain build | Wasm |
| Local packaged build | `cargo xtask build-reproducible` | Public registries | Build output | Automated | Same-toolchain package | Local hashes |
| Local two-build | `cargo xtask verify-reproducible` | Public registries | Build output | Automated | Same-toolchain determinism | Byte equality |
| Canonical Docker | `tools/scripts/docker-build-release.sh` | Public registries | `dist/release` | Automated | Public release artifact | `SHA256SUMS` |
| Canonical two-build | `tools/scripts/verify-docker-reproducible.sh` | Public registries | Temp only | Automated | Two no-cache builds | Tree equality |
| Deployment dry-run | `tools/scripts/mainnet-deploy.sh dry-run` | Read-only mainnet | No | Automated/operator review | Validate exact lifecycle command | “no write performed” |
| Local II popup | Gate 1 with labelled local origin | Local | Browser session only | Manual | Popup mechanics | Signed local evidence |
| Final-origin II | Gate 1 | Mainnet HTTP/II | Browser session only | Manual | Production principal/origin | Signed gate |
| Controlled transaction | Gate 2 | Controlled NNS context | Yes, explicitly controlled | Manual | Full browser-to-NNS flow | Signed gate |

The Rust unit suite deterministically regenerates
`canisters/dendrite/web/test/fixtures/evaluator.json`. Its 32 cases record Rust overall
status, quorum and every rule status with stable names and timestamps. Frontend tests
apply the same named mutations to BigInt-safe browser evidence and require exact
policy-field equality. The cases cover compliant, missing/unavailable/contradictory
evidence, target posture, manager cardinality and availability, anchor/default/committed
following, quorum, controller evidence, source failures, and standard-update semantics.

Frontend state tests separately prove that route entry calls Governance without calling
Dendrite, controller-dependent preliminary rules cannot pass, explicit verification
calls Dendrite once, bounded verifier errors retain preliminary evidence, and
authenticated transaction controls require a current authoritative report. Existing
transaction tests continue to prove that final preflight independently invokes
`check_neuron` and a failed preflight sends no Governance mutation.

### Troubleshooting

- Missing ID/origin or malformed alternative JSON: export every exact build input.
- Wrong Node/npm: select Node 24.15.0 and npm 11.12.1.
- Missing fixture Wasm: run `cargo xtask test`, which builds fixtures first.
- Docker/buildx unavailable: restore daemon access/buildx; do not substitute a local
  artifact as canonical.
- `icp-cli` identity mismatch: stop and select the reviewed production identity; never
  export identity material.
- Registry failure: retry only the build after registry recovery.
- Stale generated assets: rerun the configured frontend build and byte-identity tests.
- Dirty worktree: commit/review intended changes; the deploy guard intentionally fails.
- Release hash mismatch: rebuild canonically, regenerate `SHA256SUMS`, then update
  `icp.yaml`.
