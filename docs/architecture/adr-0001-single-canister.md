# ADR 0001: one production canister

Status: accepted.

Dendrite deploys exactly one Rust canister. It embeds and certifies the frontend,
performs only fixed-destination live public evidence calls, evaluates the report, and
returns it without storing application data. Its application API is update
`check_neuron` plus query `http_request`. Future authenticated mutations go from the
browser directly to NNS Governance; delegations never cross the canister boundary.
