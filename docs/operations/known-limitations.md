# Known limitations and roadmap

The canister remains an anonymous live verifier. Browser identity, proposal operations,
manager voting, controller-only onboarding, and receiver readiness go directly to fixed
NNS Governance. Success is authoritative only after a later live report. The delegation
never reaches Dendrite.

Each check consumes canister cycles and may be temporarily rejected by the global
heap-only guard. The guard resets on upgrade. Results are not cached, certified in a
dynamic tree, indexed, or retained; users who need an archive must preserve the returned
report externally.

There is no proposal-history persistence, API, page, indexer, timer, cursor, high-water
mark, or background work.

The pinned NNS simulates only direct Merge, not the outer Neuron Management proposal
commands used here. Dendrite performs local preflight and exact review, not NNS
simulation. Governance remains the final validator. Reward calculation/distribution,
automatic polling, and automatic transaction retry remain absent.

Ambiguous transaction coordination is deliberately heap-only. Its bounded warning
survives application rerenders but not a full browser reload. After a reload, an
operator must investigate whether the prior request succeeded before constructing a
new request; Dendrite adds no durable in-flight record or transaction history.

Open management-proposal enumeration is bounded, live, and caller-sensitive in
Governance; Dendrite neither requests unrestricted enumeration nor reconstructs its
visibility rules. NNS deadlines are informational in the browser. A configured reward
receiver ID is likewise only configuration until the bounded authenticated readiness
read can return it to that caller.
