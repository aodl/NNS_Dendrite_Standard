# Dendrite build specification

**Status:** normative anonymous-verifier tranche

**Standard identifier:** `nns-dendrite/1.0-draft`

**Pinned NNS source:** `d55a0f4d4edfabe49d8fd543aff473084cb741f2`

## 1. Product

Dendrite does exactly five things:

1. serves a certified landing page from one Rust canister;
2. accepts a canonical NNS neuron ID;
3. executes one live consensus-backed verification;
4. displays the complete NNS Dendrite Standard report; and
5. stores no application data.

Internet Identity, manager recognition, hotkey onboarding, proposal construction,
simulation, submission, voting, rewards assistance, open-proposal views, and universal
command forms are excluded. A later reviewed tranche may add browser-only identity and
direct browser-to-NNS operations. Dendrite must never receive or reconstruct a user
delegation. Proposal history, timers, indexers, analytics, and background work remain
out of scope.

## 2. Fixed standard constants

- Alpha-vote: `2947465672511369`.
- Omega-reject: `18422777432977120264`; it is never omega-vote.
- Source revision: `d55a0f4d4edfabe49d8fd543aff473084cb741f2`.
- `ONE_DAY_SECONDS = 86_400`, `ONE_YEAR_SECONDS = (4 * 365 + 1) *
  ONE_DAY_SECONDS / 4`, and `ONE_MONTH_SECONDS = ONE_YEAR_SECONDS / 12`.
- Maximum dissolve delay: `2 * ONE_YEAR_SECONDS = 63_115_200` seconds, established by
  the pinned post-Mission-70 Governance source. A future change requires a new
  standard/source revision, not a runtime economics call.
- Recent voting-power refresh threshold: `6 * ONE_MONTH_SECONDS = 15_778_800`
  seconds.
- Maximum followees per topic: 15.
- Minimum distinct managers: 5.
- Target hotkeys: empty.
- Target `not_for_profit`: false.

NNS IDs are `nat64`; JavaScript uses canonical decimal strings or `bigint`, never
`number`.

## 3. Result semantics

Rule statuses are `PASS`, `FAIL`, `WARNING`, `INDETERMINATE`, and
`STANDARD_UPDATE_REQUIRED`. Overall status is, in order:

1. `NON_COMPLIANT` if any mandatory rule fails;
2. `STANDARD_UPDATE_REQUIRED` if none fail and any requires a standard update;
3. `INDETERMINATE` if neither above applies and mandatory evidence is unavailable;
4. otherwise `COMPLIANT`.

Factual mismatches are `FAIL`. Rejected, undecodable, oversized, or otherwise
unavailable upstream evidence is `INDETERMINATE`. Unknown protocol semantics are
`STANDARD_UPDATE_REQUIRED`. Evaluation emits every independent result supported by
available evidence and never invents a pass.

The returned `ComplianceReport` contains:

- standard version, pinned source revision, target ID, and NNS evidence snapshot timestamp;
- explicit target summary where available;
- manager summaries;
- committed-topic summaries;
- non-committed-topic checks;
- controller-canister evidence;
- rule results;
- bounded typed source failures; and
- overall status.

Each `RuleResult` contains only a stable rule ID, status, concise message, optional
observed and expected values, optional topic code, and related neuron IDs. The report
does not contain a digest, cache timestamp, stale flag, provenance graph, or flattened
generic summary-field list.

## 4. Mandatory standard rules

### Target and committed topics

- `DENDRITE-KNOWN-001`: the target is returned as a full public neuron.
- `DENDRITE-KNOWN-002`: the target has valid `known_neuron_data`.
- `DENDRITE-KNOWN-003`: at least one committed concrete topic exists.
- `DENDRITE-KNOWN-004`: committed topics are distinct, known, and exclude CatchAll
  and Neuron Management. Known factual invalidity takes precedence over an unknown
  variant; otherwise an unknown variant requires a standard update.

### Locked, active posture

- `DENDRITE-LOCK-001`: target is not dissolving.
- `DENDRITE-LOCK-002`: dissolve delay is exactly `63_115_200` seconds.
- `DENDRITE-LOCK-003`: effective stake is positive.
- `DENDRITE-ACTIVE-001`: voting power was refreshed within six nominal months.
- `DENDRITE-ACTIVE-002`: deciding voting power equals positive potential voting power.

### Controller and target settings

