# Aggressive simplification implementation plan

This plan replaces the completed cache-oriented tranche. Net deletion and a smaller
auditable surface are explicit success criteria.

## 1. Governing design

- [x] Inspect Git history, branch, status, and remote; preserve `CODEX_START_PROMPT.md`.
- [x] Rewrite `AGENTS.md` and `DENDRITE_BUILD_SPEC.md` around a live, stateless verifier.
- [x] Reconcile existing standard, architecture, security, testing, build, deployment,
  upgrade, and operator documents.
- [x] Commit as `docs: simplify Dendrite architecture`.

## 2. Stateless canister

- [x] Remove stable snapshots, migrations, metadata, counters, digest encoding, stale
  fields, cache APIs, and now-unused dependencies.
- [x] Replace abuse controls with a two-concurrent, same-neuron, global-window,
  fixed-cycle-reserve heap guard that resets on upgrade.
- [x] Export only update `check_neuron` and query `http_request`.
- [x] Commit as `refactor: remove compliance cache and stable state`.

## 3. Live evidence and report

- [x] Reduce the client boundary to `list_neurons(ids)` and
  `canister_info(controller)` with fixed production destinations.
- [x] Remove catalogue and economics calls; use `known_neuron_data`, the pinned maximum
  dissolve delay, and the six-month threshold.
- [x] Implement target-first early exit and dependency batches of at most 50 with a
  hard maximum of 257 unique dependencies.
- [x] Preserve raw vectors; detect duplicate topic keys, duplicate/unexpected records,
  contradictions, and omissions with the specified semantics.
- [x] Commit live collection and explicit report-model simplification separately.

## 4. Certified assets and frontend

- [x] Replace custom certification with the official HTTP v2 `AssetRouter` pattern.
- [x] Serve only the required deterministic routes and security headers.
- [x] Replace cache-first UI with one live `check_neuron(BigInt(id))` flow.
- [x] Use deterministic build-time canister configuration for custom domains.
- [x] Delete `authority.js`, `proposals.js`, and `rewards.js`.
- [x] Commit certification and frontend simplification separately.

## 5. Tests and release evidence

- [x] Add focused pure/collector tests, 50/51/>100 batching, omission semantics, exact
  call recording, and omega-reject precision.
- [x] Add compliant/non-compliant/rejected PocketIC paths, real controller inspection,
  certified landing page, and upgrade asset coverage.
- [x] Raise workspace Rust line coverage above 85% and retain frontend thresholds.
- [x] Prove PocketIC-only packages absent from the production dependency tree and add
  narrow documented dev/test exceptions.
- [x] Run the complete required verification suite with `--locked` Cargo dispatch.
- [x] Record artifact, frontend, SBOM, and both reproducible-build hashes and byte
  identity in existing release/operator documentation.

## 6. Release-candidate corrections

- [x] Correct the pinned NNS day/year/month arithmetic, maximum dissolve delay, and
  six-month refresh threshold everywhere, with exact boundary tests.
- [x] Replace redundant dependency evidence with per-neuron `Found`,
  `ConfirmedMissing`, and `Unavailable` lookup states and bounded failures carrying
  affected neuron IDs.
- [x] Validate each 1--50 ID `list_neurons` response atomically, including page count,
  IDs, duplicates, topic keys, pinned collection bounds, and stake arithmetic.
- [x] Align known-neuron byte/link bounds and committed-topic interpretation with the
  pinned source while ignoring dependency committed-topic variants.
- [x] Correct `KNOWN-003`, `KNOWN-004`, manager, alpha/omega, topic-local delegate, and
  evidence-integrity rule semantics without broad post-processing.
- [x] Make the heap-only in-flight guard prune abandoned entries by a documented
  maximum age, retaining duplicate, concurrency, start-window, and cycle limits.
- [x] Require and validate an explicit frontend canister ID, embed the reviewed API
  host and root-key policy, and make local and reproducible builds deterministic.
- [x] Render controller blackhole evidence, topic labels, and readable plus raw check
  timestamps without adding application scope.
- [x] Split the two-line frontend bootstrap from a dependency-injectable application
  module and cover every production frontend file and live route state.
- [x] Add focused collector and PocketIC regressions for omission versus unavailable
  evidence, atomic invalid batches, topic-local availability, graph batching, and
  exact omega-reject precision.
- [x] Run every mandatory check with explicit deployment inputs, supersede the
  2026-07-19 evidence, and record new configuration, versions, coverage, scan, SBOM,
  Wasm/frontend/manifest, and byte-identical clean-build hashes.

## 7. Final anonymous-verifier correction pass

- [ ] Distinguish genuinely empty, known-invalid, and future unknown committed-topic
  vectors; keep defensive wire-entry bounds separate from the recognised semantic
  domain.
- [ ] Derive the dependency limit from all 18 recognised topic lists and the pinned
  15-followee limit, and evaluate every graph that can exist under those rules.
- [ ] Calculate the displayed Neuron Management quorum from distinct ballot IDs while
  retaining the raw manager vector for duplicate-rule evaluation.
- [ ] Restrict frontend API hosts to the fixed production gateway and explicit local
  replica origins, with one assertion tying accepted origins to certified CSP.
- [ ] Render failed controller inspection as unavailable evidence and make ordinary
  frontend failures informative and actor creation retryable.
- [ ] Isolate frontend build-test output in temporary directories and prove the
  checked-in production assets remain byte-identical across the suite.
- [ ] Separate local functional verification from the production reproducibility
  fixture, regenerate hashes for their exact configurations, and retain prior hashes
  as accurately labelled historical evidence.
- [ ] Run every mandatory format, Clippy, interface, unit, PocketIC, frontend,
  coverage, dependency, scan, SBOM, build, and reproducibility check without adding
  identity, governance-control, storage, cache, timer, or service scope.
