# Known limitations and roadmap

The canister remains an anonymous live verifier. Browser-only Internet Identity and
read-only manager recognition are implemented, but onboarding is instruction-only:
only a manager controller may add a hotkey externally, and success is not established
until a later live report contains it. The delegation never reaches Dendrite.

Proposal construction, simulation, submission, voting, following changes, reward
assistance, open-proposal views, proposal history, and every NNS mutation remain
deferred. The next tranche is one audited direct browser-to-NNS transaction pipeline.
The product as a whole is not complete against the original brief.

Each check consumes canister cycles and may be temporarily rejected by the global
heap-only guard. The guard resets on upgrade. Results are not cached, certified in a
dynamic tree, indexed, or retained; users who need an archive must preserve the returned
report externally.

There is no proposal-history persistence, API, page, indexer, timer, cursor, high-water
mark, or background work.
