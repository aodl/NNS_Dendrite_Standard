# Test strategy and coverage

Run `cargo xtask check` for formatting, warnings-denied Clippy, interface checks, and
frontend tests; `cargo xtask test` for workspace and PocketIC tests; `cargo xtask
coverage` for pinned Rust coverage; and `npm run test:coverage` for frontend thresholds.
All xtask Cargo subprocesses use `--locked`.

Pure tests cover a compliant report and a focused mutation for every mandatory rule,
duplicate raw managers/delegates/topic keys, unknown semantics, source rejection/decode,
successful target/dependency omission, unavailable atomic batches, invalid page and
stake arithmetic, topic-local availability, blackhole evidence, hotkeys,
`not_for_profit`, batching at 50/51/>100, unexpected responses, and exact omega-reject
`u64`. One recording fake asserts exact client call order and proves the boundary has no
arbitrary destination or method.
Focused timestamp tests cover the exact six-month NNS boundary, one second beyond it,
local clocks far behind and ahead, future refresh contradiction, and missing, duplicate,
zero, or unexpected neuron-info keys. The derived 272-neuron graph remains covered.

PocketIC covers compliant, non-compliant, and rejected live checks, controller inspection
where supported, certified landing assets, and certified assets after upgrade. Frontend
tests cover the actual bootstrap, canonical navigation, loading/success/failure/retry,
every overall/error status, controller evidence, topic labels, malicious text and links,
custom-domain-independent build configuration, no `innerHTML`, and no numeric ID
conversion. Coverage explicitly includes every production file under
`canisters/dendrite/web/src/`.
Frontend builder tests write only to a temporary output directory, inspect that bundle
and manifest, remove it, and assert the checked-in `canisters/dendrite/public` tree has
the same byte hash before and after the suite.
No browser automation framework is required in this tranche.

Whole-workspace Rust and frontend line coverage floors remain 85%. The pure rule engine
retains its 95% line/branch target. Coverage exclusions must be justified; modules are
not split merely to alter percentages.
