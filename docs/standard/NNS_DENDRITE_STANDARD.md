# NNS Dendrite Standard — implementation summary

The normative contract is `DENDRITE_BUILD_SPEC.md`; this document is a reviewer index. A target must be returned as a full public neuron with valid `known_neuron_data`, declare at least one distinct concrete committed topic, remain not dissolving at 63,115,200 seconds, have positive effective stake, and retain undecayed voting power refreshed within six nominal months (15,778,800 seconds). The dissolve delay and refresh threshold are compile-time constants derived from pinned `dfinity/ic@d55a0f4d4edfabe49d8fd543aff473084cb741f2`; the verifier does not query network economics.

Its controller must resolve via `canister_info` to a canister with no module hash and no controllers. The target has exactly zero hotkeys and `not_for_profit = false`.

The browser may evaluate those same controller rules from fresh IC-certified system
state for the exact controller principal reported by its validated, replica-signed
Governance query. This certifies controller state, not the neuron-to-controller
relationship. Certificate or decoding failure remains indeterminate, and only a
replicated Dendrite report can authorize management controls.

Neuron Management has 5–15 raw, distinct, non-self known managers. The displayed quorum is the actual NNS ballot quorum, `floor(distinct manager IDs / 2)+1`; the separate standard rule still rejects duplicate raw manager entries. Each committed topic has at least three distinct manager delegates; each delegate follows exactly omega-reject `18422777432977120264` on that same topic. Every other recognised concrete topic and CatchAll follows exactly alpha-vote `2947465672511369`. Omega-reject is not omega-vote. Topic code 11 is reserved.

Each raw manager entry is reported in its original order with explicit found,
confirmed-missing, or unavailable evidence. Found records include the bounded public
controller and hotkey evidence already returned by Governance. The browser may compare
an Internet Identity principal locally with those fields, but this read-only
recognition is not part of compliance, grants no authority, and causes no additional
canister call or NNS mutation.

Confirmed defects are `NON_COMPLIANT`; unavailable evidence is `INDETERMINATE`; unknown semantic variants are `STANDARD_UPDATE_REQUIRED`. A successful response omitting a requested neuron is factual evidence, while rejection or decode failure is unavailable evidence. Results never short-circuit when independent evidence remains. Every check is live and no report, digest, cache, proposal history, or operational state is retained.

`DENDRITE-ACTIVE-001` uses the target's NNS Governance
`NeuronInfo.retrieved_at_timestamp_seconds`, and the report exposes that same NNS
snapshot as `checked_at_timestamp_seconds`. A refresh after the snapshot is a
contradictory response and therefore indeterminate, not a factual neuron failure.
Dendrite local time is used only by the heap-only abuse guard.

Browser management does not change these rules or the canister API. Manager minted
stake excludes fees and staked maturity, raw Neuron Management followees preserve order,
and `omega_ready_topics` identifies exact singleton omega-reject following. These added
report fields support browser preflight; a new live `check_neuron` remains authoritative.
