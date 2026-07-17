# Dendrite build specification and Codex implementation brief

**Status:** implementation-ready draft  
**Standard identifier:** `nns-dendrite/1.0-draft`  
**Research baseline:** current NNS Governance source reviewed 10 July 2026, including commit `d55a0f4d4edfabe49d8fd543aff473084cb741f2`  
**Engineering archetype:** Jupiter Faucet suite patterns, adapted to one production canister  

---

## 1. Deliverable

Create Dendrite from an empty directory as a complete, reviewable Internet Computer repository.

Dendrite has two jobs:

1. Given an NNS neuron ID, verify whether the neuron currently complies with the NNS Dendrite Standard and explain every discrepancy.
2. After Internet Identity authentication, help an authorised operator of one of that neuron's Neuron Management followees construct, simulate, submit, and vote on NNS Neuron Management proposals.

The application must deploy as exactly one production canister. The Rust canister serves a certified frontend and performs bounded live compliance evaluations. User-authorised NNS mutations are signed by the user's browser identity and sent directly to NNS Governance.

The repository is not complete when it merely compiles. It must contain the finished UI flows, deterministic verifier, complete current proposal-command forms, tests, security tooling, reproducible builds, and operational documentation described below.

---

## 2. Confirmed product decisions

These decisions supersede any earlier draft:

- `ALPHA_VOTE_NEURON_ID = 2947465672511369`.
- `OMEGA_REJECT_NEURON_ID = 18422777432977120264`.
- Never substitute omega-vote for omega-reject.
- The target Dendrite neuron must have no hotkeys.
- The target Dendrite neuron must have `not_for_profit = false`.
- Do not build, store, index, categorise, or display durable Neuron Management proposal history.
- The UI may fetch and display currently open/live proposals from NNS Governance on demand. It must not persist them.
- Dendrite does not implement the future rewards protocol. It only verifies and assists with the neuron arrangements that protocol expects.

### 2.1 Why `not_for_profit = false` is mandatory

`not_for_profit` is an NNS neuron privilege flag, not a tax status and not an indication that the neuron earns no rewards. The NNS describes such a neuron as dissolvable by voting. Current Governance validation permits a Neuron Management proposal targeting a not-for-profit neuron to use principal-stake movement paths that are rejected for an ordinary neuron, notably `Disburse` and `DisburseToNeuron`.

For Dendrite, the controller credential is deliberately made unusable. With `not_for_profit = false`, the manager quorum may govern voting and configuration, but it cannot use a Neuron Management proposal to perform those principal-stake extraction or reassignment operations. With the flag true, the manager quorum becomes a custody authority capable of ultimately moving locked principal stake. That is inconsistent with the intended permanently locked, publicly verifiable posture.

The verifier must therefore report `not_for_profit = true` as a mandatory failure. Advanced command forms must still be derived from the current NNS interface, but simulation is authoritative and the UI must explain why principal-stake commands are unavailable for a compliant target.

---

## 3. Terminology

Let:

- `D` be the candidate Dendrite neuron.
- `A` be alpha-vote, neuron `2947465672511369`.
- `O` be omega-reject, neuron `18422777432977120264`.
- `F(n, t)` be the raw ordered list of neuron IDs that neuron `n` follows on topic `t`.
- `NM(n)` be `F(n, NeuronManagement)`.
- `C(D)` be the distinct concrete topics in `D.known_neuron_data.committed_topics`.
- `Q(D) = floor(|NM(D)| / 2) + 1` after the raw list has been verified distinct.
- “Known neuron” mean a neuron currently present in the NNS known-neuron catalogue.
- “Dendrite principal” mean the principal produced by Internet Identity for Dendrite's canonical derivation origin.
- “Manager neuron” mean a distinct known neuron in `NM(D)`.
- “Committed delegate” mean a manager neuron followed by `D` on one of `C(D)`.

Neuron IDs and proposal IDs are unsigned 64-bit integers. At all JavaScript boundaries they must be represented as canonical decimal strings or `bigint`. They must never pass through `number`.

---

# Part I — NNS Dendrite Standard

## 4. Result model

Each rule returns one of:

- `PASS`
- `FAIL`
- `WARNING`
- `INDETERMINATE`
- `STANDARD_UPDATE_REQUIRED`

Overall status is deterministic:

1. `NON_COMPLIANT` when any mandatory rule is `FAIL`.
2. Otherwise `STANDARD_UPDATE_REQUIRED` when any mandatory rule has that status.
3. Otherwise `INDETERMINATE` when any mandatory rule is indeterminate.
4. Otherwise `COMPLIANT`.

A separate `STALE` presentation flag applies when a cached snapshot exceeds the configured freshness target. Stale data is never presented as a live assertion.

Every rule result contains:

```text
RuleResult {
  rule_id: text;
  status: RuleStatus;
  summary: text;
  observed: opt text;
  expected: opt text;
  related_neuron_ids: vec nat64;
  source: EvidenceSource;
}
```

Do not short-circuit on the first failure. Gather every independent discrepancy possible from the available evidence.

## 5. Recognised topics

The standard implementation must recognise the current NNS `TopicToFollow` domain:

- CatchAll / Unspecified
- Neuron Management
- Exchange Rate
- Network Economics
- Governance
- Node Admin
- Participant Management
- Subnet Management
- Application Canister Management
- KYC
- Node Provider Rewards
- IC OS Version Deployment
- IC OS Version Election
- SNS and Community Fund
- API Boundary Node Management
- Subnet Rental
- Protocol Canister Management
- Service Nervous System Management