- `DENDRITE-CONTROL-001`: target controller exists and `canister_info` succeeds.
- `DENDRITE-CONTROL-002`: controller canister has no Wasm module.
- `DENDRITE-CONTROL-003`: controller canister has no controllers.
- `DENDRITE-CONTROL-004`: target raw hotkey list is empty.
- `DENDRITE-CONTROL-005`: target has `not_for_profit = false`.

### Neuron Management managers

- `DENDRITE-NM-001`: raw manager count is between 5 and 15.
- `DENDRITE-NM-002`: raw manager IDs are distinct; never deduplicate first.
- `DENDRITE-NM-003`: target is not its own manager.
- `DENDRITE-NM-004`: every manager is returned as a full public known neuron with
  valid `known_neuron_data`.
- `DENDRITE-NM-005`: alpha-vote and omega-reject are each returned as full public
  known neurons.

### Committed delegation

For each committed topic:

- `DENDRITE-COMMIT-001`: raw delegate vector has at least three entries.
- `DENDRITE-COMMIT-002`: raw delegate IDs are distinct.
- `DENDRITE-COMMIT-003`: every delegate is a manager and is a full public known
  neuron.
- `DENDRITE-COMMIT-004`: every delegate follows exactly the singleton
  `[18422777432977120264]` on that topic.

### Non-committed following

- `DENDRITE-DEFAULT-001`: every recognised non-committed concrete topic other than
  Neuron Management follows exactly `[2947465672511369]`.
- `DENDRITE-DEFAULT-002`: CatchAll follows exactly `[2947465672511369]`.
- `DENDRITE-DEFAULT-003`: an unknown non-empty following topic code requires a
  standard update.

### Evidence integrity

- `DENDRITE-DATA-001`: every required lookup reached terminal `Found` or
  `ConfirmedMissing`; any `Unavailable` dependency is indeterminate.
- `DENDRITE-DATA-002`: check timestamp, standard version, pinned source revision, and
  bounded source-failure data are present. Fixed destinations are architectural
  constants, not invented dynamic evidence.
- `DENDRITE-DATA-003`: no rule whose required lookup is `Unavailable` passes by
  default. A confirmed omission is complete factual evidence.

Raw following vectors and map-like Candid vectors must remain intact until duplicate
checks finish. Duplicate topic keys, duplicate target/dependency records, unexpected
records, and contradictory records are invalid responses, not values to overwrite.
Activity is evaluated against `NeuronInfo.retrieved_at_timestamp_seconds` from the
target response. A refresh timestamp after that NNS snapshot invalidates the target
batch; Dendrite canister time is not cross-compared with NNS timestamps.

## 5. Topics and graph bound

Recognise the complete `TopicToFollow` domain from the pinned source: CatchAll,
Neuron Management, Exchange Rate, Network Economics, Governance, Node Admin,
Participant Management, Subnet Management, Application Canister Management, KYC,
Node Provider Rewards, IC OS Version Deployment, IC OS Version Election, SNS and
Community Fund, API Boundary Node Management, Subnet Rental, Protocol Canister
Management, and Service Nervous System Management. Reserved topic code 11 and any
future non-empty code require a standard update.

The defensive graph proof includes every recognised topic list because an invalid
target may commit CatchAll or Neuron Management. With 18 recognised topic lists, at
most 15 followees per list, plus alpha-vote and omega-reject, the unique dependency set
cannot exceed `18 * 15 + 2 = 272` IDs. The implementation derives this bound from the
recognised domain and followee limit rather than maintaining a bare literal.

Known-neuron data is bounded in bytes exactly as in the pinned source: name 200,
description 3,000, at most 10 links, and 100 per link. Valid strings are preserved
exactly rather than truncated. Semantic interpretation uses the 18-variant recognised
`TopicToFollow` domain, while target committed-topic and following-map wire vectors use
a separate defensive bound of 64 entries so modest future variants reach standard-
update rules. Dependency committed topics are not interpreted. Each followee vector
remains bounded to 15. Hotkeys, controller lists, module hashes, and returned full-
neuron collections retain their pinned bounds. Impossible stake subtraction or
addition invalidates the batch.

## 6. Production architecture and API

There is exactly one production canister, `dendrite`. It embeds deterministic frontend
assets, serves them through HTTP certification v2, collects fixed public evidence, and
runs the pure rule engine.

Its application API is exactly:

```candid
service : () -> {
  check_neuron : (nat64) -> (CheckResult);
  http_request : (HttpRequest) -> (HttpResponse) query;
}
```

