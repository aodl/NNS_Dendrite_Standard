# Dendrite neuron setup checklist

1. Create a dedicated controller canister under temporary setup control and create the neuron with that principal as controller.
2. Stake, set Not Dissolving at the current maximum delay, set `not_for_profit = false`, and remove every target hotkey.
3. Configure 5–15 distinct known neurons as Neuron Management managers.
4. Choose non-empty concrete committed topics and configure at least three distinct manager delegates per topic.
5. Configure each delegate to follow omega-reject `18422777432977120264` exactly on that topic. Omega-reject is not omega-vote.
6. Configure each non-committed recognised topic and CatchAll to alpha-vote `2947465672511369` exactly.
7. Register known-neuron data, run Dendrite, and resolve every failure except the pending blackhole checks.
8. Uninstall the controller canister Wasm and set its controllers to an empty list.
9. Run Dendrite again and archive evidence and source/artifact hashes externally.

Blackholing is intentionally irreversible. Dendrite verifies this sequence; it does not perform it.