CatchAll and Neuron Management cannot be committed topics.

Topic handling must be centralised in a versioned module. An unknown live topic code or unknown committed-topic variant must produce `STANDARD_UPDATE_REQUIRED`; it must not be ignored, mapped to CatchAll, or treated as compliant.

## 6. Mandatory rules

Use these stable rule IDs in code, tests, UI, and machine responses.

### 6.1 Existence and known-neuron data

**DENDRITE-KNOWN-001 — target exists**  
NNS Governance returns a full target neuron record.

**DENDRITE-KNOWN-002 — target is a known neuron**  
The target has current known-neuron data and appears in the current known-neuron catalogue.

**DENDRITE-KNOWN-003 — committed topics are non-empty**  
At least one concrete topic is declared in `committed_topics`.

**DENDRITE-KNOWN-004 — committed topics are valid and distinct**  
No duplicate, CatchAll, Neuron Management, unknown, or undecodable committed topic is present.

### 6.2 Locked and active posture

**DENDRITE-LOCK-001 — not dissolving**  
The target is in the Not Dissolving state.

**DENDRITE-LOCK-002 — maximum dissolve delay**  
The target's current dissolve delay equals the maximum recognised by this standard version. At the implementation baseline, Mission 70 has made this two nominal years. Store the exact seconds in one versioned standard configuration module and test it explicitly.

**DENDRITE-LOCK-003 — positive effective stake**  
Net stake is positive.

**DENDRITE-ACTIVE-001 — recently refreshed**  
`now - voting_power_refreshed_timestamp_seconds` is no greater than both:

- the current `start_reducing_voting_power_after_seconds` returned by NNS network economics; and
- the v1 policy ceiling of six nominal months.

**DENDRITE-ACTIVE-002 — no voting-power decay**  
`deciding_voting_power == potential_voting_power` and both are positive.

### 6.3 Unusable controller credential

**DENDRITE-CONTROL-001 — controller resolves to a canister**  
Calling management-canister `canister_info` for the neuron controller succeeds.

**DENDRITE-CONTROL-002 — controller canister has no Wasm**  
`module_hash == null`.

**DENDRITE-CONTROL-003 — controller canister is blackholed**  
`controllers` is empty.

**DENDRITE-CONTROL-004 — target has no hotkeys**  
The raw `hot_keys` list is empty.

**DENDRITE-CONTROL-005 — not-for-profit exception is disabled**  
`not_for_profit == false`.

### 6.4 Neuron Management quorum

**DENDRITE-NM-001 — five to fifteen managers**  
The raw Neuron Management followee list contains at least 5 and no more than the current NNS per-topic maximum, currently 15.

**DENDRITE-NM-002 — manager IDs are distinct**  
Raw list length equals distinct-set length. Never silently deduplicate before evaluating this rule.

**DENDRITE-NM-003 — no self manager**  
`D` is not in `NM(D)`.

**DENDRITE-NM-004 — every manager is known**  
Every member of `NM(D)` is a current, distinct known neuron.

**DENDRITE-NM-005 — special neurons remain known**  
`A` and `O` are both current known neurons. Show their observed names. Name drift is a warning; absent known-neuron registration is a failure.

Display manager count and `Q(D)` prominently. Neuron Management ballots have equal weight of one; manager stake does not change the quorum.

### 6.5 Committed-topic delegation

For each `t` in `C(D)`:

**DENDRITE-COMMIT-001 — at least three delegates**  
`F(D, t)` has at least 3 entries.

**DENDRITE-COMMIT-002 — delegates are distinct**  
The raw list has no duplicate neuron IDs.

**DENDRITE-COMMIT-003 — delegates are managers only**  
Every delegate is in `NM(D)`. There are no additional followees on the committed topic.

**DENDRITE-COMMIT-004 — every delegate follows omega-reject exactly**  
For every selected manager `m`, `F(m, t)` is exactly the singleton `[O]`.

The exact singleton is important. Merely including omega-reject among multiple followees does not guarantee that the manager neuron will reproduce omega-reject's vote.

### 6.6 Non-committed topics

For every recognised concrete topic other than Neuron Management and each committed topic:

**DENDRITE-DEFAULT-001 — alpha singleton**  
`F(D, t)` is exactly `[A]`.

**DENDRITE-DEFAULT-002 — CatchAll alpha singleton**  
CatchAll / Unspecified is exactly `[A]`.

**DENDRITE-DEFAULT-003 — no unknown following topics**  
Any non-empty follow-rule entry with an unknown topic code produces `STANDARD_UPDATE_REQUIRED`.

### 6.7 Evidence integrity

**DENDRITE-DATA-001 — complete dependency graph**  
A single evaluation obtains the target, every manager, every committed delegate, alpha-vote, omega-reject, current known-neuron data, current voting-power economics, and target controller-canister information.

**DENDRITE-DATA-002 — timestamped provenance**  
The result records evaluation time, standard version, fixed canister IDs, build source revision, and every source-call error.

**DENDRITE-DATA-003 — no inferred passes**  
Missing, redacted, rejected, stale, overflowed, unknown, or undecodable mandatory evidence is never converted to a passing default.

## 7. Recommended warnings

Warnings do not affect v1 compliance unless another mandatory rule is also affected:

- a manager's own ordinary voting power is stale or decayed;
- a manager is dissolving;
- the target has unstaked maturity and auto-stake maturity is off;
- known-neuron metadata does not mention Dendrite or link to a verification page;
- a live open Neuron Management proposal would make the target non-compliant;
- a reward receiver arrangement is absent or ambiguous;
- a cached result is older than the UI freshness target.

