import test from "node:test";
import assert from "node:assert/strict";
import { Principal } from "@icp-sdk/core/principal";
import { COMMAND_CAPABILITIES, buildAddManagerHotkeyCommand, buildAdvancedCommand, buildDirectManagerOperation, buildManageNeuronProposal, buildPrimaryFollowCommand, buildRefreshVotingPowerCommand, buildRegisterVoteCommand, buildRewardReceiverCommand, classifyRewardReceiver, createTransactionPipeline, decodeManageNeuronResponse, filterTargetManageNeuronProposals, formatE8s, openManageNeuronProposalRequest, parseIcpToE8s, validateOpenManagerProposal } from "../src/transaction.js";
import { renderControlPanel } from "../src/control-panel.js";

const principal = Principal.fromText("aaaaa-aa");
const signingIdentity = { getPrincipal: () => principal };
const manager = (overrides = {}) => ({ neuron_id: 10n, evidence_status: { Found: null }, known_neuron: [{ name: "Manager" }], controller: [principal], hot_keys: [], minted_stake_e8s: [200_000_000n], neuron_management_followees: [], omega_ready_topics: [4], ...overrides });
const report = (overrides = {}) => ({ neuron_id: 20n, managers: [manager()], quorum_threshold: [1], ...overrides });

test("exact e8s parsing and formatting never uses floating point", () => {
  assert.equal(parseIcpToE8s("1.00000001"), 100_000_001n);
  assert.equal(formatE8s(100_000_001n), "1.00000001");
  assert.equal(formatE8s(100_000_000n), "1");
  for (const value of ["01", ".1", "1.", "1.000000001", "1e2", "-1", " 1"]) assert.throws(() => parseIcpToE8s(value));
  assert.throws(() => formatE8s(-1n));
  assert.throws(() => parseIcpToE8s("184467440737.09551616"), /nat64/);
});

test("proposal builder uses modern IDs and exact nesting while direct builder stays narrow", () => {
  const command = { RefreshVotingPower: {} };
  const request = buildManageNeuronProposal("10", "20", command);
  assert.deepEqual(request, { id: [], neuron_id_or_subaccount: [{ NeuronId: { id: 10n } }], command: [{ MakeProposal: { title: ["Dendrite neuron management request"], url: "", summary: "Manage Dendrite neuron 20.", action: [{ ManageNeuron: { id: [], neuron_id_or_subaccount: [{ NeuronId: { id: 20n } }], command: [command] } }] } }] });
  assert.ok(Object.isFrozen(request) && Object.isFrozen(request.command[0].MakeProposal.action[0]));
  assert.deepEqual(buildDirectManagerOperation(10n, { RegisterVote: { proposal: [{ id: 7n }], vote: 1 } }).neuron_id_or_subaccount, [{ NeuronId: { id: 10n } }]);
  assert.throws(() => buildManageNeuronProposal(10n, 20n, {}), /Exactly one/);
  assert.throws(() => buildDirectManagerOperation(10n, null), /Exactly one/);
  assert.throws(() => buildManageNeuronProposal(10n, 20n, command, "x".repeat(1001)), /too long/);
});

test("one pipeline submits the identical reviewed object only after confirmation and revalidation", async () => {
  const requests = []; let checks = 0, economics = 100_000_000n;
  const actor = { get_network_economics_parameters: async () => ({ neuron_management_fee_per_proposal_e8s: economics }), manage_neuron: async (request) => { requests.push(request); return { command: [{ MakeProposal: { proposal_id: [{ id: 77n }], message: [] } }] }; } };
  const pipeline = createTransactionPipeline({ getSession: async () => ({ principal, signingIdentity }), getNnsActor: async () => actor, checkNeuron: async () => { checks++; return report(); } });
  const review = await pipeline.reviewProposal({ targetId: 20n, managerId: 10n, innerCommand: { RefreshVotingPower: {} }, operation: "Refresh voting power" });
  assert.equal(requests.length, 0);
  await assert.rejects(() => pipeline.submit(review), /confirmed/);
  const result = await pipeline.submit(review, { confirmed: true });
  assert.equal(result.proposalId, 77n); assert.equal(requests[0], review.request); assert.equal(checks, 2); assert.equal(pipeline.pending, undefined);
});

