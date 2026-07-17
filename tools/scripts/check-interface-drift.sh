#!/bin/sh
set -eu
revision=a8d582a62b8aa5b958786f7f595e0572f888f1f8
base="https://raw.githubusercontent.com/dfinity/ic/$revision"
governance=$(curl --fail --silent --show-error "$base/rs/nns/governance/canister/governance.did")
for method in list_known_neurons list_neurons get_network_economics_parameters list_proposals get_pending_proposals get_proposal_info simulate_manage_neuron manage_neuron; do
  printf '%s' "$governance" | grep -q "${method}" || { echo "missing upstream method: $method" >&2; exit 1; }
done
management=$(curl --fail --silent --show-error "$base/rs/types/management_canister_types/src/lib.rs")
printf '%s' "$management" | grep -q 'CanisterInfoRequest' || { echo 'canister_info request drifted' >&2; exit 1; }
printf '%s' "$management" | grep -q 'CanisterInfoResponse' || { echo 'canister_info response drifted' >&2; exit 1; }
echo "interface anchors present at $revision"