## 8. Compliance snapshot

Expose a versioned type equivalent to:

```text
ComplianceSnapshot {
  schema_version: nat16;
  standard_version: text;
  neuron_id: nat64;
  checked_at_timestamp_seconds: nat64;
  overall_status: ComplianceStatus;
  stale_after_timestamp_seconds: nat64;
  rules: vec RuleResult;
  target: opt NormalizedNeuronSummary;
  managers: vec NormalizedManagerSummary;
  committed_topics: vec CommittedTopicSummary;
  quorum_threshold: opt nat8;
  source_metadata: SourceMetadata;
  evidence_digest: blob;
}
```

Canonical encoding and digest computation must be deterministic. Keep display text bounded. Preserve raw IDs and topic codes separately from labels.

---

# Part II — Application architecture

## 9. One production canister

Use one Rust canister package named `dendrite` with `cdylib` and `rlib` outputs. It contains:

- certified static-asset serving;
- fixed NNS and management-canister clients;
- a pure compliance rule engine;
- a bounded latest-snapshot cache;
- a narrow public Candid API;
- stable configuration and cache metadata.

The frontend is built before the Rust Wasm and embedded with `include_dir` or an equivalently reviewable mechanism. Follow the Jupiter Faucet pattern using `ic-asset-certification` and `ic-http-certification` rather than deploying a separate asset canister.

### 9.1 Trust boundary

The canister may:

- read public NNS state;
- call `canister_info` on the target controller principal;
- calculate compliance;
- store a bounded latest snapshot;
- serve certified assets;
- enforce refresh cooldowns and cycle-reserve protection.

The browser may:

- authenticate with Internet Identity;
- query caller-specific NNS state;
- simulate exact NNS requests;
- submit `manage_neuron` requests directly to NNS Governance;
- vote directly with a manager neuron controlled by or hotkeyed to the authenticated principal.

The Dendrite canister must never:

- receive or store a user delegation;
- relay a privileged user call;
- control or hold a hotkey on any neuron;
- accept an arbitrary outbound destination or method;
- hold ICP or act as a rewards distributor;
- store proposal history.

## 10. Suggested repository layout

```text
Dendrite/
  AGENTS.md
  DENDRITE_BUILD_SPEC.md
  Cargo.toml
  Cargo.lock
  rust-toolchain.toml
  package.json
  package-lock.json
  Dockerfile.repro
  icp.yaml
  deny.toml
  osv-scanner.toml
  .cargo/audit.toml
  candid/
    nns-governance/governance.subset.did
    management/canister-info.subset.did
  canisters/dendrite/
    Cargo.toml
    dendrite.did
    src/
      lib.rs
      api.rs
      assets.rs
      certification.rs
      config.rs
      nns_client.rs
      management_client.rs
      rate_limit.rs
      stable.rs
      types.rs
      standard/
        mod.rs
        evaluate.rs
        normalize.rs
        rules.rs
        topics.rs
    public/
      index.html
      404.html
      .well-known/
      generated/
    web/
      build-frontend.mjs
      declarations/
      src/
        main.js
        routes.js
        auth.js
        agents.js
        nns-api.js
        candid.js
        ids.js
        dom.js
        compliance-view.js
        manager-authority.js
        proposal-builder.js
        command-forms.js
        reward-receiver.js
      test/
  crates/
    dendrite-types/
    ic-clients/
    build-support/
  tests/
    mocks/mock-nns-governance/
    pocketic/
  tools/
    nns-bindgen-check/
    xtask/
    scripts/
  docs/
    architecture/
    development/
    operations/
    security/
    standard/
```

Internal crates are encouraged where they improve testing and review, but the deployed output remains one production canister.

## 11. Fixed external interfaces

### 11.1 NNS Governance

Hardcode the official NNS Governance canister principal in one config module. Use a checked-in, minimal Candid subset that contains only methods and fields Dendrite needs. At minimum:

Canister-side live evaluation:

- `list_known_neurons`
- `list_neurons`
- `get_network_economics_parameters`

Browser-side read and write flows:

- `list_neurons`
- `list_known_neurons`
- `list_proposals`
- `get_pending_proposals`
- `get_proposal_info`
- `simulate_manage_neuron`
- `manage_neuron`

Use method-specific request and response types. Do not depend on the full generated NNS type graph in production code.

### 11.2 IC management canister

Use a minimal binding for:

```text
canister_info(record {
  canister_id : principal;
  num_requested_changes : opt nat64;
}) -> (record {
  total_num_changes : nat64;
  recent_changes : vec ...;
  module_hash : opt blob;
  controllers : vec principal;
})
```

Request zero recent changes because Dendrite only needs current `module_hash` and `controllers`. Bound and ignore all unneeded history safely.

### 11.3 Interface drift

Add a tool/test that compares the checked-in Candid subsets against the current official upstream Candid files. CI must fail on incompatible drift. Updating a subset requires an explicit commit with reviewed generated changes.

## 12. Public Dendrite Candid API

Keep the API narrow. Suggested surface:

```text
get_standard_config : () -> (StandardConfig) query;
get_cached_compliance : (nat64) -> (opt ComplianceSnapshot) query;
refresh_compliance : (nat64) -> (Result<ComplianceSnapshot, DendriteError>);
get_public_status : () -> (PublicStatus) query;
http_request : (HttpRequest) -> (HttpResponse) query;
```

Do not add proposal-history methods.

`refresh_compliance` is an update method. It performs live outbound calls and returns a consensus result. It may update the bounded cache after complete evaluation.

