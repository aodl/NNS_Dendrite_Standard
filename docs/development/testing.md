# Test strategy and coverage

Run `cargo xtask check` for formatting, warnings-denied Clippy, interface checks, and
frontend tests; `cargo xtask test` for workspace and PocketIC tests; `cargo xtask
coverage` for pinned Rust coverage; and `npm run test:coverage` for frontend thresholds.
All xtask Cargo subprocesses use `--locked`.

Pure tests cover a compliant report and a focused mutation for every mandatory rule,
duplicate raw managers/delegates/topic keys, unknown semantics, source rejection/decode,
successful target/dependency omission, blackhole evidence, hotkeys,
`not_for_profit`, batching at 50/51/>100, unexpected responses, and exact omega-reject
`u64`. One recording fake asserts exact client call order and proves the boundary has no
arbitrary destination or method.

PocketIC covers compliant, non-compliant, and rejected live checks, controller inspection
where supported, certified landing assets, and certified assets after upgrade. Frontend
tests cover canonical IDs, live success, every overall/error status, malicious text and
links, custom-domain build configuration, no `innerHTML`, and no numeric ID conversion.
No browser automation framework is required in this tranche.

Whole-workspace Rust and frontend line coverage floors remain 85%. The pure rule engine
retains its 95% line/branch target. Coverage exclusions must be justified; modules are
not split merely to alter percentages.
