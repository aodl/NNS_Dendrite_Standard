# ADR 0002: canonical Internet Identity derivation origin

Status: accepted for the browser-only identity tranche.

`DENDRITE_DERIVATION_ORIGIN` is a mandatory immutable production build input and an
exact HTTPS origin. Changing it changes users' Dendrite principals and deterministic
frontend/Wasm bytes; operators must finalize it before anyone adds a principal as a
manager hotkey.

Alternatives are normalized, unique, capped at ten, certified, and valid only when
controlled by the same operator. Unexpected origins cannot authenticate. Production
Internet Identity is fixed to `https://id.ai/authorize`; exact `localhost`,
`127.0.0.1`, and `.localhost` providers are accepted only in local mode. None is mutable
canister configuration.

The transaction delegation target is exactly NNS Governance
`rrkah-fqaaa-aaaaa-aaaaq-cai`. Unrestricted, expired, uninspectable, or wrong-target
sessions are signed out. Dendrite is never a delegation target.