`get_cached_compliance` must return the snapshot's exact observation time and stale time. A query response must never masquerade as a fresh live check.

All errors are typed, bounded, and safe for display. No traps for user input or upstream rejection.

## 13. Bounded stable state

Store only:

- schema-versioned configuration;
- global rate-limit state if needed across upgrades;
- at most `MAX_CACHED_SNAPSHOTS` latest snapshots, initially 256;
- deterministic eviction metadata;
- deployment/build metadata.

Requirements:

- hard maximum record size;
- hard maximum rule count, manager count, and string length;
- deterministic least-recently-refreshed or insertion-order eviction;
- no timers;
- no proposal IDs, proposal bodies, proposal categories, high-water marks, or history coverage records;
- upgrade migration tests for every retained schema version;
- stable memory invariants documented.

## 14. Refresh abuse controls

A public live verifier consumes Dendrite cycles. Implement all of:

- per-neuron cooldown;
- global token-bucket or sliding-window limit;
- in-flight deduplication for the same neuron;
- maximum concurrent refreshes;
- reject new refreshes below a configurable cycle reserve;
- reject non-canonical or zero neuron IDs before any outbound call;
- cache hit response when a snapshot is within the live-refresh reuse window;
- bounded upstream response decoding;
- operational counters for accepted, cached, rejected, failed, and successful refreshes.

Do not require login merely to view a neuron. Resource limits may temporarily prevent a live refresh; in that case show cached data, its age, and the typed reason.

## 15. Live evaluation call plan

A refresh should use a small, bounded call graph:

1. Fetch current known-neuron catalogue.
2. Fetch the full public target neuron.
3. Parse target managers and committed-topic dependencies without deduplication.
4. Fetch all unique dependency neurons in one bounded `list_neurons` request where possible. The dependency set is bounded by NNS followee limits.
5. Fetch current network economics.
6. Call management-canister `canister_info` for the target controller.
7. Normalise evidence into pure internal types.
8. Evaluate every rule.
9. Compute canonical digest and bounded snapshot.
10. Store the latest snapshot subject to the fixed cache cap.

If the target is not a known neuron, continue enough evaluation to return useful failures, but do not make irrelevant dependency calls.

---

# Part III — Frontend product

## 16. Frontend technology

Use small vanilla JavaScript ES modules and a pinned esbuild bundle, following Jupiter Faucet's approach. Use checked-in generated declarations. Dependencies must be exact-version pinned in `package.json` and `package-lock.json`.

A suitable starting baseline, subject to compatibility verification, is:

- `@icp-sdk/core` exact version matching the implementation environment;
- `@noble/hashes` only when needed for client verification;
- pinned esbuild;
- no React/Vue/Svelte framework;
- Node's built-in test runner.

No CDN scripts, remote CSS, remote fonts, analytics, or runtime package loading.

## 17. Landing page

The landing page must:

- explain that Dendrite identifies quorum-managed, blackholed-controller known neurons;
- explain committed topics, manager delegates, alpha fallback, and omega-reject liveness;
- state that Dendrite does not custody keys, ICP, neurons, or rewards;
- accept a canonical unsigned 64-bit decimal neuron ID;
- navigate to a shareable hash route such as `/#/neuron/123`;
- link to the standard, source, reproducible-build instructions, and security model.

ID parsing must reject:

- empty or zero IDs;
- plus/minus signs;
- leading/trailing/internal whitespace;
- decimal points or exponent notation;
- values over `u64::MAX`;
- conversion through JavaScript `number`.

Add an explicit regression test using omega-reject ID `18422777432977120264` to prove exact round-trip behaviour.

## 18. Neuron page

Display:

- neuron ID and current known-neuron metadata;
- overall status, standard version, check time, cache/live provenance, and stale state;
- rule-by-rule pass/failure/indeterminate table with stable rule IDs;
- stake, state, dissolve delay, voting-power refresh age, potential power, and deciding power;
- controller principal, canister existence, module-hash state, and controller list;
- `hot_keys` and `not_for_profit` evidence;
- manager known neurons, distinct count, and quorum threshold;
- committed topics and their selected delegates;
- exact omega-reject singleton proof for every committed delegate;
- alpha singleton proof for every non-committed topic and CatchAll;
- warnings and upstream errors;
- a button to request a live refresh subject to cooldown.

Do not display a historical-proposals section.

## 19. Internet Identity

Use the official AuthClient flow.

The UI must show:

- full Dendrite principal;
- copy control;
- canonical derivation origin;
- delegation expiry;
- logout.

Keep the delegation exclusively in the browser under the chosen AuthClient storage policy. Never send it to the Dendrite canister.

Choose and document a canonical production derivation origin before operators add it as a hotkey. If custom domains or alternative gateway origins are supported, serve the certified `/.well-known/ii-alternative-origins` file and set `derivationOrigin` consistently. Changing derivation origin without a migration plan breaks previously configured hotkeys.

Provide explicit local-development and production identity-provider configuration without weakening production origin checks.

## 20. Manager authority recognition

After login:

1. Read `NM(D)` from the current compliance evidence or a fresh NNS query.
2. Request those manager neuron IDs from NNS Governance as the authenticated identity.
3. For each returned full manager record, compare the Dendrite principal exactly with:
   - `controller`, or
   - an entry in `hot_keys`.
4. Build a list of eligible proposer/voter neurons.

Do not infer authority from:

- known-neuron/public visibility;
- being able to read a full record for another reason;
- the output of `get_neuron_ids` alone;
- a matching display name;
- ownership claims stored by Dendrite.

