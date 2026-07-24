# Aggressive simplification implementation plan

## Final transaction-receipt and post-settlement evidence correction

Starting boundary: `58d02801d8a8e6b1d0f606f9d07ac1d18f815524`. Preserve the
stateless two-method canister, fixed browser-to-Governance actor, application-scoped
transaction coordination, route/load generations, and unresolved-outcome authority
while making only these corrections:

- [ ] Retain at most one bounded, heap-only current known transaction receipt at
  application scope; render it safely on landing, loading, report, and live-check
  error views without creating history or browser persistence.
- [ ] Return structured success, explicit Governance-rejection, and final-preflight
  settlement outcomes from the transaction review boundary while leaving local form
  validation errors local and preserving the pipeline-owned ambiguous-outcome state.
- [ ] Guarantee one newer anonymous live check after a known successful settlement
  when the selected route still names the same Dendrite context neuron, without
  navigating, polling, retrying, or replacing a newer route.
- [ ] Keep known results visible across rerenders and route changes, preserve proposal
  IDs and dashboard links after refresh, and show unresolved-outcome warnings on
  loading and live-check error views.
- [ ] Add deterministic receipt, dismissal, rejection, preflight, navigation,
  stale-check, storage, and actual-entry-point regressions; update existing evidence;
  and rerun every automated release and two-clean-build gate.

The real Internet Identity popup/origin test and controlled transaction smoke test stay
unrun and remain mandatory operator gates after this correction. No mainnet mutation,
deployment, automatic proposal polling, or transaction retry is authorized or
performed.

## Final route-ownership and authentication-transition correction

Starting boundary: `74318417c61050bd55e7e14c435246efecb31ab8`. Preserve the
stateless two-method canister, fixed browser-to-Governance actor, existing transaction
states, and completed lifecycle hardening while making only these corrections:

- [x] Rerender the selected route without navigating to landing or invalidating an
  owned neuron load.
- [x] Keep transaction settlement from replacing a newer loading or error route.
- [x] Guard sign-in/sign-out transitions and deny pipeline session/actor access while
  either transition is active.
- [x] Synchronously cancel preparing or ready work when sign-out begins while
  preserving unresolved outcomes.
- [x] Add deterministic settlement, sign-in, sign-out, detached-control, and failure
  regressions; update existing evidence; and rerun every automated release gate.

The real Internet Identity popup/origin test and controlled transaction smoke test stay
unrun and remain mandatory operator gates after this correction. No mainnet mutation or
deployment is authorized or performed.

## Final browser-lifecycle and transaction-concurrency correction pass

Starting boundary: `620e6a7876dda73ec36cec2b582e412b2c56e809`. Preserve the
stateless two-method canister, fixed browser-to-Governance actor, command policies, and
completed transaction hardening while making only these lifecycle corrections:

- [x] Serialize proposal and direct review preparation with explicit `preparing`
  ownership and generation-safe cancellation.
- [x] Ignore stale anonymous-check completions and keep landing/authentication renders
  route-correct.
- [x] Settle completed transactions against the current route instead of a detached
  control panel.
- [x] Retain a bounded heap-only unresolved-outcome summary until explicit confirmed
  acknowledgment, with read-only recovery only.
- [x] Prepare voting-power refresh details and fingerprints from fresh pipeline
  evidence at review and final preflight.
- [x] Preserve the authenticated actor and transaction state when browser sign-out
  fails.
- [x] Add deterministic lifecycle/race regressions, update existing evidence, and run
  every automated release and two-clean-build gate.

The real Internet Identity popup/origin test and controlled transaction smoke test stay
unrun and remain mandatory operator gates after this correction pass. No mainnet
mutation is authorized or performed.

## Final transaction coordination and review-correctness pass

Starting boundary: `4b0d318d28d60dc0c4d217df9a1a25ade01a2d40`. Preserve the
stateless two-method canister, fixed browser-to-Governance actor, existing command
policy, and all completed transaction hardening while making only these corrections:

- [x] Select matching caller-visible Neuron Management proposals without allowing
  ordinary or malformed unrelated Open proposals to abort the bounded list.
- [x] Own exactly one transaction coordinator at application scope; preserve its
  in-flight lock across panel cleanup, report refresh, route changes, and sign-out.
- [x] Distinguish Dendrite context, proposal managed target, proposer manager, direct
  mutation target, and high-risk confirmation target in review state and rendering.
- [x] Require Spawn to name exactly one valid self-authenticating controller.
- [x] Preserve duplicate raw manager evidence while deduplicating actionable manager
  options in first-occurrence order and preferring eligible Found evidence.
- [x] Correct authority copy, add focused application-entry regression tests, update
  existing evidence, and rerun every release and two-clean-build gate.

The real Internet Identity popup/origin test and controlled transaction smoke test stay
unrun and remain mandatory operator gates after this pass. No mainnet mutation is
authorized or performed.

