# Architecture overview

The production output is exactly one canister, `dendrite`. Its only application methods
are update `check_neuron` and certified-asset query `http_request`. The Rust canister
performs fixed-destination typed evidence calls, normalizes evidence, runs the pure rule
engine, returns the complete live report, and stores no application data.

One `EvidenceClient` boundary exposes only Governance `list_neurons(ids)` and management
`canister_info(controller)`. Destinations and method names are compile-time constants;
there is no generic transport. Dependency calls use batches of at most 50 and the graph
is capped at a derived 272 unique IDs. Each atomic batch yields found, confirmed-missing, or
unavailable evidence per ID. Known-neuron status comes from `Neuron.known_neuron_data`.
The target's validated `NeuronInfo.retrieved_at_timestamp_seconds` is the activity-rule
clock and the report's `checked_at_timestamp_seconds`; local canister time is confined
to the abuse guard.

The frontend is embedded and served through the official HTTP certification v2 asset
router and embeds one explicitly validated canister ID, API host, and root-key policy.
A small heap-only abuse guard resets on upgrade and prunes abandoned entries on later
admission. There is no stable application
state, dynamic compliance certification, cache, timer, history, delegation custody, or
authenticated control panel. Future privileged operations are browser-to-NNS.

This completes the anonymous-verifier architecture. Internet Identity and authenticated
governance functionality remain the next product tranche, so the broader product is not
yet complete against the original brief.

The interface baseline is `dfinity/ic@d55a0f4d4edfabe49d8fd543aff473084cb741f2`;
see `docs/standard/SOURCE_BASELINE.md`.
