# Dendrite implementation plan

This plan tracks the phases and exit criteria in `DENDRITE_BUILD_SPEC.md`.

1. **Repository and decisions** — pin toolchains and upstream IC source, establish manifests, `xtask`, CI-equivalent commands, ADRs, and a buildable skeleton.
2. **Pure standard engine** — implement bounded domain types, canonical IDs/topics, normalization, every mandatory rule, deterministic status/digest, fixtures, and coverage gates.
3. **External clients** — check in narrow official Candid subsets, drift checks, fixed-destination NNS/management clients, bounded decoding, and evidence collection.
4. **Canister runtime** — implement the public API, stable bounded cache, refresh controls, upgrades, certified embedded assets, HTTP policy, and PocketIC coverage.
5. **Read-only frontend** — implement safe routing, compliance views, refresh/provenance UX, accessibility, XSS tests, and exact u64 handling.
6. **Identity and authority** — integrate Internet Identity, origin-safe principal display, exact manager authorization, and controller-only hotkey onboarding.
7. **Proposal control panel** — implement typed nested proposal builders, exact review/simulation/confirmation, guided flows, live voting, all current command forms, and reward-receiver advice.
8. **Hardening and release evidence** — finish documentation, drift/security/SBOM/coverage checks, clean builds, two-build reproducibility verification, and release hashes.

Each phase receives a reviewable commit after its tests pass. Deviations from mandatory requirements require an ADR and explicit final-report disclosure.
