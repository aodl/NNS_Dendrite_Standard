# Upstream source baseline

Dendrite's checked-in NNS and management-canister interface subsets are reviewed
against the official [`dfinity/ic`](https://github.com/dfinity/ic) repository at
commit `a8d582a62b8aa5b958786f7f595e0572f888f1f8` (master observed 17 July 2026).

Pinned paths:

- `rs/nns/governance/canister/governance.did`
- `rs/nns/governance/proto/ic_nns_governance/pb/v1/governance.proto`
- `rs/nns/governance/src/governance.rs`
- `rs/nns/governance/src/neuron/types.rs`
- `rs/nns/governance/src/pb/mod.rs`
- `rs/types/management_canister_types/src/lib.rs`
- `rs/execution_environment/src/execution_environment.rs`
- `rs/execution_environment/src/ic00_permissions.rs`

The prior product research baseline was
`d55a0f4d4edfabe49d8fd543aff473084cb741f2`. Interface drift is checked against
the newer immutable revision above.