## Transaction release-candidate hardening pass

Starting boundary: `e5276fef980bd4ef9594855e65fde42bc8fb1d1e`. Preserve the
completed command set and the anonymous, stateless, two-method Dendrite canister while
correcting only transaction visibility, freshness, final-preflight, recovery, exact
payload, form, and interface-maintenance defects.

- [x] Preserve caller-sensitive Governance visibility for bounded Open Neuron
  Management proposal reads; remove browser-clock vote gating; require a visible
  Unspecified manager ballot; and safely support legacy, modern, equal-dual, and
  fail-closed stored targets.
- [x] Prepare proposal commands from fresh evidence through one narrow callback and
  re-run it before submission; fingerprint manager order/count, quorum, committed
  topics, principal, target, proposer, and fee; clear every failed final preflight.
- [x] Retain and revalidate controller-only authority, candidates, ballots, hotkeys,
  receiver readability, and exact operation inputs immediately before submission.
- [x] Make ambiguous or structurally unexpected post-call outcomes terminal and
  non-repeatable; reject review replacement while an update is in flight; expose only
  bounded read-only recovery actions.
- [x] Encode the exact reviewed `ManageNeuronRequest`, record its deterministic digest,
  clone caller-owned byte arrays, and reject byte changes before submission.
- [x] Replace free-text topic codes with explicit recognised-topic selectors; ensure
  fixed alpha following and review text derive from the actual command; tighten the
  listed high-risk Configure boundaries without adding command scope.
- [x] Correct structural receiver-readiness semantics and add one bounded, live,
  authenticated replicated verification action with no persistence.
- [x] Derive the production transaction IDL deterministically from the reviewed Candid
  with one explicit replicated-read annotation transformation and byte-equality drift
  gate.
- [x] Extend focused frontend and PocketIC coverage, regenerate certified assets,
  update existing security/testing/deployment/evidence documentation, run every release
  gate, and prove two clean builds byte-identical.

The real Internet Identity popup/origin test and controlled transaction smoke test
remain mandatory operator gates. This pass performs no mainnet mutation and adds no
history, polling, retry, simulation, reward accounting, framework, canister, crate, or
stable state.

## Browser-to-NNS management tranche

Starting boundary: `ce4687da946e0e70b22c30aadcf75a17f9ea0d8f`. Preserve the
anonymous, stateless, two-method Dendrite canister and add privileged behaviour only in
the browser, signed by an inspectable Internet Identity delegation restricted exactly
to NNS Governance `rrkah-fqaaa-aaaaa-aaaaq-cai`. The pinned interface source remains
`dfinity/ic@d55a0f4d4edfabe49d8fd543aff473084cb741f2`.

- [x] Phase A: add the minimal reviewed Governance transaction Candid/IDL and semantic
  drift fixture; create one fixed-destination authenticated actor whose certified reads
  are represented as updates; request, inspect, restore, and reject delegation chains
  fail-closed; prove the anonymous Dendrite actor and public Candid remain unchanged.
- [x] Phase B: add one deeply immutable review/confirmation/submission pipeline for
  outer Neuron Management proposals and direct manager operations, with fresh authority,
  manager, fee, and request revalidation; strict response decoding; one in-flight call;
  no retry, persistence, hidden mutation, or unsupported simulation claim.
- [x] Phase C: prominently expose validated single-topic `Follow`,
  `RefreshVotingPower`, and target `RegisterVote` proposal workflows, preserving raw ID
  order and the standard's manager, omega-reject, alpha-vote, and topic restrictions.
- [x] Phase D: fetch a bounded live set of open restricted proposals, filter exact
  stored `ManageNeuron` actions for the viewed target, and submit direct manager Yes/No
  votes through the same pipeline with proposal-ID lookup fallback and no history.
- [x] Phase E: make hotkey assistance controller-honest and add controller-only direct
  hotkey setup for a different Dendrite principal; classify raw manager reward-receiver
  readiness and support one warned controller-only singleton receiver `Follow` setup.
- [x] Phase F: give every pinned current `ManageNeuronCommandRequest` variant an
  explicit reviewed capability policy; implement typed bounded forms for enabled
  commands and explicit reasons for nested `MakeProposal`, removed `MergeMaturity`, and
  target-incompatible `Disburse`/`DisburseToNeuron`; fail drift and unknown variants
  closed without schema-generated runtime forms.
- [x] Phase G: extend Rust, fake-DOM, fake-actor, interface, and PocketIC coverage;
  update existing architecture/security/operations/standard documents; record Candid,
  declaration, capability, Wasm, frontend, manifest, configuration, and SBOM evidence;
  run every required gate and prove two clean builds byte-identical.

