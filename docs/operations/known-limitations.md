# Known limitations and roadmap

The remaining anonymous-verifier work is tracked in `docs/development/implementation-plan.md`, notably exhaustive rule mutation coverage, stable migration/upgrade tests, deterministic PocketIC outbound-call tests, and independent certificate-witness verification.

Internet Identity, derivation-origin finalization, exact authenticated manager recognition, controller-only hotkey onboarding, proposal simulation/submission, and voting controls are deliberately deferred to the next tranche. No UI text should claim these are complete.

Production domain and canonical alternative origins remain operator inputs. `/.well-known/ii-alternative-origins` is currently an empty list and must be reviewed before authenticated deployment.

Proposal history is intentionally never retained. There is no history persistence, API, page, indexer, timer, cursor, or high-water mark.