test("stale authority relationship and changed fees discard or block submission", async () => {
  let current = report(), fee = 1n, calls = 0;
  const actor = { get_network_economics_parameters: async () => ({ neuron_management_fee_per_proposal_e8s: fee }), manage_neuron: async () => { calls++; return { command: [{ MakeProposal: { proposal_id: [{ id: 1n }], message: [] } }] }; } };
  const pipeline = createTransactionPipeline({ getSession: async () => ({ principal, signingIdentity }), getNnsActor: async () => actor, checkNeuron: async () => current });
  let review = await pipeline.reviewProposal({ targetId: 20n, managerId: 10n, innerCommand: { RefreshVotingPower: {} }, operation: "refresh" });
  current = report({ managers: [] });
  await assert.rejects(() => pipeline.submit(review, { confirmed: true }), /not Found/);
  assert.equal(calls, 0);
  current = report(); review = await pipeline.reviewProposal({ targetId: 20n, managerId: 10n, innerCommand: { RefreshVotingPower: {} }, operation: "refresh" }); fee = 2n;
  await assert.rejects(() => pipeline.submit(review, { confirmed: true }), /fee changed/);
  assert.equal(pipeline.pending, undefined); assert.equal(calls, 0);
});

test("strict response decoding bounds errors and rejects wrong or missing variants", () => {
  assert.throws(() => decodeManageNeuronResponse({ command: [] }, "RegisterVote"), /missing/);
  assert.throws(() => decodeManageNeuronResponse({ command: [{ Follow: {} }] }, "RegisterVote"), /Unexpected/);
  assert.throws(() => decodeManageNeuronResponse({ command: [{ MakeProposal: { proposal_id: [], message: [] } }] }, "MakeProposal"), /omitted/);
  assert.throws(() => decodeManageNeuronResponse({ command: [{ Error: { error_type: 5, error_message: "<img>" + "x".repeat(600) } }] }, "RegisterVote"), /Governance error 5/);
  assert.deepEqual(decodeManageNeuronResponse({ command: [{ RegisterVote: {} }] }, "RegisterVote"), { operation: "RegisterVote" });
});

test("review fails closed for malformed sessions, evidence, fees, stake, and controller authority", async () => {
  const actor = { get_network_economics_parameters: async () => ({ neuron_management_fee_per_proposal_e8s: 10n }) };
  let session = null, current = report();
  const pipeline = createTransactionPipeline({ getSession: async () => session, getNnsActor: async () => actor, checkNeuron: async () => current });
  await assert.rejects(() => pipeline.reviewProposal({ targetId: 20n, managerId: 10n, innerCommand: { RefreshVotingPower: {} } }), /targeted session/);
  session = { principal, signingIdentity }; current = { ...report(), neuron_id: 21n };
  await assert.rejects(() => pipeline.reviewProposal({ targetId: 20n, managerId: 10n, innerCommand: { RefreshVotingPower: {} } }), /does not match/);
  current = report({ managers: [manager({ minted_stake_e8s: [] })] });
  await assert.rejects(() => pipeline.reviewProposal({ targetId: 20n, managerId: 10n, innerCommand: { RefreshVotingPower: {} } }), /unavailable/);
  current = report({ managers: [manager({ minted_stake_e8s: [1n] })] });
  await assert.rejects(() => pipeline.reviewProposal({ targetId: 20n, managerId: 10n, innerCommand: { RefreshVotingPower: {} } }), /does not cover/);
  current = report({ managers: [manager({ controller: [], hot_keys: [principal] })] });
  await assert.rejects(() => pipeline.reviewDirect({ targetId: 20n, managerId: 10n, command: { Configure: {} }, controllerOnly: true }), /requires/);
});

