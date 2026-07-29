# Production record

**Status: UPGRADED — module and public certified assets verified.**

Only an operator-supplied real deployment result may change this into completed
evidence. Never include private identity or authentication material.

## Aggregated-rule upgrade — 2026-07-29

| Field | Recorded value |
| --- | --- |
| Release Git commit | `870ddfbd08e5599b405c007d4484991d6f0998f9` |
| Lifecycle client | `dfx 0.27.0` |
| Operator identity | `codex_local` |
| Deployment mode | `upgrade` |
| Exact upgrade command | `DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity dfx canister install hp4av-oiaaa-aaaar-qcaha-cai --network ic --mode upgrade --wasm dist/release/dendrite.wasm` |
| Controllers before and after | `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae`, `zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe` |
| Cycles balance before | `5_405_034_799_652` |
| Cycles balance after | `5_382_996_288_948` |
| Freezing threshold before and after | `7_776_000` seconds |
| Previous module hash | `da0b1892880866e941b1c7461c0672ccc80d44a6b93fcb4727e63f26b4d36d0e` |
| Installed module hash | `f8556ca1b5d8345b734b95241e0c1aad887f3b1d826d6d3a6a4b9f79ff63efd6` |
| Release `SHA256SUMS` hash | `57715c5c45ef57995c6ba52e5c3bc47dfec8c996b32a7248a45373eeb2dd9784` |
| Asset-manifest hash | `8cda676c9d449cf51ba4f423f566ffab3f65f40ce815317a5f689d8b5ab44e7c` |
| Generated application hash | `dfc86dcd377a4c133182f3dfe537a1040fe1007c423686ea922c18836f9bcf60` |
| Generated stylesheet hash | `b88e8e9260e1394384e1ebcdf5ea7970a3dc7b2f3259cab6b2a29fd2a6c38036` |
| Deployment verification timestamp | `2026-07-29T07:25:00Z` |
| Verification | Module hash matched; `/`, `/asset-manifest.json`, and both generated assets returned certified HTTP 200 responses and byte-matched the candidate |
| Notes | No controller, freezing threshold, authentication configuration, or other setting changed; no cycle transfer or NNS mutation occurred. |

## Rules-first upgrade — 2026-07-28

| Field | Recorded value |
| --- | --- |
| Release Git commit | `8582e64` |
| Lifecycle client | `dfx 0.27.0` |
| Operator identity | `codex_local` |
| Deployment mode | `upgrade` |
| Exact upgrade command | `DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity dfx canister install hp4av-oiaaa-aaaar-qcaha-cai --network ic --mode upgrade --wasm dist/release/dendrite.wasm` |
| Controllers before and after | `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae`, `zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe` |
| Cycles balance before | `5_428_266_033_775` |
| Cycles balance after | `5_406_247_854_072` |
| Freezing threshold before and after | `7_776_000` seconds |
| Previous module hash | `e2b621207262360035803d45c3a6e144116219751c5391c517e51b625eb28a02` |
| Installed module hash | `da0b1892880866e941b1c7461c0672ccc80d44a6b93fcb4727e63f26b4d36d0e` |
| Release `SHA256SUMS` hash | `249064631886d6244e35a467792339dc18e5158632b0e769d443bbddde0a8559` |
| Asset-manifest hash | `eeb605c876ba3aa74348f2dff3b1b210015f4d001b2d322383924c1f537bfb8b` |
| Generated application hash | `6fbb6d8d0eeb471ad86be18fc8dd27db8cb0d16f62ce1aad7103fc7a457b35fc` |
| Generated stylesheet hash | `59eb7b4de6930a5126bf23b216a545a091dae5e9ef0617a418a5ba374286bcb4` |
| Deployment verification timestamp | `2026-07-28T19:37:34Z` |
| Verification | Module hash matched; `/`, `/asset-manifest.json`, both generated assets, and `/.well-known/ii-alternative-origins` returned HTTP 200 with IC certification and byte-matched the candidate |
| Notes | The consolidated anonymous verifier could not read controller-only settings, as expected. Direct public HTTP verification completed. No controller, freezing threshold, authentication configuration, or other setting changed; no cycle top-up or NNS mutation occurred. |

## Initial installation — 2026-07-26

| Field | Recorded value |
| --- | --- |
| Release Git commit | `5be98b8a8bbc51828faba655c302580a9f1086fb` |
| Release tag | UNRUN |
| Production mapping | See authoritative [deployment identifiers](deployment.md) |
| Lifecycle client | `dfx 0.27.0`, used only as the direct credential-bearing management-canister client |
| Operator identity | `codex_local` |
| Operator identity principal | `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae` |
| Wallet | None; no `--wallet` option was specified |
| Deployment mode | `install` |
| Exact install command | `dfx --identity codex_local canister install hp4av-oiaaa-aaaar-qcaha-cai --network ic --mode install --wasm /home/codexdev/src/Dendrite/dist/release/dendrite.wasm` |
| Controller list before | `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae`, `zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe` |
| Controller list after | `amzih-bssz4-twanl-zf6nr-bqsnn-d7rlt-eerbc-oe7vv-uggn5-3naqo-3ae`, `zkkkd-i34qc-367ln-e2u7o-ezznu-dkfqh-gtfvz-cviph-6qa4v-evtfs-wqe` |
| Cycles balance before | `2_284_571_107_661` |
| Cycles balance after | `2_262_848_218_764` |
| Freezing threshold before | `7_776_000` seconds |
| Freezing threshold after | `7_776_000` seconds |
| Canonical Wasm SHA-256 | `1291a51cc26bcdd1ea387f6509aeef3f9c39e19f04f58495576f842873aa371a` |
| Installed module hash | `1291a51cc26bcdd1ea387f6509aeef3f9c39e19f04f58495576f842873aa371a` |
| Release `SHA256SUMS` hash | `090f2cba0cfa230323506d8051bda7b18866da3a0f4f787264dfb0e56d28ad7b` |
| Frontend tree hash | `9eca27496a792732545e4f8eba8e686db14b7f15258415a1307cc058c9618ed3` |
| Asset-manifest hash | `1791938f3a445cbaf3d5c21afe6ff5a1313d309e5e652ca8a4102f60660c82eb` |
| Build-configuration hash | `ff7d399c7f3ff4baaa79904bc76e5edcd7d1c502c0eab4e5b684da444f79121d` |
| Transaction Candid hash | UNRUN |
| Generated declaration hash | UNRUN |
| Command policy hash | UNRUN |
| Response policy hash | UNRUN |
| SBOM hashes | Recorded in `dist/sbom/SHA256SUMS` at the release commit |
| Deployment timestamp | `2026-07-26T08:23:22Z` |
| Gate 1 result | UNRUN |
| Gate 2 result | UNRUN |
| Known limitations | `tools/scripts/verify-mainnet-readonly.sh` did not complete: its anonymous `icp-cli` controller-settings read was rejected, and direct follow-up verification found `/asset-manifest.json` returns HTTP 404. Other directly checked routes (`/`, `/index.html`, `/.well-known/ii-alternative-origins`, `/404.html`, and the hashed JS/CSS assets) return HTTP 200; the well-known document is exactly `{"alternativeOrigins":[]}`. |
| Operator notes | `icp-cli 1.2.0` remained the release and no-write dry-run client. No controller, freezing-threshold, or other settings change was made. No cycles wallet was used. All `dfx` management calls ran from a temporary directory outside the repository, which was removed; no dfx project configuration was introduced. No push, NNS mutation, or blackholing was performed. |
