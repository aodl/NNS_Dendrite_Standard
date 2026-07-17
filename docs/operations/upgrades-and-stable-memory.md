# Upgrades and stable memory

Stable memory ID 0 contains a `StableBTreeMap<nat64, snapshot-record>`. Records use a hard 1 MiB encoded bound; the cache holds at most 256 entries. When full, eviction chooses the least recently checked snapshot, breaking ties by neuron ID. Asset certification is re-established in `post_upgrade`.

Before upgrading, build and verify Candid compatibility, stable schema compatibility, and reproducible hashes on a local replica. Do not deploy when migration tests fail. The current schema does not store proposal data or history.
