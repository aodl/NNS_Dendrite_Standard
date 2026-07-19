# NNS Dendrite Standard — implementation summary

The normative contract is `DENDRITE_BUILD_SPEC.md`; this document is a reviewer index. A target must be returned as a full public neuron with valid `known_neuron_data`, declare at least one distinct concrete committed topic, remain not dissolving at 63,072,000 seconds, have positive effective stake, and retain undecayed voting power refreshed within six nominal months. The dissolve delay and refresh threshold are standard constants derived from pinned `dfinity/ic@d55a0f4d4edfabe49d8fd543aff473084cb741f2`; the verifier does not query network economics.

Its controller must resolve via `canister_info` to a canister with no module hash and no controllers. The target has exactly zero hotkeys and `not_for_profit = false`.

Neuron Management has 5–15 raw, distinct, non-self known managers and quorum `floor(n/2)+1`. Each committed topic has at least three distinct manager delegates; each delegate follows exactly omega-reject `18422777432977120264` on that same topic. Every other recognised concrete topic and CatchAll follows exactly alpha-vote `2947465672511369`. Omega-reject is not omega-vote. Topic code 11 is reserved.

Confirmed defects are `NON_COMPLIANT`; unavailable evidence is `INDETERMINATE`; unknown semantic variants are `STANDARD_UPDATE_REQUIRED`. A successful response omitting a requested neuron is factual evidence, while rejection or decode failure is unavailable evidence. Results never short-circuit when independent evidence remains. Every check is live and no report, digest, cache, proposal history, or operational state is retained.