Each phase is a hard gate: its focused tests must pass before production work begins on
the next phase. `simulate_manage_neuron` is excluded because the pinned implementation
does not support these outer proposal commands. The sole mutation sequence is fresh
preflight, exact construction, human review, explicit confirmation, fresh revalidation,
submission of the exact reviewed object, strict decoding, and a live anonymous recheck.
The popup and controlled transaction smoke procedures remain explicit operator gates
unless an operator actually runs them; no mainnet mutation is performed here.

The anonymous-verifier tranche is complete after the NNS snapshot-clock correction and
its final verification. This does not complete the original product brief; Internet
Identity and authenticated governance functionality remain the next tranche.

## Browser-only identity and read-only manager recognition tranche

Starting boundary: reviewed commit
`899c34b2a71a1676775c318796fe2baa3f7ec079`. The anonymous verifier remains frozen
except for the manager report fields and certified frontend assets required here. The
canister remains stateless and anonymous, its public methods and outbound calls remain
unchanged, and it never receives a user principal, identity, or delegation.

- [x] Extend raw manager summaries with explicit found/missing/unavailable status and
  bounded controller/hotkey evidence already present in existing dependency responses.
- [x] Add mandatory deterministic derivation-origin, normalized alternative-origin,
  and fixed production Internet Identity provider build inputs.
- [x] Generate and certify the exact alternative-origin document with endpoint-specific
  CORS/resource-policy headers and popup-compatible COOP.
- [x] Add one pinned official browser AuthClient wrapper with session restore, eight-hour
  delegation lifetime, explicit sign-in/sign-out, origin enforcement, and no Dendrite
  identity propagation.
- [x] Render the exact principal and recompute read-only controller/hotkey authority from
  each current live report, including instruction-only external hotkey onboarding help.
- [x] Prove the Dendrite actor remains anonymous, no authenticated NNS actor or mutation
  request exists, duplicate raw managers remain auditable, and unavailable evidence
  never becomes authority.
- [x] Run all Rust, PocketIC, frontend, coverage, certification, security, SBOM, asset
  identity, and two-clean-build reproducibility gates with identical explicit identity
  inputs; document any actual manual local Internet Identity popup smoke test precisely.
- [x] Record final commands, coverage, hashes, exceptions, limitations, and explicit
  deferral of the single audited direct browser-to-NNS transaction pipeline.

The canonical derivation origin is security-critical: changing it changes users'
Dendrite principals, so it must be finalized before any operator performs external
hotkey onboarding. Every alternative origin must be operator-controlled. This tranche
adds no NNS mutation and does not complete the original product brief.

## Browser-identity hardening pass

Starting boundary: `246a00b`. Keep the browser-only identity tranche frozen except for
these corrections; do not begin the browser-to-NNS transaction tranche.

- [x] Accept exact localhost, loopback, and `.localhost` Internet Identity providers in
  local mode while keeping production fixed to `https://id.ai/authorize`.
- [x] Separate permanent origin failure from bounded recoverable restore/popup/storage
  errors, make retry possible without reload, and retain identity on failed sign-out.
- [x] Restore identity before rendering the first route so startup has one deterministic
  render and never races a live neuron check.
- [x] Remove the production authentication-session global hook while retaining injection
  only at `createApplication` for tests.
- [x] Remove the unenforced PIN-policy build input and claim; retain the factual
  eight-hour delegation and no-attributes policy.
- [x] Preserve anonymous Dendrite calls, local-only authority comparison, the unchanged
  canister interface/outbound calls, and the complete absence of NNS mutation code.
- [x] Run every automated release gate with explicit identity inputs, record affected
  hashes, and retain the real popup smoke test as an operator gate unless actually run.

After these items pass, freeze browser-only identity and read-only manager recognition.
No manager should install a Dendrite principal as a hotkey before the popup gate passes
on the finalized canonical origin.

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

- [x] Distinguish genuinely empty, known-invalid, and future unknown committed-topic
  vectors; keep defensive wire-entry bounds separate from the recognised semantic
  domain.
- [x] Derive the dependency limit from all 18 recognised topic lists and the pinned
  15-followee limit, and evaluate every graph that can exist under those rules.
- [x] Calculate the displayed Neuron Management quorum from distinct ballot IDs while
  retaining the raw manager vector for duplicate-rule evaluation.
- [x] Restrict frontend API hosts to the fixed production gateway and explicit local
  replica origins, with one assertion tying accepted origins to certified CSP.
- [x] Render failed controller inspection as unavailable evidence and make ordinary
  frontend failures informative and actor creation retryable.
- [x] Isolate frontend build-test output in temporary directories and prove the
  checked-in production assets remain byte-identical across the suite.
- [x] Separate local functional verification from the production reproducibility
  fixture, regenerate hashes for their exact configurations, and retain prior hashes
  as accurately labelled historical evidence.
- [x] Run every mandatory format, Clippy, interface, unit, PocketIC, frontend,
  coverage, dependency, scan, SBOM, build, and reproducibility check without adding
  identity, governance-control, storage, cache, timer, or service scope.
