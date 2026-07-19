# Aggressive simplification implementation plan

This plan replaces the completed cache-oriented tranche. Net deletion and a smaller
auditable surface are explicit success criteria.

## 1. Governing design

- [x] Inspect Git history, branch, status, and remote; preserve `CODEX_START_PROMPT.md`.
- [x] Rewrite `AGENTS.md` and `DENDRITE_BUILD_SPEC.md` around a live, stateless verifier.
- [ ] Reconcile existing standard, architecture, security, testing, build, deployment,
  upgrade, and operator documents.
- [ ] Commit as `docs: simplify Dendrite architecture`.

## 2. Stateless canister

- [ ] Remove stable snapshots, migrations, metadata, counters, digest encoding, stale
  fields, cache APIs, and now-unused dependencies.
- [ ] Replace abuse controls with a two-concurrent, same-neuron, global-window,
  fixed-cycle-reserve heap guard that resets on upgrade.
- [ ] Export only update `check_neuron` and query `http_request`.
- [ ] Commit as `refactor: remove compliance cache and stable state`.

## 3. Live evidence and report

- [ ] Reduce the client boundary to `list_neurons(ids)` and
  `canister_info(controller)` with fixed production destinations.
- [ ] Remove catalogue and economics calls; use `known_neuron_data`, the pinned maximum
  dissolve delay, and the six-month threshold.
- [ ] Implement target-first early exit and dependency batches of at most 50 with a
  hard maximum of 257 unique dependencies.
- [ ] Preserve raw vectors; detect duplicate topic keys, duplicate/unexpected records,
  contradictions, and omissions with the specified semantics.
- [ ] Commit live collection and explicit report-model simplification separately.

## 4. Certified assets and frontend

- [ ] Replace custom certification with the official HTTP v2 `AssetRouter` pattern.
- [ ] Serve only the required deterministic routes and security headers.
- [ ] Replace cache-first UI with one live `check_neuron(BigInt(id))` flow.
- [ ] Use deterministic build-time canister configuration for custom domains.
- [ ] Delete `authority.js`, `proposals.js`, and `rewards.js`.
- [ ] Commit certification and frontend simplification separately.

## 5. Tests and release evidence

- [ ] Add focused pure/collector tests, 50/51/>100 batching, omission semantics, exact
  call recording, and omega-reject precision.
- [ ] Add compliant/non-compliant/rejected PocketIC paths, real controller inspection,
  certified landing page, and upgrade asset coverage.
- [ ] Raise workspace Rust line coverage above 85% and retain frontend thresholds.
- [ ] Prove PocketIC-only packages absent from the production dependency tree and add
  narrow documented dev/test exceptions.
- [ ] Run the complete required verification suite with `--locked` Cargo dispatch.
- [ ] Record artifact, frontend, SBOM, and both reproducible-build hashes and byte
  identity in existing release/operator documentation.
