# Cycles and rate limits

Dendrite admits a check only with at least `2_000_000_000_000` (2T) liquid cycles.
This is a fixed admission reserve, not a long-term cost forecast. Operator evidence for
the cycles used to reserve the production canister has not been supplied.

Inspect live balance and settings with `icp canister status dendrite -e ic`. A
controller may separately top up through the reviewed `icp-cli` cycles procedure, but
this tranche performs no top-up and no automatic funding.

The immutable heap-only guard permits 20 admitted starts per 60-second global window,
at most two concurrent checks, and only one in-flight check per neuron. Entries at least
300 seconds old are pruned on the next admission. It stores no public counters and
resets on upgrade.

Expected errors are `LowCycles`, `ConcurrencyLimit`, `DuplicateInFlight`, and
`GlobalRateLimit { retry_after_seconds }`. They mean temporary admission rejection, not
a compliance result or cached response.