Generated Candid support methods do not count as application APIs. There is no cached,
refresh, status, configuration, history, proposal, authentication, or generic outbound
method. `check_neuron` is an update call and its response is the trusted live result.
Dynamic compliance certification and client-side Merkle proofs do not exist.

The canister has no stable application state. It stores no report, digest, configuration,
counter, rate-limit record, history, delegation, or user data. Asset certification is
recreated from embedded assets at install and upgrade. The only mutable runtime state is
a tiny heap-only abuse guard, which may reset on upgrade and is not publicly exposed.

## 7. Minimal evidence client and interfaces

Use one narrow `EvidenceClient` trait with exactly:

- `list_neurons(ids)`; and
- `canister_info(controller)`.

Provide one fixed-destination production implementation and one recording fake for
tests. No caller can supply a destination, method name, principal, or Candid blob.
Production Governance calls go only to the compile-time NNS Governance principal and
method `list_neurons`. Management calls go only to the management canister method
`canister_info` with `num_requested_changes = 0`.

Use a small checked-in reviewed Candid subset containing only exact wire types required
by those methods. Production builds do not fetch interfaces, run bindgen, depend on
broad `dfinity/ic` crates, or include generic transport. Keep semantic drift checks
against the pinned upstream source.
The `NeuronInfo` subset retains only `retrieved_at_timestamp_seconds`; additional
upstream record fields are skipped by Candid decoding.

Known-neuron status comes only from `Neuron.known_neuron_data`. Never call
`list_known_neurons`, `get_network_economics_parameters`, proposal methods, or mutation
methods.

Typed source failures remain typed through collection and are bounded. Each records the
fixed method, kind, concise message, and affected neuron IDs. The taxonomy is
`Rejected`, `DecodeFailed`, `InvalidResponse`, and `ResponseTooLarge`. A successful
response that omits a requested full public neuron is evidence, not a source failure.

## 8. Exact live call plan

1. Call `list_neurons` for the target with public full-neuron inclusion enabled.
2. Validate the target batch atomically, including page count, full-neuron and
   neuron-info IDs, duplicates, topic keys, pinned collection bounds, stake arithmetic,
   and a nonzero matching target NNS snapshot timestamp.
3. If a valid successful response omits the target, return a completed `NON_COMPLIANT`
   report; if the call or batch is unavailable, return `INDETERMINATE`. In either case,
   make no dependency or controller call.
4. Otherwise preserve raw following vectors; extract raw managers and committed-topic
   delegates; add alpha-vote and omega-reject; build the unique dependency set.
5. Enforce the derived 272-dependency invariant.
6. Split dependencies into batches of at most 50 IDs and call `list_neurons` once per
   batch.
7. Validate each batch atomically. Every requested ID becomes `Found`,
   `ConfirmedMissing`, or `Unavailable`; an invalid batch retains no partial record.
8. Treat confirmed omissions as factual failure of their known-neuron requirements and
   unavailable evidence as indeterminate only for rules that require affected IDs.
9. Call `canister_info` for the target controller with zero requested changes.
10. Normalize evidence, run the pure engine, return the report, and store nothing.

## 9. Abuse protection

Before admission, reject a zero ID and reject when liquid cycles are below the fixed
reserve. In heap memory only, reject a simultaneous check for the same neuron, cap total
concurrent checks at two, and cap globally admitted starts in a short fixed window.
Return one bounded suggested delay for temporary rejection. The guard resets on upgrade,
has no stable persistence, no per-user state, and no public counters. Each admission
prunes in-flight entries at least 300 seconds old so a post-await trap cannot consume a
slot indefinitely.
The local canister clock is used only for this operational guard, including rate-window
and in-flight expiry behavior; it is never exposed as the NNS evidence timestamp.

## 10. Certified frontend

Use pinned maintained `ic-asset-certification`, `ic-http-certification`, and
`include_dir` with `AssetRouter`, HTTP certification v2, certified status/headers/body,
and deterministic paths. Serve `/`, `/index.html`, content-hashed JS and CSS,
`/404.html`, and `/.well-known/ii-alternative-origins` containing an empty list.

HTML, error pages, and well-known files use no-cache. Content-hashed assets use immutable
caching. Responses have correct MIME types, CSP, `X-Content-Type-Options`, referrer and
permissions policies, frame restrictions, and HSTS where appropriate. No second asset
canister or unrelated routing/compression/social-image machinery exists.

