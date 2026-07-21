#!/bin/sh
set -eu

export DFX_IDENTITY=codex_local
dfx canister create --network local dendrite
DENDRITE_CANISTER_ID=$(dfx canister id --network local dendrite)
export DENDRITE_CANISTER_ID
export DENDRITE_BUILD_MODE=local
export DENDRITE_API_HOST=${DENDRITE_API_HOST:-http://127.0.0.1:4943}
export DENDRITE_FETCH_ROOT_KEY=true
: "${DENDRITE_DERIVATION_ORIGIN:?DENDRITE_DERIVATION_ORIGIN is required}"
: "${DENDRITE_IDENTITY_PROVIDER:?DENDRITE_IDENTITY_PROVIDER is required for local builds}"
npm run build
cargo build --locked --release --target wasm32-unknown-unknown -p dendrite
dfx canister install --network local --mode auto \
  --wasm target/wasm32-unknown-unknown/release/dendrite.wasm dendrite
