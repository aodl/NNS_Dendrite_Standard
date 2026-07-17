# Anonymous verifier tranche implementation plan

This checklist tracks production behaviour required for the anonymous verifier tranche. The repository began this tranche as a partial scaffold: it had a small pure-rule prototype, draft Candid files, a heap-only cache, a placeholder live refresh, prebuilt static files that were not embedded or certified, and experimental frontend proposal helpers. A checked item means the production behaviour and its focused tests are complete; the existence of scaffold code alone does not qualify.

## 0. Preserve and baseline

- [x] Read `AGENTS.md` and `DENDRITE_BUILD_SPEC.md` completely.
- [x] Inspect Git status, branch, recent history, and remotes; preserve the untracked `CODEX_START_PROMPT.md`.
- [x] Confirm `origin` is `https://github.com/aodl/NNS_Dendrite_Standard.git`.
- [x] Record exact local tool versions and establish a passing baseline (`rustc/cargo 1.94.1`, Node `24.15.0`, npm `11.12.1`, dfx `0.27.0`; initial Rust and frontend tests pass).

## 1. Exact fixed external interfaces

- [x] Verify one immutable official `dfinity/ic` revision and use it everywhere.
- [x] Rebuild the minimal Governance and management Candid subsets from that revision, including real committed-topic variants and `canister_info` service shape.
- [x] Add fixed-destination, method-specific typed Rust clients with bounded conversion and errors.
- [x] Replace grep drift checks with structural compatibility checks; prove incompatible fixtures fail.
- [x] Add representative decode tests and commit this checkpoint separately.

## 2. Complete pure standard engine

- [ ] Split topics, bounds, evidence, results, rules, digest, and fixture helpers into reviewable modules.
- [x] Implement every mandatory stable rule ID with exhaustive non-short-circuit output.
- [x] Distinguish factual failure, indeterminate evidence, and standard-update-required semantics.
- [x] Preserve raw manager/delegate lists and provide bounded snapshot summaries and provenance.
- [x] Canonically hash normalized evidence, configuration, provenance, and complete output.
- [x] Add compliant and focused mutation fixtures; meet the specified pure-engine coverage floor. (The pure engine passes at 99.30% regions, 98.94% lines, and 98.94% branches using the separately pinned coverage-only nightly; whole-workspace stable line coverage remains below 85%.)
- [x] Commit this checkpoint separately.

## 3. Live bounded evidence collection

- [x] Implement the shared deterministic collector pipeline and fake-client seams.
- [x] Implement production fixed-destination Governance/economics/controller collection.
- [x] Detect rejections, missing/contradictory records, unknown variants, and bounds violations.
- [x] Replace the production placeholder in `refresh_compliance` with the real pipeline.
- [x] Add integration tests for compliant, defective, rejected, incomplete, unknown, and oversized graphs.
- [x] Commit this checkpoint separately.

## 4. Stable bounded cache and abuse controls

- [x] Replace the heap map with versioned `ic-stable-structures` state capped at 256 snapshots.
- [ ] Implement deterministic eviction, record bounds, migrations, and upgrade tests. (Cap, deterministic eviction, schema metadata, malformed/unsupported-schema rejection, and same-memory reopen are tested; a future-version migration fixture and PocketIC upgrade remain.)
- [x] Implement cooldown, global rate limiting, in-flight deduplication, concurrency and cycle-reserve checks.
- [x] Persist intended counters/configuration; remove proposal-history runtime flags/state.
- [ ] Test fresh/stale/explicit refresh, all rejection paths, eviction, migration, and upgrades.
- [x] Commit this checkpoint separately.

## 5. Embedded certified frontend

- [x] Deterministically build content-hashed frontend assets before Wasm compilation.
- [x] Embed and serve assets from the sole `dendrite` Rust canister.
- [x] Implement certified GET/HEAD, SPA/404 routing, MIME/cache policy, ETags, and security headers.
- [x] Add `http_request` to exported/checked-in Candid and test certification witnesses/body hashes.
- [x] Commit this checkpoint separately.

## 6. Functional anonymous neuron page

- [x] Generate/check declarations and create an anonymous Dendrite actor.
- [x] Implement canonical-string routing, cache-first load, live/explicit refresh, and typed errors.
- [x] Render complete snapshot evidence and every rule using text-safe DOM APIs and safe URLs.
- [x] Add accessibility, stale provenance, XSS, precision, behavior, and coverage tests.
- [x] Isolate misleading experimental authenticated/proposal helpers from the production UI and make deferral explicit.
- [x] Commit this checkpoint separately.

## 7. Release verification and reviewer/operator material

- [ ] Add deterministic PocketIC coverage for API, outbound constraints, cache/upgrade, and certified HTTP.
- [x] Enforce Candid equality, semantic interface drift, Rust/frontend coverage, and strict checks.
- [x] Repair clean two-build reproducibility outside `target/`; add digest-pinned `Dockerfile.repro`.
- [x] Complete security scans, whole-workspace/frontend SBOMs, and source/artifact traceability.
- [x] Complete architecture, security, development, deployment, upgrade, setup, and limitation docs.
- [ ] Run every required command without suppressing failures and record exact hashes/results.
- [x] Confirm no proposal history, timers, generic outbound proxy, delegation custody, or JS `number` conversion exists.
- [x] Explicitly document Internet Identity, authority recognition, onboarding, and the authenticated control panel as incomplete next-tranche work.
- [ ] Commit final hardening/documentation separately.
