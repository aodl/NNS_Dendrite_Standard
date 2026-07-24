# Dependency exceptions

These are the existing narrowly approved exceptions. No release-tooling dependency
exception is added.

| Package/version | Reachability | Status | Justification | Review trigger |
| --- | --- | --- | --- | --- |
| `paste 1.0.15` | Transitive through `candid 0.10.24`; compile-time macro only | Production build-time | RUSTSEC-2024-0436 is abandonment, not a vulnerability; no compatible pinned Candid removes it | Any Candid update or 2026-10-17 |
| `pocket-ic 15.0.0` | Workspace dev dependency | Test-only | Required local consensus/PocketIC scenarios | Compatible PocketIC replacement/update |
| `backoff 0.4.0` | Through PocketIC | Test-only | Unmaintained transitive test helper | PocketIC removes it or it becomes production-reachable |
| `instant 0.1.13` | Through PocketIC | Test-only | Unmaintained transitive test helper | PocketIC removes it or it becomes production-reachable |
| `serde_cbor 0.11.2` | Through PocketIC and official HTTP-certification libraries | Test and production library path | Required by `ic-http-certification 3.2.0` / `ic-asset-certification 3.2.0`; not directly used by application code | Certification libraries replace it or reachability changes |

`tools/scripts/check-production-dependencies.sh` fails if `pocket-ic`, `backoff`, or
`instant` enters the Dendrite Wasm normal/build tree. Lockfiles, advisory scans,
reproducible comparison, and SBOMs are compensating controls. The standard Apache-2.0
LLVM toolchain expression remains the existing narrowly accepted license-policy case.