An eligible record contains neuron ID, known-neuron name, controller-or-hotkey authority kind, available stake, and current fees. The user selects which manager neuron pays a proposal fee.

## 21. Hotkey onboarding

The Dendrite principal is origin-specific. The principal used in the NNS dapp may be different. Therefore do not claim that logging into Dendrite automatically gives the authority needed to add the Dendrite principal.

For each manager neuron:

- show whether the Dendrite principal is already its controller or hotkey;
- show the exact principal to add;
- generate a reviewed `Configure.AddHotKey` `manage_neuron` payload;
- provide copyable CLI/Candid instructions for submitting through an existing trusted controller surface;
- explain that current NNS rules permit only the neuron controller, not an existing hotkey, to add a hotkey;
- show a direct submit button only in the rare case that the authenticated Dendrite principal exactly equals the manager controller;
- after external submission, provide a “verify again” action that rereads the manager record.

Do not store onboarding state server-side.

---

# Part IV — Neuron Management control panel

## 22. Request topology

To raise a proposal concerning target `D`, an authorised manager neuron `M` calls NNS Governance `manage_neuron` with an outer command `MakeProposal`. The embedded NNS proposal action is `ManageNeuron`, and the inner target is `D` with the desired command.

Keep these layers visibly distinct in types and review UI:

```text
Outer ManageNeuronRequest
  proposer neuron: M
  command: MakeProposal
    Proposal
      action: ManageNeuron
        target neuron: D
        command: <requested target operation>
```

The proposal creator automatically votes yes with `M`. Only current Neuron Management followees of `D` receive ballots; each has weight one. Display the exact majority threshold.

## 23. Universal submission pipeline

Every proposal flow must:

1. verify the selected proposer is still a current manager;
2. verify the Dendrite principal is still controller/hotkey of that proposer;
3. refresh relevant NNS data;
4. build typed inner command;
5. build typed inner `ManageNeuron` action targeting `D`;
6. build typed outer `MakeProposal` request from `M`;
7. render an exact human-readable decode of both layers;
8. show current NNS neuron-management fee and available proposer stake/fees;
9. show eligible voters and majority threshold;
10. run `simulate_manage_neuron` with the exact outer request and current authenticated identity;
11. block ordinary submission on simulation error;
12. require explicit confirmation;
13. call NNS `manage_neuron` directly from the browser;
14. display the returned proposal ID without storing it on the Dendrite canister;
15. refresh live open proposals and compliance as appropriate.

Never accept or submit an opaque user-supplied Candid blob from the normal UI.

## 24. Primary guided flows

### 24.1 Set following

Prefer the current atomic `SetFollowing` command. Keep `Follow` available in the advanced command reference for compatibility.

Guided rules:

- Neuron Management followees: known neurons only, distinct, 5–15, no target self ID.
- Committed-topic followees: at least 3 distinct current managers and no non-manager IDs.
- Non-committed concrete topics: exact singleton alpha-vote.
- CatchAll: exact singleton alpha-vote.
- Before submission, compute and display the complete projected post-state compliance diff.
- Selection lists show neuron ID and current known-neuron name; ID is authoritative.
- Advanced non-conforming edits require an explicit high-severity warning and cannot be presented as recommended.

### 24.2 Refresh voting power

Build inner `RefreshVotingPower {}` for `D`. Show current refresh time and the rule(s) expected to change. After execution, request a fresh compliance evaluation until the new NNS state is observed or a bounded timeout is reached.

### 24.3 Trigger a vote

A vote is on a specific NNS proposal, not on an abstract topic.

- Fetch current open NNS proposals on demand.
- Filter by selected topic.
- Let the operator choose exact proposal ID and Adopt/Reject.
- Show title, topic, deadline, current status, and proposal ID.
- Build inner `RegisterVote { proposal, vote }` for `D`.

### 24.4 Vote on open Neuron Management proposals targeting D

Fetch current live proposals with `include_all_manage_neuron_proposals = true`, filter client-side to actions targeting `D`, and display open proposals only. Do not persist them.

An eligible manager operator can cast `RegisterVote` directly with one of their manager neurons. Show equal-weight tally, which manager IDs have voted when NNS exposes the ballots, and how many more yes/no votes decide the proposal.

## 25. Complete current command support

Provide typed forms and decoders for the current `ManageNeuronProposalCommand` surface:

- Configure
- Disburse
- Spawn
- Follow
- ClaimOrRefresh
- RegisterVote
- Merge
- DisburseToNeuron
- MakeProposal
- StakeMaturity
- MergeMaturity
- RefreshVotingPower
- DisburseMaturity
- SetFollowing
- Split

Current NNS restrictions are authoritative:

- nested `MakeProposal` through a Neuron Management proposal is not submit-enabled;
- removed/obsolete `MergeMaturity` is not submit-enabled;
- `Disburse` and `DisburseToNeuron` are rejected for a compliant target because `not_for_profit` is false;
- other commands may be state-dependent and must be simulated exactly before submission.

Do not create a fragile hardcoded claim that every listed command is always permitted. Build all current typed forms, mark known protocol-level exclusions, and use `simulate_manage_neuron` as the final authority.

`Configure` forms must cover the current operations:

- Increase Dissolve Delay
- Start Dissolving
- Stop Dissolving
- Add Hot Key
- Remove Hot Key
- Set Dissolve Timestamp
- Join Community Fund
- Leave Community Fund
- Change Auto-Stake Maturity
- Set Visibility

