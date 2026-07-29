# Architecture

Dendrite is exactly one stateless Rust canister. It embeds and certifies the frontend,
accepts anonymous update `check_neuron` calls, obtains bounded live evidence from fixed
NNS Governance `list_neurons` and management-canister `canister_info` calls, evaluates
the standard, and returns the report. Certified assets are served by the sole query
application method, `http_request`.

```text
Preliminary:
Browser -> anonymous signed Governance list_neurons queries
        -> strict browser validation/normalisation
        -> browser evaluator -> qualified preliminary report

Authoritative:
Browser -> Dendrite check_neuron update
        -> fixed NNS/management reads -> Rust evaluator
        -> consensus-verified report

Privileged:
Browser -> Internet Identity -> Governance-only browser delegation
        -> fresh Dendrite check_neuron preflight
        -> fixed NNS Governance mutation -> receipt -> unverified resulting state
```

There is no application stable state, result cache, report or transaction history,
timer, polling, analytics, off-chain service, or background work. A small heap-only
abuse guard resets on upgrade. Dependencies are requested in batches of at most 50,
within the derived 272-ID graph bound.

The live-analysis path uses a separately generated, query-only Governance declaration
whose only method is `list_neurons`. Its production `HttpAgent` is anonymous, fixed to
`rrkah-fqaaa-aaaaa-aaaaq-cai` and `https://icp-api.io`, enables query-signature
verification, and never fetches a root key. The target is loaded first; required
anchors, managers, and committed-topic delegates are then sorted, deduplicated and
loaded in batches of at most 50 through a promise cache that is discarded on route
change or explicit refresh. Failed entries are evicted for retry. Nothing is persisted.

Browser validation rejects an entire malformed batch before normalisation. The
browser evaluator mirrors the Rust evidence and policy model. For the exact controller
principal in the validated Governance response, one anonymous `read_state` verifies
controllers, module-hash presence or certified absence, certificate time, effective
canister binding, delegation, and canister range. Invalid or ambiguous certified state
is discarded as a whole. Live evidence never enables
transaction controls and never satisfies transaction final preflight.

The report presentation consumes the `ComplianceReport` without changing it. A focused
diagnostic view model derives factual outcome explanations, observed/expected evidence,
safe related links, topics, and IDs from structured report fields. It never parses a
message to discover a principal. Stable `RULE_DESCRIPTIONS` remain normative
requirements and are rendered after the outcome explanation. A presentation-only
aggregation model groups entries by exact `rule_id`, retains every entry, orders
topic instances canonically, and chooses the aggregate status using `Fail`, standard
update required, indeterminate, warning, then pass precedence. The page orders its flat
header, overall result and distinct-rule status counts, visible key characteristics, one
canonical table row per Standard rule, managers, topic delegation, and technical
evidence. The rule result remains visible while its supporting details are collapsed.
Multi-entry detail rows show the reviewed explanation and aggregate result followed by
every exact topic evaluation, message, observed/expected value, and related neuron in a
compact internal table. The technical rule ID, complete unaggregated rule table, and raw
report remain in technical evidence. Unknown future IDs use an explicit technical
fallback. Policy states
remain `Pass`, `Fail`, `Indeterminate`, `Warning`, and
`Standard update required`; only the preliminary presentation calls the three
controller-dependent indeterminate states `Requires verification`.

The sole optional `Attention only` control uses aggregate status and hides all-pass
groups without changing their complete counts. Every group is a native-button
disclosure: all-pass groups default closed, while fail, standard-update, indeterminate,
warning, or verification-required groups default open. Closing a group clears every
child rule disclosure. One shared summary model counts each aggregate once, always
shows pass and fail (including zero), and separately records all policy evaluations.
Row, group, and lower-section expansion remain ephemeral DOM state. These controls
never alter the route, report, evaluator, or network. Semantic section IDs remain valid
anchor targets, but the prior sticky section-navigation toolbar is removed. Managers and
topic delegation each have one disclosure level; technical evidence is a normal section
whose child disclosures are not nested in an outer accordion.

The visual system uses a local system-font stack, a seven-step spacing scale, two
non-pill radii, a pale canvas, white and subtle surfaces, strong text, restrained green
accent, and distinct pass, fail, warning, and indeterminate colours. Status always pairs
an icon with text and has no rule-row pill. Preliminary or stale reports reserve the
single filled primary action for `Verify on-chain`; current consensus demotes repeat
verification and `Refresh preliminary` is always quiet. Whitespace and dividers replace
decorative shadows, nested cards, and filled disclosure controls.

Each preliminary load and consensus verification has a unique operation owner bound to
the route generation and canonical neuron ID. Route changes, landing transitions,
preliminary refreshes, replacement checks, and potentially executed mutations revoke
older owners and release their loading state. Only the current owner may publish a
report, error, trust label, route transition, or loading completion. Repeated Verify
activation while the current owner is pending does not create a second authoritative
request.

Internet Identity and privileged operations run only in the browser. The at-most
eight-hour delegation targets NNS Governance, never Dendrite. The browser compares its
principal with live manager evidence locally and sends reviewed typed mutations
directly to Governance. It never constructs an authenticated Dendrite actor.
Once the update boundary may have been crossed, an unknown transaction outcome
immediately stales the context's authoritative evidence while retaining preliminary
evidence, request digest, and the explicit no-retry acknowledgement lock.

The certified frontend binds served bytes to installed Wasm. It does not prove browser
integrity, operator intent, or controller policy. Dendrite's application controller is
distinct from a target neuron's blackholed controller canister and retains reviewed
upgrade authority.

The canonical Internet Identity derivation origin is an immutable production build
input. Changing it changes Dendrite principals and is a security migration. Alternative
origins are normalized, unique, bounded, certified, and operator-controlled;
unexpected origins cannot authenticate. Production configuration and identifiers are
authoritative only in [deployment](operations/deployment.md).
