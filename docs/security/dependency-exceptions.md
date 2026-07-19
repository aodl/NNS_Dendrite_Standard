# Dependency exceptions

## RUSTSEC-2024-0436 (`paste` 1.0.15)

- Owner: Dendrite maintainers
- Review date: 2026-10-17
- Reason: `paste` is an unavoidable transitive build dependency of the pinned `candid 0.10.24` interface stack. The advisory reports abandonment, not a vulnerability, and no compatible upstream release removes it.
- Exposure: compile-time macro expansion only; it is not a runtime-reachable production component.
- Compensating controls: exact lockfile pinning, source-registry restriction, Rust advisory scans, reproducible build comparison, and review whenever Candid is updated.

PocketIC dev/test-only exceptions must name the exact package, owner, dependency path,
and removal condition. A production-reachability script must fail if `pocket-ic`,
`backoff`, or `instant` enters the Dendrite Wasm normal/build dependency tree.
`serde_cbor` reachability must distinguish PocketIC test tooling from any production
path introduced by the official asset-certification libraries; blanket suppressions are
forbidden. The LLVM exception is accepted only as part of the standard Apache-2.0 LLVM
toolchain expression used by a transitive build dependency.

## Dev/test PocketIC advisories

- Owner: Dendrite maintainers.
- Review date: 2026-10-17.
- Scope: `pocket-ic 15.0.0` dev dependency and its `backoff 0.4.0`, `instant 0.1.13`,
  and `serde_cbor 0.11.2` transitive dependencies.
- Classification: dev-test-only for `pocket-ic`, `backoff`, and `instant`; they are
  absent from the normal/build Dendrite Wasm tree as enforced by
  `tools/scripts/check-production-dependencies.sh`.
- Removal condition: update when a compatible PocketIC release removes each package;
  fail the build immediately if any becomes production-reachable.

`serde_cbor 0.11.2` is also production-reachable only through the official
`ic-http-certification 3.2.0` library (directly and via
`ic-asset-certification 3.2.0`). This is required by the reviewed official HTTP
certification v2 pattern. It is not directly used by Dendrite application code. Review
and remove the exception when those maintained libraries replace that dependency.
