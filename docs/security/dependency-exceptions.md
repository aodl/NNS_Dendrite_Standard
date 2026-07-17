# Dependency exceptions

## RUSTSEC-2024-0436 (`paste` 1.0.15)

- Owner: Dendrite maintainers
- Review date: 2026-10-17
- Reason: `paste` is an unavoidable transitive build dependency of the pinned `candid 0.10.24` interface stack. The advisory reports abandonment, not a vulnerability, and no compatible upstream release removes it.
- Exposure: compile-time macro expansion only; it is not a runtime-reachable production component.
- Compensating controls: exact lockfile pinning, source-registry restriction, Rust advisory scans, reproducible build comparison, and review whenever Candid is updated.

The direct unmaintained `serde_cbor` dependency was removed in favor of maintained `ciborium`. The LLVM exception is accepted only as part of the standard Apache-2.0 LLVM toolchain expression used by a transitive build dependency.
