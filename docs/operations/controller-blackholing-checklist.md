# Controller-canister blackholing checklist

Blackholing is the final irreversible setup step. First resolve every other verifier failure. Confirm the controller principal is the intended canister, archive its current status and setup transactions, uninstall its Wasm, then update its controllers to the empty list. Verify independently that `canister_info` succeeds with `module_hash = null` and `controllers = []`.

A failed lookup, self-authenticating principal, stopped canister, or rejected management call is not proof of blackholing. Dendrite reports unavailable lookup evidence as indeterminate. Never retain a recovery controller while describing the canister as blackholed.
