# Data flow

## Anonymous verification

```text
Browser
  -> Dendrite check_neuron
  -> NNS Governance and management canister reads
  -> bounded live report
  -> Browser
```

Dendrite validates the target, batches at most 50 dependency IDs per `list_neurons`
call, enforces the derived 272-ID bound, reads `canister_info`, evaluates every
supported rule, and stores no result. The browser uses an anonymous Dendrite actor.

## Authenticated mutation

```text
Browser
  -> Internet Identity
  -> Governance-targeted delegation held in browser
  -> NNS Governance manage_neuron
  -> Browser receipt and fresh anonymous report
```

The browser freezes the exact reviewed request, confirms and revalidates it, submits
once without automatic retry, retains only bounded heap-session receipt state, then
runs a fresh anonymous report. Delegation material never travels through Dendrite.
