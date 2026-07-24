# Upgrades and stable memory

Dendrite has no application stable state: no user database, compliance cache,
configuration, proposal history, transaction history, or report archive. An upgrade
replaces code and certified frontend assets and resets the heap-only abuse guard.

Browser-held authentication is outside the canister. The current transaction receipt
and unresolved-outcome marker are heap-only browser-session data and disappear on
reload. Operators must investigate uncertainty before reconstructing a request.

`reinstall` is not an ordinary recovery procedure even though application stable state
is absent. Routine releases use explicit `upgrade`, preserve the two-method public
Candid surface, and retain source-to-Wasm evidence. Changing the canonical derivation
origin changes Dendrite principals and is a security migration, not an ordinary
upgrade.
