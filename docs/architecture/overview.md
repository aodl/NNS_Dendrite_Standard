# Architecture overview

The production output is exactly one canister, `dendrite`. The Rust canister owns five narrow responsibilities: fixed-destination typed reads, evidence normalization, pure rule evaluation, bounded stable snapshots, and certified HTTP assets. The browser uses an anonymous actor for cached and live compliance calls. It never sends an Internet Identity delegation to Dendrite.

Governance destination and method names are compile-time constants. The only other destination is the management canister, used solely for `canister_info` of the target controller. There is no public or internal caller-driven proxy primitive.

The source interface baseline is `dfinity/ic@d55a0f4d4edfabe49d8fd543aff473084cb741f2`; see `docs/standard/SOURCE_BASELINE.md`.
