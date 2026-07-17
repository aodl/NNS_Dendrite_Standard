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
- [ ] Implement every mandatory stable rule ID with exhaustive non-short-circuit output.
- [ ] Distinguish factual failure, indeterminate evidence, and standard-update-required semantics.
- [ ] Preserve raw manager/delegate lists and provide bounded snapshot summaries and provenance.
- [ ] Canonically hash normalized evidence, configuration, provenance, and complete output.
- [ ] Add compliant and focused mutation fixtures; meet the specified coverage floor.
- [ ] Commit this checkpoint separately.

## 3. Live bounded evidence collection

- [ ] Implement the shared deterministic collector pipeline and fake-client seams.
- [ ] Implement production fixed-destination Governance/economics/controller collection.
- [ ] Detect rejections, missing/contradictory records, unknown variants, and bounds violations.
- [ ] Replace the production placeholder in `refresh_compliance` with the real pipeline.
- [ ] Add integration tests for compliant, defective, rejected, incomplete, unknown, and oversized graphs.
- [ ] Commit this checkpoint separately.

## 4. Stable bounded cache and abuse controls

- [ ] Replace the heap map with versioned `ic-stable-structures` state capped at 256 snapshots.
- [ ] Implement deterministic eviction, record bounds, migrations, and upgrade tests.
- [ ] Implement cooldown, global rate limiting, in-flight deduplication, concurrency and cycle-reserve checks.
- [ ] Persist intended counters/configuration; remove proposal-history runtime flags/state.
- [ ] Test fresh/stale/explicit refresh, all rejection paths, eviction, migration, and upgrades.
- [ ] Commit this checkpoint separately.

## 5. Embedded certified frontend

- [ ] Deterministically build content-hashed frontend assets before Wasm compilation.
- [ ] Embed and serve assets from the sole `dendrite` Rust canister.
- [ ] Implement certified GET/HEAD, SPA/404 routing, MIME/cache policy, ETags, and security headers.
- [ ] Add `http_request` to exported/checked-in Candid and test certification witnesses/body hashes.
- [ ] Commit this checkpoint separately.

## 6. Functional anonymous neuron page

- [ ] Generate/check declarations and create an anonymous Dendrite actor.
- [ ] Implement canonical-string routing, cache-first load, live/explicit refresh, and typed errors.
- [ ] Render complete snapshot evidence and every rule using text-safe DOM APIs and safe URLs.
- [ ] Add accessibility, stale provenance, XSS, precision, behavior, and coverage tests.
- [ ] Isolate/remove misleading experimental authenticated/proposal UI; make deferral explicit.
- [ ] Commit this checkpoint separately.

## 7. Release verification and reviewer/operator material

- [ ] Add deterministic PocketIC coverage for API, outbound constraints, cache/upgrade, and certified HTTP.
- [ ] Enforce Candid equality, semantic interface drift, Rust/frontend coverage, and strict checks.
- [ ] Repair clean two-build reproducibility outside `target/`; add digest-pinned `Dockerfile.repro`.
- [ ] Complete security scans, whole-workspace/frontend SBOMs, and source/artifact traceability.
- [ ] Complete architecture, security, development, deployment, upgrade, setup, and limitation docs.
- [ ] Run every required command without suppressing failures and record exact hashes/results.
- [ ] Confirm no proposal history, timers, generic outbound proxy, delegation custody, or JS `number` conversion exists.
- [ ] Explicitly document Internet Identity, authority recognition, onboarding, and the authenticated control panel as incomplete next-tranche work.
- [ ] Commit final hardening/documentation separately.
