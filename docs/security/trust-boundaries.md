# Trust boundaries

| Boundary | Trust and control |
| --- | --- |
| Dendrite controller | Can replace code and transaction-signing frontend; must remain reviewed and secured. |
| Certified frontend | Binds served bytes to installed Wasm, not controller intent or browser integrity. |
| Browser runtime | Holds identity, delegation, receipts, unresolved markers, and exact reviewed requests. |
| Internet Identity | Authenticates the user and issues a Governance-only delegation. |
| NNS Governance | Fixed evidence and mutation destination; enforces caller authority and proposal semantics. |
| Anonymous Dendrite calls | Carry neuron IDs only; never identity or delegation material. |
| Management canister reads | Supply bounded target-controller evidence. |
| Target neuron | Untrusted live subject of the standard. |
| Manager neurons | Untrusted live authority and following evidence. |
| Receiver neurons | Explicit-ID-only, caller-readable authority evidence; omission is not nonexistence. |
| Operator build environment | Must reproduce pinned source without introducing secrets or mutable inputs. |
| Release artifacts | Public immutable evidence bound by deterministic hashes. |
| Production CLI identity | Controller authority for lifecycle writes; never `codex_local`. |

The application canister is not the target neuron's blackholed controller canister.
Delegation material never crosses the Dendrite canister boundary.
