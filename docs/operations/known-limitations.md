# Known limitations and roadmap

The remaining anonymous-verifier work is tracked in `docs/development/implementation-plan.md`, notably the remaining rule mutation coverage and summaries, a future-version stable migration fixture, and deterministic PocketIC outbound-call/upgrade tests. The shared fake-client collector suite now covers compliant, defective, rejected, incomplete, unknown, and bounded-error graphs. Certified asset witnesses are independently reconstructed in native tests, but browser end-to-end and PocketIC certificate verification are still outstanding.

Internet Identity, derivation-origin finalization, exact authenticated manager recognition, controller-only hotkey onboarding, proposal simulation/submission, and voting controls are deliberately deferred to the next tranche. No UI text should claim these are complete.

Production domain and canonical alternative origins remain operator inputs. `/.well-known/ii-alternative-origins` is currently an empty list and must be reviewed before authenticated deployment.

Proposal history is intentionally never retained. There is no history persistence, API, page, indexer, timer, cursor, or high-water mark.