test("direct controller-only review and high-risk exact target confirmation", async () => {
  let calls = 0; const actor = { manage_neuron: async () => { calls++; return { command: [{ Configure: {} }] }; } };
  const pipeline = createTransactionPipeline({ getSession: async () => ({ principal, signingIdentity }), getNnsActor: async () => actor, checkNeuron: async () => report() });
  const review = await pipeline.reviewDirect({ targetId: 20n, managerId: 10n, command: { Configure: { operation: [{ AddHotKey: { new_hot_key: [Principal.fromText("2vxsx-fae")] } }] } }, operation: "Add hotkey", controllerOnly: true, highRisk: true });
  await assert.rejects(() => pipeline.submit(review, { confirmed: true, typedTarget: "020" }), /exactly/);
  assert.equal(calls, 0);
  assert.deepEqual(await pipeline.submit(review, { confirmed: true, typedTarget: "20" }), { operation: "Configure" });
});

test("primary following enforces manager, committed omega, and fixed alpha policies", () => {
  const value = report({ committed_topics: [{ topic: 4, delegate_ids: [10n] }], managers: [manager(), manager({ neuron_id: 11n }), manager({ neuron_id: 12n })] });
  const candidates = [10n, 11n, 12n, 13n, 14n].map((id) => ({ id, known: true }));
  assert.deepEqual(buildPrimaryFollowCommand(value, 1, candidates.map((entry) => entry.id), candidates).Follow.followees.map((entry) => entry.id), [10n, 11n, 12n, 13n, 14n]);
  assert.deepEqual(buildPrimaryFollowCommand(value, 4, [10n, 11n, 12n]).Follow.followees.map((entry) => entry.id), [10n, 11n, 12n]);
  assert.equal(buildPrimaryFollowCommand(value, 0).Follow.followees[0].id, 2_947_465_672_511_369n);
  assert.equal(buildPrimaryFollowCommand(value, 17).Follow.followees[0].id, 2_947_465_672_511_369n);
  assert.throws(() => buildPrimaryFollowCommand(value, 99), /update required/);
  assert.throws(() => buildPrimaryFollowCommand(value, 1, [10n, 10n, 11n, 12n, 13n], candidates), /distinct/);
  assert.throws(() => buildPrimaryFollowCommand(value, 4, [10n, 11n, 99n]), /known target managers/);
  const notReady = report({ committed_topics: [{ topic: 4 }], managers: [manager({ omega_ready_topics: [] }), manager({ neuron_id: 11n }), manager({ neuron_id: 12n })] });
  assert.throws(() => buildPrimaryFollowCommand(notReady, 4, [10n, 11n, 12n]), /omega-reject/);
});

test("refresh and target vote builders reject missing closed expired and management proposals", () => {
  assert.deepEqual(buildRefreshVotingPowerCommand(), { RefreshVotingPower: {} });
  const open = { id: [{ id: 9n }], status: 1, topic: 4, deadline_timestamp_seconds: [100n] };
  assert.deepEqual(buildRegisterVoteCommand(open, 1, 50n), { RegisterVote: { proposal: [{ id: 9n }], vote: 1 } });
  assert.deepEqual(buildRegisterVoteCommand(open, 2, 50n).RegisterVote.vote, 2);
  assert.throws(() => buildRegisterVoteCommand({}, 1, 0n), /does not exist/);
  assert.throws(() => buildRegisterVoteCommand({ ...open, status: 2 }, 1, 0n), /not Open/);
  assert.throws(() => buildRegisterVoteCommand({ ...open, deadline_timestamp_seconds: [1n] }, 1, 1n), /passed/);
  assert.throws(() => buildRegisterVoteCommand({ ...open, topic: 1 }, 1, 0n), /manager voting/);
});

