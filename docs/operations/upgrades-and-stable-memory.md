# Upgrades and stateless operation

Dendrite has no stable application state and therefore no snapshot schema, migration,
cache metadata, counters, configuration, or operational recovery data. Its heap-only
abuse guard resets on upgrade. Embedded asset certification is deterministically rebuilt
from the same content-hashed frontend files during initialization and post-upgrade.
The guard alone uses local canister time. `checked_at_timestamp_seconds` is the NNS
evidence snapshot and is never preserved across upgrades.

Before upgrading, verify the narrow Candid API, semantic upstream interface drift,
PocketIC certified-asset upgrade test, full checks, and reproducible hashes. An upgrade
does not preserve live checks in flight or any report; callers may submit another live
`check_neuron` after the upgrade.
