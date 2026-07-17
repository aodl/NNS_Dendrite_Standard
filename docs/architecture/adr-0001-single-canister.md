# ADR 0001: one production canister

Status: accepted.

Dendrite deploys exactly one Rust canister. It embeds and certifies the frontend,
performs only fixed-destination public evidence calls, and stores a bounded latest
snapshot cache. Authenticated mutations go from the browser directly to NNS
Governance; delegations never cross the Dendrite canister boundary.

