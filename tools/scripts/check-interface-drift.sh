#!/bin/sh
set -eu

revision=d55a0f4d4edfabe49d8fd543aff473084cb741f2
base="https://raw.githubusercontent.com/dfinity/ic/$revision"
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT HUP INT TERM

curl --fail --silent --show-error \
  "$base/rs/nns/governance/canister/governance.did" > "$tmp_dir/governance.did"
curl --fail --silent --show-error \
  "$base/rs/types/management_canister_types/src/lib.rs" > "$tmp_dir/management.rs"

# Candid service subtyping structurally proves every method-specific request and
# response in our consumer subset remains wire-compatible with the official API.
didc check "$tmp_dir/governance.did" candid/nns-governance/governance.subset.did
didc check "$tmp_dir/governance.did" candid/nns-governance/governance-transaction.subset.did

awk '
  /^type ManageNeuronCommandRequest = variant/ { inside = 1; next }
  inside && /^};/ { exit }
  inside && /^[[:space:]]*[A-Za-z]/ { line = $0; sub(/^[[:space:]]*/, "", line); sub(/[[:space:]]*:.*/, "", line); print line }
' "$tmp_dir/governance.did" | sort > "$tmp_dir/upstream-commands"
awk '{ print $1 }' candid/nns-governance/command-capabilities.txt | sort > "$tmp_dir/local-commands"
cmp "$tmp_dir/upstream-commands" "$tmp_dir/local-commands"

# The management interface is documented as Candid in the official Rust source.
# Extract those two authoritative code blocks and compare them structurally.
awk '
  /`CandidType` for `CanisterInfoRequest`/ { wanted = 1; next }
  wanted && /```text/ { in_block = 1; next }
  in_block && /```/ { exit }
  in_block { print }
' "$tmp_dir/management.rs" | sed 's|^/// ||' > "$tmp_dir/request.did"
awk '
  /pub struct CanisterInfoRequest/ { request_seen = 1 }
  request_seen && /`CandidType` for `CanisterInfoRequest`/ { wanted = 1; next }
  wanted && /```text/ { in_block = 1; next }
  in_block && /```/ { exit }
  in_block { print }
' "$tmp_dir/management.rs" | sed 's|^/// ||' > "$tmp_dir/response.did"

{
  printf 'type CanisterInfoRequest = '
  cat "$tmp_dir/request.did"
  printf ';\ntype change = reserved;\ntype CanisterInfoResponse = '
  sed 's/vec change/vec reserved/' "$tmp_dir/response.did"
  printf ';\nservice : { canister_info : (CanisterInfoRequest) -> (CanisterInfoResponse) };\n'
} > "$tmp_dir/management.did"
didc check --strict "$tmp_dir/management.did" candid/management/canister-info.subset.did

# These fixtures intentionally change a required wire type. A checker that
# accepts either fixture is not a semantic drift checker.
if didc check "$tmp_dir/governance.did" tools/interface-fixtures/governance-incompatible.did >/dev/null 2>&1; then
  echo 'incompatible Governance fixture unexpectedly passed' >&2
  exit 1
fi
if didc check "$tmp_dir/governance.did" tools/interface-fixtures/governance-transaction-incompatible.did >/dev/null 2>&1; then
  echo 'incompatible Governance transaction fixture unexpectedly passed' >&2
  exit 1
fi
if didc check --strict "$tmp_dir/management.did" tools/interface-fixtures/management-incompatible.did >/dev/null 2>&1; then
  echo 'incompatible management fixture unexpectedly passed' >&2
  exit 1
fi

echo "semantic interface compatibility passed at dfinity/ic@$revision"
