# Test strategy and coverage

Run `cargo xtask check` for formatting, warnings-denied Clippy, and frontend tests; `cargo xtask test` for workspace and frontend tests; and `npm run test:coverage` for frontend thresholds.

Required floors remain 95% line/branch for the pure rule engine, 90% for future payload/authority logic, and 85% overall Rust/frontend. Frontend coverage currently enforces 85% line, branch, and function thresholds at the command line. Interface drift uses structural Candid compatibility and deliberate incompatible fixtures.

Deterministic PocketIC, a future-version stable migration fixture, and the remaining rule mutation coverage remain release blockers until listed complete in the implementation plan. Native tests already cover deterministic cache eviction, same-memory cache/metadata/counter reopen, malformed stable records, unsupported schema rejection, and independent certified-asset witness reconstruction.
