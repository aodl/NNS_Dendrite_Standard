# Known limitations and roadmap

This tranche is deliberately an anonymous live verifier. Internet Identity, derivation
origin, authenticated manager recognition, controller-only hotkey onboarding, proposal
construction/simulation/submission, open-proposal views, voting, and reward assistance
are deferred. No UI text may imply those functions exist. A later tranche must keep
privileged calls browser-to-NNS and delegations outside Dendrite.

Each check consumes canister cycles and may be temporarily rejected by the global
heap-only guard. The guard resets on upgrade. Results are not cached, certified in a
dynamic tree, indexed, or retained; users who need an archive must preserve the returned
report externally.

There is no proposal-history persistence, API, page, indexer, timer, cursor, high-water
mark, or background work.