test("every pinned command has an explicit policy and every enabled advanced builder is typed", () => {
  assert.deepEqual(Object.keys(COMMAND_CAPABILITIES).sort(), ["ClaimOrRefresh","Configure","Disburse","DisburseMaturity","DisburseToNeuron","Follow","MakeProposal","Merge","MergeMaturity","RefreshVotingPower","RegisterVote","SetFollowing","Spawn","Split","StakeMaturity"].sort());
  for (const kind of ["MakeProposal", "MergeMaturity", "Disburse", "DisburseToNeuron"]) assert.throws(() => buildAdvancedCommand(kind), /unavailable/);
  assert.ok(buildAdvancedCommand("Spawn", { percentage: 50, newController: "aaaaa-aa", nonce: 1n }).Spawn);
  assert.ok(buildAdvancedCommand("Split", { amountE8s: 1n }).Split);
  assert.ok(buildAdvancedCommand("Follow", { topic: 4, followeeIds: [1n] }).Follow);
  assert.ok(buildAdvancedCommand("ClaimOrRefresh").ClaimOrRefresh);
  assert.ok(buildAdvancedCommand("Configure", { operation: { StartDissolving: {} } }).Configure);
  assert.ok(buildAdvancedCommand("RegisterVote", { proposalInfo: { id: [{ id: 1n }], status: 1, topic: 4, deadline_timestamp_seconds: [2n] }, vote: 1, nowSeconds: 1n }).RegisterVote);
  assert.ok(buildAdvancedCommand("Merge", { sourceNeuronId: 1n }).Merge);
  assert.ok(buildAdvancedCommand("StakeMaturity", {}).StakeMaturity);
  assert.ok(buildAdvancedCommand("RefreshVotingPower").RefreshVotingPower);
  assert.ok(buildAdvancedCommand("DisburseMaturity", { percentage: 1, accountIdentifier: new Uint8Array(32) }).DisburseMaturity);
  assert.ok(buildAdvancedCommand("SetFollowing", { rows: [{ topic: 4, followeeIds: [1n] }] }).SetFollowing);
});

class FakeNode { constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.textContent="";this.value="";} append(...children){this.children.push(...children);} replaceChildren(...children){this.children=[...children];} addEventListener(name,listener){this.listeners[name]=listener;} dispatch(name){return this.listeners[name]();} }
const find = (node, predicate) => predicate(node) ? node : (node.children ?? []).map((child) => find(child, predicate)).find(Boolean);
test("control panel renders primary workflows and performs no mutation before exact confirmation", async () => {
  const previous = globalThis.document; globalThis.document = { createElement: (tag) => new FakeNode(tag), createTextNode: (text) => ({ textContent: text }) };
  try {
    const root = new FakeNode("main"), current = report({ checked_at_timestamp_seconds: 50n, target: [{ voting_power_refreshed_timestamp_seconds: [40n] }], committed_topics: [] });
    let mutations = 0, refreshed = 0;
    const actor = { get_network_economics_parameters: async () => ({ neuron_management_fee_per_proposal_e8s: 1n }), manage_neuron: async () => { mutations++; return { command: [{ MakeProposal: { proposal_id: [{ id: 8n }], message: [] } }] }; } };
    renderControlPanel(root, { report: current, session: { principal, signingIdentity }, nnsActor: actor, checkNeuron: async () => current, onSuccess: async () => { refreshed++; } });
    const selects = []; const collect = (node) => { if (node.tag === "select") selects.push(node); for (const child of node.children ?? []) collect(child); }; collect(root); selects[0].value = "10";
    await find(root, (node) => node.textContent === "Review voting-power refresh").dispatch("click");
    assert.equal(mutations, 0); assert.match(JSON.stringify(root), /No NNS simulation was performed/);
    const checkbox = find(root, (node) => node.name === "confirmation"); checkbox.checked = true;
    await find(root, (node) => node.textContent === "Submit exact reviewed request").dispatch("click");
    assert.equal(mutations, 1); assert.equal(refreshed, 1); assert.match(JSON.stringify(root), /Proposal 8 submitted/);
  } finally { globalThis.document = previous; }
});

