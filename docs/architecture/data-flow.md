# Anonymous verification data flow

1. Validate a non-zero `nat64` target ID and admit it through the heap-only global guard.
2. Request the full public target with fixed Governance `list_neurons`.
3. Atomically validate the target response. On confirmed omission, return a completed
   non-compliant report; on unavailable evidence, return indeterminate immediately.
4. Preserve raw manager/topic vectors, add alpha-vote and omega-reject, enforce the
   257-ID graph bound, and split unique dependencies into batches of at most 50.
5. Request each batch through fixed Governance `list_neurons`; each requested ID becomes
   found, confirmed missing, or unavailable. Invalid batches retain no partial records,
   and failures identify the exact affected IDs.
6. Inspect the target controller with management `canister_info`, requesting zero
   changes.
7. Normalize evidence, evaluate every supported rule, return the timestamped report,
   release the guard, and store nothing.

No step accepts a destination, method, raw Candid payload, delegation, configuration,
or proposal record from a caller. No catalogue, economics, mutation, cache, timer,
history, or background call exists.