Commands that would break Dendrite conformance remain visible in the advanced command reference but require a red “will make this neuron non-compliant” review gate and a second confirmation. Examples include adding a target hotkey, reducing the locked posture through dissolution actions, or replacing standard following.

Unknown future command variants must fail visibly as `STANDARD_UPDATE_REQUIRED` or an unsupported future command. Never silently drop them.

## 26. Proposal content safety

Proposal titles, summaries, URLs, errors, known-neuron fields, and self-describing values are untrusted.

- Render text through `textContent` or equivalent safe helpers.
- Validate outbound links and permit only explicit `https:` destinations.
- Apply `rel="noopener noreferrer"`.
- Never render NNS-provided HTML or Markdown as HTML.
- Include XSS regression fixtures for every displayed on-chain string field.

---

# Part V — Reward-receiver readiness helper

## 27. Purpose

This feature is advisory. It prepares manager known neurons for an external rewards protocol but does not calculate or distribute rewards.

For each manager known neuron `M`, inspect `NM(M)`:

- `NoReceiver`: empty raw list.
- `SingleReceiver(R)`: raw list contains exactly one neuron ID.
- `AmbiguousReceiver`: duplicate or multiple entries.

Explain the intended external convention:

- a single Neuron Management followee may be treated as the reward-receiver neuron;
- if no such followee exists, the external protocol may reward the known neuron itself;
- more than one or duplicate receiver is ambiguous.

## 28. Setup flow

Allow an authorised operator to prepare a typed change that sets `NM(M)` to exactly one chosen receiver neuron.

Important warnings:

- the receiver need not be known and may be minimally staked;
- a single Neuron Management followee has an absolute majority alone and therefore becomes sole proposal-based manager of `M`;
- changing Neuron Management followees directly is controller-only under current NNS rules;
- if the Dendrite principal is only a hotkey, do not show a direct-submit button;
- provide a copyable direct-controller payload, or a Neuron Management proposal path only when `M` already has managers and the operator controls one of them;
- simulate any actual submitted path.

No setup state is stored by Dendrite.

---

# Part VI — Certified frontend and HTTP security

## 29. Asset certification

Use the Jupiter Faucet pattern:

- embed built assets in the Rust canister;
- certify GET and HEAD responses;
- certify 404/fallback responses;
- no-cache/no-store for `index.html`, error pages, and well-known identity/domain files;
- one-year immutable caching for content-hashed JS, CSS, images, and fonts if any local fonts are added;
- deterministic compression and asset manifest;
- exclude private build manifests from HTTP serving.

## 30. Security headers

At minimum:

- HSTS;
- `X-Content-Type-Options: nosniff`;
- restrictive CSP with no unsafe inline script/style;
- `Referrer-Policy: no-referrer`;
- restrictive Permissions Policy;
- appropriate COOP, COEP, and CORP values verified against Internet Identity login behaviour;
- frame-ancestor restriction;
- exact MIME types.

Allow connections only to the application origin, required IC gateway/API origins, and the official Internet Identity origin. No analytics or broad wildcards.

## 31. HTTP tests

Test:

- certified GET and HEAD parity;
- certification witness validity;
- cache policy by asset class;
- all security headers;
- 404 certification;
- hidden/private asset exclusion;
- `/.well-known/ii-alternative-origins` content and certification when configured;
- no inline script/style violations.

---

# Part VII — Testing strategy

## 32. Rust unit tests

Use table-driven tests and property tests where useful for:

- every rule ID in pass and fail states;
- raw duplicate manager and delegate detection;
- exact singleton semantics;
- unknown topic handling;
- timestamp boundaries;
- deciding/potential power mismatch;
- `not_for_profit` and hotkey failures;
- blackhole evidence states;
- canonical digest stability;
- bounded encoding lengths;
- cache eviction and cooldown logic;
- u64 parsing and formatting.

Create pure evidence fixtures so rule tests do not need PocketIC.

## 33. Candid and source-drift tests

- Check exported `dendrite.did` against the Rust interface.
- Check minimal NNS and management subsets against pinned upstream Candid.
- Test decoding with omitted optional fields and newly unknown variants.
- Fail closed on incompatible drift.

## 34. PocketIC integration tests

Build small mocks for NNS Governance and required behaviour. Cover:

- fully compliant candidate;
- not known;
- missing committed topic;
- stale voting power;
- non-max dissolve delay;
- controller not a canister;
- controller has Wasm;
- controller retains a controller;
- target hotkey present;
- `not_for_profit = true`;
- fewer than five managers;
- duplicate managers;
- non-known manager;
- committed delegate outside manager set;
- delegate follows omega-vote or another neuron instead of omega-reject;
- delegate follows omega-reject plus another neuron;
- non-committed topic does not follow alpha exactly;
- upstream timeout/rejection/oversized response;
- cache, cooldown, rate limit, cycle reserve, and upgrade persistence;
- certified asset responses.

Use the real management-canister `canister_info` in PocketIC where possible; otherwise isolate and test the minimal client adapter.

## 35. Frontend unit tests

Use Node's test runner. Cover:

- hash routing;
- exact u64 ID parsing;
- omega-reject BigInt/string round trip;
- status and rule rendering;
- authority matching against controller/hotkeys;
- no false authority from public visibility;
- outer/inner proposal construction;
- Candid optional/variant conversion;
- post-state following validation;
- majority math;
- command-specific validation;
- simulation error gating;
- hotkey onboarding controller-only logic;
- reward-receiver state classification;
- no history route/component/API exists.

## 36. Browser/end-to-end tests

