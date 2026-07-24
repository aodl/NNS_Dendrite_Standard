# Release checklist

Production canister `hp4av-oiaaa-aaaar-qcaha-cai` uses canonical origin
`https://hp4av-oiaaa-aaaar-qcaha-cai.icp0.io`.

## A. Source freeze

- [ ] Hard stop: worktree is clean and the reviewed commit/tag is fixed.
- [ ] Lockfiles, tool pins, Candid surfaces, and generated declarations are reviewed.

## B. Identity, controller, and canister checks

- [ ] Hard stop unless the mapped ID is exactly `hp4av-oiaaa-aaaar-qcaha-cai`.
- [ ] Hard stop on unknown/unexpected controller, identity, installed module, or insufficient cycles.
- [ ] Hard stop on unresolved canonical origin or malformed alternative-origin JSON.

## C. Canonical artifact build

- [ ] Run `tools/scripts/docker-build-release.sh` with all production inputs.
- [ ] Hard stop on missing artifact, manifest mismatch, or Wasm hash mismatch.
- [ ] Run `tools/scripts/verify-docker-reproducible.sh`; require byte equality.

## D. Automated verification

- [ ] Run every command in the [testing matrix](../development/testing.md).
- [ ] Hard stop on any failed automated gate or unresolved dependency/security exception.

## E. Fresh install or upgrade

- [ ] Choose `install` only for the reserved empty canister; otherwise choose `upgrade`.
- [ ] Run `tools/scripts/mainnet-deploy.sh dry-run`, review status/settings and exact command.
- [ ] Hard stop on any attempt to use `reinstall`.
- [ ] Run the chosen guarded mode with interactive confirmation.

## F. Live module and frontend verification

- [ ] Compare raw release Wasm SHA-256 with live module hash.
- [ ] Run read-only status, settings, cycles, controller, and certified HTTP checks.

## G. Operator gates

- [ ] Gate 1 final-origin Internet Identity passed and signed.
- [ ] Gate 2 controlled browser-to-NNS transaction passed and signed.
- [ ] Hard stop on failed gate or ambiguous transaction outcome.

## H. Evidence and release tag

- [ ] Complete the production record with public evidence and hashes.
- [ ] Review known limitations, tag the exact commit, and archive artifacts/SBOMs.
