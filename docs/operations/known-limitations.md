# Known limitations and roadmap

The remaining anonymous-verifier work is tracked in `docs/development/implementation-plan.md`. The principal release blockers are whole-workspace Rust line coverage below the unchanged 85% floor, test-only unmaintained transitive dependencies in pinned PocketIC 15.0.0, a fully successful mocked fixed-destination NNS graph in PocketIC, and browser end-to-end certificate verification. The shared fake-client collector suite covers compliant, defective, rejected, incomplete, unknown, and bounded-error graphs. PocketIC covers the anonymous API, fixed-destination rejection handling, cooldown, certified HTTP/security headers, and a production-Wasm stable upgrade; certified asset witnesses are also independently reconstructed in native tests.

Internet Identity, derivation-origin finalization, exact authenticated manager recognition, controller-only hotkey onboarding, proposal simulation/submission, and voting controls are deliberately deferred to the next tranche. No UI text should claim these are complete.

Production domain and canonical alternative origins remain operator inputs. `/.well-known/ii-alternative-origins` is currently an empty list and must be reviewed before authenticated deployment.

Proposal history is intentionally never retained. There is no history persistence, API, page, indexer, timer, cursor, or high-water mark.