Automate at least local happy paths for:

- landing navigation;
- compliant and non-compliant page rendering;
- login state using a controlled local identity test harness;
- eligible and ineligible control panel states;
- proposal review and simulation;
- no call after failed simulation;
- live proposal filtering;
- keyboard navigation and accessible labels.

## 37. Security tests

- XSS regression corpus in all on-chain fields;
- malformed Candid and oversized response handling;
- arbitrary outbound target impossible by API/type construction;
- delegation never appears in canister calls, logs, stable state, or crash output;
- CSP tests;
- ID precision tests;
- stable-state corruption/migration failure handling;
- cycle exhaustion and refresh-flood tests.

## 38. Coverage

Set meaningful coverage floors rather than gaming percentages:

- pure standard/rule engine: at least 95% line and branch coverage;
- payload builders and authority logic: at least 90%;
- overall Rust and frontend: at least 85%;
- every mandatory rule and every submit-enabled command form has direct tests.

Document justified exclusions.

---

# Part VIII — Reproducibility and supply-chain security

## 39. Toolchain and lockfiles

Start from the Jupiter Faucet baseline where compatible:

- pinned Rust toolchain, initially `1.94.1` unless current IC SDK compatibility requires a documented change;
- `wasm32-unknown-unknown` target;
- exact Node/npm dependency versions;
- checked-in `Cargo.lock` and `package-lock.json`;
- `npm ci`, never floating install behaviour;
- no Git dependencies without pinned revisions and documented justification.

Suggested Rust dependency baseline where compatible:

- `candid = 0.10`
- `ic-cdk = 0.20.1`
- `ic-stable-structures = 0.7`
- `pocket-ic = 13`
- `ic-asset-certification = 3.2.0`
- `ic-http-certification = 3.2.0`
- `include_dir = 0.7`

Codex must verify mutual compatibility rather than blindly copying versions. Any update is exact-pinned and explained.

## 40. Reproducible container build

Provide `Dockerfile.repro` that:

- pins the Linux base image by digest;
- uses a snapshot package repository or otherwise pins OS package inputs;
- pins Rustup/toolchain/install checksums;
- pins npm and every downloaded build utility;
- builds frontend before Wasm;
- normalises timestamps and environment;
- emits only final artifacts and manifests from a scratch/export stage;
- records tool versions and source revision;
- produces identical output on two clean runs.

Provide scripts and `cargo xtask` commands to compare SHA-256 hashes and fail on mismatch.

## 41. Security scanning

Provide root commands for:

- Rust formatting and strict Clippy;
- `cargo audit`;
- `cargo deny` licences, bans, advisories, and sources;
- OSV scan for npm and repository manifests;
- npm lockfile hermeticity checks;
- CycloneDX SBOM for production Rust and npm dependencies;
- production-dependency reachability review;
- secret scanning;
- reproducibility verification.

Document any exception with owner, reason, exposure analysis, compensating control, and expiry/review date.

---

# Part IX — Documentation

## 42. Required documents

Create at least:

- root `README.md` with purpose, quickstart, architecture, and verification links;
- `docs/standard/NNS_DENDRITE_STANDARD.md`;
- `docs/architecture/overview.md`;
- `docs/architecture/data-flow.md`;
- `docs/security/threat-model.md`;
- `docs/security/trust-boundaries.md`;
- `docs/security/dependency-policy.md`;
- `docs/development/local-development.md`;
- `docs/development/testing.md`;
- `docs/development/reproducible-builds.md`;
- `docs/operations/deployment.md`;
- `docs/operations/upgrades-and-stable-memory.md`;
- `docs/operations/cycles-and-rate-limits.md`;
- `docs/operations/incident-response.md`;
- `docs/operations/source-to-wasm-verification.md`;
- `docs/operations/dendrite-neuron-setup-checklist.md`;
- ADRs for consequential architectural decisions.

Documentation must state clearly that proposal history is intentionally not retained.

## 43. Dendrite neuron setup checklist

Document the irreversible sequence:

1. Create a dedicated controller canister under temporary setup control.
2. Create/claim the NNS neuron with that canister principal as controller from the outset.
3. Stake the intended ICP amount.
4. Set Not Dissolving at current maximum dissolve delay.
5. Set/verify `not_for_profit = false`.
6. Remove every target hotkey.
7. Configure 5–15 distinct known neurons as Neuron Management followees.
8. Configure at least three of those managers per committed topic.
9. Configure each selected delegate to follow omega-reject `18422777432977120264` exactly on that topic.
10. Configure every non-committed topic and CatchAll to alpha-vote `2947465672511369` exactly.
11. Register/update known-neuron data with the intended non-empty committed topics.
12. Run Dendrite and resolve all non-controller-blackhole failures.
13. Uninstall the controller canister's Wasm.
14. Set that canister's controllers to an empty list.
15. Run Dendrite again and archive the evidence, build hashes, setup transaction IDs, and proposal IDs externally.

Dendrite provides a checklist and verifier, not a one-click blackholing operation.

---

# Part X — Implementation sequence for Codex

## 44. Phase 0 — repository and decisions

- Initialise Git.
- Copy this specification into `docs/standard` while retaining the root source file.
- Create implementation plan and ADR skeletons.
- Pin toolchains and create minimal workspace/package manifests.
- Establish root `xtask` and CI-equivalent local commands.

Exit criterion: clean skeleton builds, formats, and has no production feature placeholders hidden behind fake success.

## 45. Phase 1 — pure types and rule engine