test("open manager proposal helpers are bounded target-specific and vote-aware", () => {
  assert.deepEqual(openManageNeuronProposalRequest(25).include_status, [1]);
  assert.throws(() => openManageNeuronProposalRequest(101), /1–100/);
  const info = { id: [{ id: 7n }], status: 1, deadline_timestamp_seconds: [100n], ballots: [[10n, { vote: 0, voting_power: 1n }]], proposal: [{ action: [{ ManageNeuron: { neuron_id_or_subaccount: [{ NeuronId: { id: 20n } }], command: [{ RefreshVotingPower: {} }] } }] }] };
  assert.deepEqual(filterTargetManageNeuronProposals([info], 20n), [info]);
  assert.deepEqual(validateOpenManagerProposal(info, 20n, 10n, 2, 50n), { RegisterVote: { proposal: [{ id: 7n }], vote: 2 } });
  assert.throws(() => validateOpenManagerProposal({ ...info, status: 2 }, 20n, 10n, 1, 0n), /no longer Open/);
  assert.throws(() => validateOpenManagerProposal(info, 21n, 10n, 1, 0n), /does not match/);
  assert.throws(() => validateOpenManagerProposal({ ...info, ballots: [[10n, { vote: 1 }]] }, 20n, 10n, 1, 0n), /already voted/);
  assert.throws(() => validateOpenManagerProposal(info, 20n, 10n, 0, 0n), /explicitly/);
  assert.throws(() => validateOpenManagerProposal({ ...info, id: [] }, 20n, 10n, 1, 0n), /unavailable/);
});

test("hotkey and reward readiness helpers preserve controller-honest boundaries", () => {
  assert.deepEqual(classifyRewardReceiver(manager({ neuron_management_followees: [] })), { status: "FallbackToKnownNeuron" });
  assert.deepEqual(classifyRewardReceiver(manager({ neuron_management_followees: [99n] })), { status: "Configured", receiverId: 99n });
  assert.equal(classifyRewardReceiver(manager({ neuron_management_followees: [1n, 2n] })).status, "Ambiguous");
  assert.equal(classifyRewardReceiver(manager({ evidence_status: { Unavailable: null } })).status, "Indeterminate");
  assert.ok(buildAddManagerHotkeyCommand(manager(), 20n, "2vxsx-fae").Configure);
  assert.throws(() => buildAddManagerHotkeyCommand(manager({ neuron_id: 20n }), 20n, "2vxsx-fae"), /target Dendrite/);
  assert.throws(() => buildAddManagerHotkeyCommand(manager({ hot_keys: [Principal.fromText("2vxsx-fae")] }), 20n, "2vxsx-fae"), /already/);
  assert.throws(() => buildAddManagerHotkeyCommand(manager({ hot_keys: Array(10).fill(Principal.fromText("aaaaa-aa")) }), 20n, "2vxsx-fae"), /maximum/);
  assert.deepEqual(buildRewardReceiverCommand(99n), { Follow: { topic: 1, followees: [{ id: 99n }] } });
});

test("advanced command bounds fail closed", () => {
  assert.throws(() => buildAdvancedCommand("FutureCommand"), /Unknown command/);
  assert.throws(() => buildAdvancedCommand("Spawn", { percentage: 0 }), /1–100/);
  assert.throws(() => buildAdvancedCommand("DisburseMaturity", { percentage: 1 }), /exactly one/);
  assert.throws(() => buildAdvancedCommand("DisburseMaturity", { percentage: 1, account: { owner: "aaaaa-aa" }, accountIdentifier: new Uint8Array(32) }), /exactly one/);
});