The frontend validates a canonical non-zero decimal `u64`, calls
`check_neuron(BigInt(id))`, shows loading, renders the complete live report or a typed
error, and offers `Check again`, which makes another live update call. It never labels a
result cached, stale, or refreshed.

All dynamic content uses constructed text nodes or `textContent`; never `innerHTML`.
Validate HTTPS links, preserve keyboard access and responsive status/error rendering,
and never convert an NNS ID through JavaScript `number`. `DENDRITE_CANISTER_ID` is a
mandatory build input (with `CANISTER_ID_DENDRITE` accepted from `dfx`) and is validated
with `Principal.fromText`; it never comes from a hostname. Production accepts only
`https://icp-api.io`, root-key fetching defaults off, and production builds reject
root-key fetching. Local mode accepts only `http://127.0.0.1:4943` and
`http://localhost:4943` and may enable root-key fetching. Certified `connect-src`
permits exactly those origins plus same-origin. Delete unfinished `authority.js`,
`proposals.js`, and `rewards.js` from production sources.

## 11. Required tests and quality gates

Rust tests cover a compliant fixture and one focused mutation per mandatory rule,
duplicate manager/delegate IDs, duplicate topic-map keys, unknown topics, rejection,
decode failure, target/dependency omission, controller Wasm/controllers, hotkeys,
`not_for_profit`, batches at 50/51/>100, unexpected responses, and exact omega-reject
`u64` round trip. Collector tests use one recording fake and assert exact calls, batches,
early exit, and the absence of a generic destination/method boundary.

PocketIC covers one compliant and one non-compliant end-to-end check with a minimal
fixed-principal Governance mock, upstream rejection, real empty controller inspection
where supported, certified landing response, and certified assets after upgrade. No
browser automation framework is required.

Frontend tests cover ID parsing, the actual application bootstrap and routes, loading,
live success/error/retry, every overall status and public error, controller evidence,
topic labels, malicious text/links/errors, mandatory custom-domain-independent
configuration, no `innerHTML`, and no numeric ID conversion. Coverage includes every
production frontend module even if a test omits an import.

Whole-workspace Rust line coverage must exceed 85%; frontend thresholds remain at 85%.
Do not split modules merely to manipulate coverage.

## 12. Supply chain and reproducibility

Keep pinned Rust/Node/npm versions, lockfiles, digest-pinned build images, verified
downloaded tools, deterministic asset names, byte comparison of two clean builds,
artifact hashes, and CycloneDX SBOMs. Root Cargo repository metadata is
`https://github.com/aodl/NNS_Dendrite_Standard`. All xtask Cargo invocations use
`--locked`; xtask remains a thin dispatcher.

Prove `pocket-ic`, `backoff`, and `instant` are absent from the production Dendrite Wasm
normal/build dependency tree. Test-only unmaintained dependencies receive package-
specific documented exceptions with owner and removal condition. Distinguish test-only
`serde_cbor` reachability from any production reachability through certification
libraries; do not use blanket suppressions.

Required root checks are formatting, warnings-denied Clippy, `cargo xtask check`,
`test`, `coverage`, `build`, interface drift, PocketIC, `npm ci`, `npm test`, frontend
coverage, production reachability, security scan, SBOM, reproducible build, and
reproducibility verification. A command is passing only if it actually exits
successfully. Do not lower coverage or security thresholds.

## 13. Documentation and completion

Update the existing README, standard, architecture, threat model, testing,
reproducible-build, deployment, upgrade, and operator documents; do not add documents.
They must state that every check is a live update, no result/history/timer exists, no
delegation reaches the canister, and all identity/governance functionality is deferred.

Completion requires one canister, one live verification update method, no cache/stable
application state/digest/catalogue/economics call, batches of at most 50, correct
omission/failure/unknown semantics, official HTTP certification v2, live-only frontend,
production dependency isolation, passing coverage/scans/PocketIC/frontend tests, and
byte-identical clean builds.

The final report records commits; line/file deltas; Candid API; exact outbound methods,
destinations, and source revision; command results and coverage; PocketIC and dependency
reachability; scan exceptions; Wasm/frontend/SBOM/reproducible hashes; byte identity;
limitations; and explicit deferral of Internet Identity and governance controls.

The anonymous-verifier tranche is complete once these requirements pass. The product
as a whole remains incomplete against the original brief: Internet Identity and
authenticated governance controls are explicitly deferred to the next tranche.