- Implement IDs, topics, normalised evidence, statuses, rule IDs, snapshot schema, and canonical digest.
- Implement every mandatory rule with exhaustive unit fixtures.
- Add u64/omega precision tests.

Exit criterion: pure standard engine meets its coverage floor and has no IC runtime dependency.

## 46. Phase 2 — minimal external clients

- Create checked-in Candid subsets.
- Implement bounded NNS Governance and management-canister clients.
- Add mock adapters and drift tests.
- Implement live evidence collection and typed error aggregation.

Exit criterion: complete compliant/non-compliant evaluations pass integration fixtures.

## 47. Phase 3 — canister API, cache, and assets

- Implement rate limiting, cycle reserve, in-flight deduplication, bounded stable cache, API, and upgrades.
- Implement certified asset routing and security headers.
- Add PocketIC tests.

Exit criterion: one canister serves frontend and live/cached compliance API; no unbounded state or timers.

## 48. Phase 4 — read-only frontend

- Build landing route, neuron page, safe renderers, refresh flow, provenance, responsive/accessibility behaviour.
- Add frontend tests and XSS corpus.

Exit criterion: anonymous users can inspect a neuron and understand every rule result.

## 49. Phase 5 — identity and authority

- Integrate Internet Identity.
- Display stable principal/origin information.
- Implement exact manager authority recognition.
- Implement honest controller-only hotkey onboarding payloads and verification.

Exit criterion: control panel appears only for exact verified controller/hotkey authority.

## 50. Phase 6 — proposal control panel

- Implement universal nested request builder and exact decode review.
- Implement simulation and submit pipeline.
- Implement the three primary guided flows.
- Implement live open Neuron Management proposal voting.
- Implement every current typed advanced command and exclusions.
- Implement reward-receiver helper.

Exit criterion: all submit-enabled commands are simulated, reviewed, and directly signed in browser; no delegation touches Dendrite canister.

## 51. Phase 7 — hardening and release evidence

- Complete threat model and operator docs.
- Add supply-chain scans and SBOM.
- Build reproducibly twice and compare.
- Run complete test/coverage suite from a clean checkout.
- Produce release manifest with source revision, Wasm hash, frontend manifest hash, dependency hashes, and exact commands.

Exit criterion: all acceptance criteria below pass.

---

# Part XI — Acceptance criteria

## 52. Functional acceptance

- A canonical neuron ID opens a shareable page.
- Omega-reject ID is represented exactly everywhere.
- A fully compliant mock is `COMPLIANT` and every rule passes.
- Each mandatory defect produces the correct stable rule failure.
- Unknown NNS topic/command semantics fail visibly.
- A logged-out user can inspect compliance.
- Login shows the Dendrite principal and canonical origin.
- Manager controls appear only after exact authority proof.
- Hotkey onboarding never claims an existing hotkey can add another hotkey.
- Guided SetFollowing, RefreshVotingPower, and RegisterVote proposal flows work.
- All current command variants are typed and either submit-enabled with simulation or explicitly protocol-disabled.
- Open Neuron Management proposals are fetched live and never persisted.
- Reward-receiver setup explains sole-manager consequences.
- There is no history page, history API, proposal index, timer, or durable proposal record.

## 53. Security acceptance

- Target hotkeys and `not_for_profit = true` are mandatory failures.
- Blackhole verification requires both no Wasm and zero controllers.
- No user delegation or secret reaches canister state/logs.
- No arbitrary outbound call primitive exists.
- Dynamic content has XSS regression coverage.
- All mutations show exact action, simulate, and confirm.
- Cache and upstream responses are strictly bounded.
- Refresh flooding and low-cycle behaviour fail safely.
- CSP and certified responses pass automated checks.

## 54. Engineering acceptance

- One production Wasm.
- Root check/test/build/security/repro commands work on a clean checkout.
- Required coverage floors pass.
- Candid drift checks pass against pinned upstream source.
- `cargo audit`, `cargo deny`, OSV, lockfile checks, and SBOM complete successfully or have documented time-bounded exceptions.
- Two clean reproducible builds are byte-identical.
- Documentation is sufficient for an independent reviewer to build, verify, deploy, upgrade, and recover the canister.

---

# Part XII — Current source anchors

Codex should confirm current official source before finalising interfaces, but these paths and behaviours are the reviewed baseline:

- NNS Governance Candid: `rs/nns/governance/canister/governance.did`
- NNS Governance proto: `rs/nns/governance/proto/ic_nns_governance/pb/v1/governance.proto`
- Proposal validation and Neuron Management electorate: `rs/nns/governance/src/governance.rs`
- Neuron permissions and `not_for_profit`: `rs/nns/governance/src/neuron/types.rs`
- Following validation: `rs/nns/governance/src/pb/mod.rs`
- Management `canister_info` types: `rs/types/management_canister_types/src/lib.rs`
- Management method execution/permissions: `rs/execution_environment/src/execution_environment.rs` and `ic00_permissions.rs`
- Internet Identity alternative origins: official Internet Computer documentation

Any semantic difference discovered against the current mainnet interface must be documented before implementation proceeds. Do not silently preserve an outdated assumption.

---

## 55. Final Codex report

At completion, report:

- concise architecture summary;
- repository tree;
- commits/checkpoints made;
- all commands run and their results;
- coverage figures;
- security scan and SBOM results;
- reproducible artifact hashes from both builds;
- Candid/source baseline used;
- mainnet configuration values requiring operator input, especially canonical derivation origin/domain;
- known limitations and explicitly deferred items;
- confirmation that proposal history is not stored and omega-reject is `18422777432977120264`.
