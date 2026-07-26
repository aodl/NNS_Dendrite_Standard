import test from "node:test";
import assert from "node:assert/strict";
import { Principal } from "@icp-sdk/core/principal";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  NNS_GOVERNANCE_CANISTER_ID,
  createAnonymousGovernanceReadActor,
  governanceReadConfiguration,
} from "../src/governance-read-actor.js";
import {
  ALPHA_VOTE_NEURON_ID,
  OMEGA_REJECT_NEURON_ID,
  PreliminaryEvidenceError,
  collectPreliminaryEvidence,
  createNeuronLoader,
  listNeuronsRequest,
  validateListNeuronsBatch,
} from "../src/preliminary-evidence.js";
import { evaluatePreliminary } from "../src/preliminary-evaluator.js";
import { createApplication } from "../src/app.js";
import { groupTopics, ruleTitle, shortPrincipal, sortedFindings, variantName } from "../src/compliance-view.js";

const principal = Principal.fromText("aaaaa-aa");
const topic = (name) => ({ [name]: null });
const neuron = (id, overrides = {}) => ({
  id: [{ id: BigInt(id) }],
  staked_maturity_e8s_equivalent: [0n],
  controller: [principal],
  not_for_profit: false,
  maturity_e8s_equivalent: 0n,
  cached_neuron_stake_e8s: 100n,
  created_timestamp_seconds: 1n,
  auto_stake_maturity: [],
  aging_since_timestamp_seconds: 1n,
  hot_keys: [],
  dissolve_state: [{ DissolveDelaySeconds: 63_115_200n }],
  followees: [[0, { followees: [{ id: ALPHA_VOTE_NEURON_ID }] }]],
  neuron_fees_e8s: 0n,
  visibility: [1],
  known_neuron_data: [{ name: `Neuron ${id}`, description: [], links: [[]], committed_topics: [[[]]] }],
  voting_power_refreshed_timestamp_seconds: [90n],
  deciding_voting_power: [10n],
  potential_voting_power: [10n],
  ...overrides,
});
const response = (ids, neurons = ids.map((id) => neuron(id))) => ({
  neuron_infos: ids.map((id) => [BigInt(id), { retrieved_at_timestamp_seconds: 100n }]),
  full_neurons: neurons,
  total_pages_available: [1n],
});

test("anonymous Governance read actor is fixed, signed anonymously, and query-verified", async () => {
  assert.deepEqual(governanceReadConfiguration({ host: "https://icp-api.io", fetchRootKey: false }), {
    host: "https://icp-api.io",
    shouldFetchRootKey: false,
    verifyQuerySignatures: true,
    canisterId: NNS_GOVERNANCE_CANISTER_ID,
  });
  assert.throws(() => governanceReadConfiguration({ host: "https://icp-api.io", fetchRootKey: true }));
  let agentOptions, actorConfig;
  const read = await createAnonymousGovernanceReadActor({
    host: "https://icp-api.io",
    fetchRootKey: false,
    createAgent: async (options) => { agentOptions = options; return {}; },
    createActor: (_factory, config) => { actorConfig = config; return { list_neurons: async () => ({}) , manage_neuron: async () => ({})}; },
  });
  assert.equal(agentOptions.host, "https://icp-api.io");
  assert.equal(agentOptions.shouldFetchRootKey, false);
  assert.equal(agentOptions.verifyQuerySignatures, true);
  assert.equal(agentOptions.identity.getPrincipal().toText(), "2vxsx-fae");
  assert.equal(actorConfig.canisterId.toText(), NNS_GOVERNANCE_CANISTER_ID);
  assert.deepEqual(Object.keys(read), ["list_neurons"]);
});

test("preliminary list_neurons request is complete and exact", () => {
  assert.deepEqual(listNeuronsRequest([9n, 7n]), {
    neuron_ids: [9n, 7n],
    include_neurons_readable_by_caller: false,
    include_empty_neurons_readable_by_caller: [false],
    include_public_neurons_in_full_neurons: [true],
    page_number: [0n],
    page_size: [50n],
    neuron_subaccounts: [],
  });
  assert.throws(() => listNeuronsRequest([]), PreliminaryEvidenceError);
  assert.throws(() => listNeuronsRequest(Array.from({ length: 51 }, (_, index) => BigInt(index + 1))), PreliminaryEvidenceError);
});

test("read-only declaration is generated exactly and exposes no mutation", () => {
  const directory = mkdtempSync(join(tmpdir(), "dendrite-read-idl-"));
  try {
    const generated = join(directory, "read.js");
    const result = spawnSync("tools/scripts/generate-governance-read-idl.sh", ["candid/nns-governance/governance.subset.did", generated], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const contents = readFileSync(generated, "utf8");
    assert.equal(contents, readFileSync("src/declarations/nns-governance-read/nns-governance-read.did.js", "utf8"));
    assert.match(contents, /list_neurons/);
    for (const forbidden of ["manage_neuron", "get_network_economics_parameters", "list_proposals"]) assert.doesNotMatch(contents, new RegExp(forbidden));
    assert.match(contents, /\['query'\]/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("whole-batch validation rejects structural, bound, timestamp, and arithmetic contradictions", () => {
  assert.equal(validateListNeuronsBatch([1n], response([1n]), { target: true }).neurons.get("1").id, 1n);
  const cases = [
    { ...response([1n]), total_pages_available: [2n] },
    { ...response([1n]), neuron_infos: [[2n, { retrieved_at_timestamp_seconds: 100n }]] },
    { ...response([1n]), neuron_infos: [[1n, { retrieved_at_timestamp_seconds: 100n }], [1n, { retrieved_at_timestamp_seconds: 100n }]] },
    response([1n], [neuron(2n)]),
    response([1n], [neuron(1n), neuron(1n)]),
    response([1n], [neuron(1n, { id: [] })]),
    response([1n], [neuron(1n, { followees: [[0, { followees: [] }], [0, { followees: [] }]] })]),
    response([1n], [neuron(1n, { hot_keys: Array(11).fill(principal) })]),
    response([1n], [neuron(1n, { followees: [[0, { followees: Array.from({ length: 16 }, (_, index) => ({ id: BigInt(index + 1) })) }]] })]),
    response([1n], [neuron(1n, { cached_neuron_stake_e8s: 1n, neuron_fees_e8s: 2n })]),
    response([1n], [neuron(1n, { voting_power_refreshed_timestamp_seconds: [101n] })]),
    response([1n], [neuron(1n, { known_neuron_data: [{ name: "x".repeat(201), description: [], links: [], committed_topics: [] }] })]),
  ];
  for (const invalid of cases) assert.throws(() => validateListNeuronsBatch([1n], invalid, { target: true }), PreliminaryEvidenceError);
});

test("loader caches pending reads, batches sorted dependencies, and retries failed entries", async () => {
  const requests = [];
  let fail = true;
  const loader = createNeuronLoader({ listNeurons: async (request) => {
    requests.push(request.neuron_ids);
    if (fail) { fail = false; throw new Error("temporary"); }
    return response(request.neuron_ids);
  } });
  const first = await loader.loadDependencies([3n, 2n, 3n]);
  assert.equal(first.get("2").kind, "Unavailable");
  const second = await loader.loadDependencies([2n, 3n]);
  assert.equal(second.get("2").kind, "Found");
  assert.deepEqual(requests, [[2n, 3n], [2n, 3n]]);
  loader.clear();
  assert.equal(loader.cache.size, 0);
});

test("preliminary evaluator never passes controller-only rules", async () => {
  const target = neuron(42n, {
    followees: [
      [0, { followees: [{ id: ALPHA_VOTE_NEURON_ID }] }],
      [1, { followees: [10n, 11n, 12n, 13n, 14n].map((id) => ({ id })) }],
      [4, { followees: [10n, 11n, 12n].map((id) => ({ id })) }],
    ],
    known_neuron_data: [{ name: "Target", description: [], links: [[]], committed_topics: [[[topic("Governance")]]] }],
  });
  const governance = { list_neurons: async (request) => response(request.neuron_ids, request.neuron_ids.map((id) => id === 42n ? target : neuron(id, { known_neuron_data: [{ name: `Known ${id}`, description: [], links: [[]], committed_topics: [] }], followees: [[4, { followees: [{ id: OMEGA_REJECT_NEURON_ID }] }]] }))) };
  const loader = createNeuronLoader({ listNeurons: (request) => governance.list_neurons(request) });
  const report = evaluatePreliminary(42n, await collectPreliminaryEvidence(42n, loader));
  for (const id of ["DENDRITE-CONTROL-001", "DENDRITE-CONTROL-002", "DENDRITE-CONTROL-003"]) {
    assert.equal(variantName(report.rules.find((rule) => rule.rule_id === id).status), "Indeterminate");
  }
  assert.notEqual(variantName(report.overall_status), "Compliant");
});

const differentialEvidence = () => {
  const managers = [100n, 101n, 102n, 103n, 104n];
  const following = new Map([[1, [...managers]], [4, [100n, 101n, 102n]]]);
  for (const code of [0, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18]) following.set(code, [ALPHA_VOTE_NEURON_ID]);
  const found = (id) => ({ kind: "Found", neuron: {
    id, controller: undefined, knownData: { id, name: `known-${id}`, description: undefined, links: [] },
    hotKeys: [], notForProfit: false, dissolveDelaySeconds: 63_115_200n, dissolving: false,
    effectiveStakeE8s: 1n, mintedStakeE8s: 1n, votingPowerRefreshedTimestampSeconds: 999_999n,
    potentialVotingPower: 1n, decidingVotingPower: 1n, committedTopics: [],
    followees: new Map(managers.slice(0, 3).includes(id) ? [[4, [OMEGA_REJECT_NEURON_ID]]] : []),
  } });
  return {
    nowSeconds: 1_000_000n,
    target: { kind: "Found", neuron: {
      id: 42n, controller: principal, knownData: { id: 42n, name: "Dendrite", description: "A compliant target", links: ["https://example.com/dendrite"] },
      hotKeys: [], notForProfit: false, dissolveDelaySeconds: 63_115_200n, dissolving: false,
      effectiveStakeE8s: 100_000_000n, mintedStakeE8s: 100_000_000n, votingPowerRefreshedTimestampSeconds: 999_999n,
      potentialVotingPower: 10n, decidingVotingPower: 10n, committedTopics: [4], followees: following,
    } },
    dependencies: new Map([...managers, ALPHA_VOTE_NEURON_ID, OMEGA_REJECT_NEURON_ID].map((id) => [id.toString(), found(id)])),
    controller: { callSucceeded: true, moduleHash: undefined, controllers: [] },
    sourceFailures: [],
    unknownCommittedTopics: 0,
  };
};
function mutateDifferential(name, evidence) {
  const target = () => evidence.target.neuron;
  switch (name) {
    case "fully_compliant": break;
    case "target_missing": evidence.target = { kind: "ConfirmedMissing" }; break;
    case "target_unavailable": evidence.target = { kind: "Unavailable" }; break;
    case "wrong_target_id": target().id = 43n; break;
    case "missing_known_neuron": target().knownData = undefined; break;
    case "target_hotkeys": target().hotKeys.push(principal); break;
    case "not_for_profit": target().notForProfit = true; break;
    case "dissolving": target().dissolving = true; break;
    case "short_dissolve_delay": target().dissolveDelaySeconds = 1n; break;
    case "stale_voting_power": target().votingPowerRefreshedTimestampSeconds = 1n; break;
    case "voting_power_mismatch": target().decidingVotingPower = 9n; break;
    case "too_few_managers": target().followees.set(1, [100n, 101n, 102n, 103n]); break;
    case "too_many_managers": target().followees.set(1, Array.from({ length: 16 }, (_, index) => BigInt(index + 100))); break;
    case "duplicate_managers": target().followees.get(1).push(100n); break;
    case "self_manager": target().followees.get(1).push(42n); break;
    case "manager_missing": evidence.dependencies.set("100", { kind: "ConfirmedMissing" }); break;
    case "manager_unavailable": evidence.dependencies.set("100", { kind: "Unavailable" }); break;
    case "manager_hotkeys": evidence.dependencies.get("100").neuron.hotKeys.push(principal); break;
    case "incorrect_management_following": target().followees.set(1, [7n]); break;
    case "alpha_vote_mismatch": target().followees.set(3, [7n]); break;
    case "omega_reject_mismatch": evidence.dependencies.get("100").neuron.followees.set(4, [ALPHA_VOTE_NEURON_ID]); break;
    case "committed_missing_delegate": target().followees.set(4, [100n, 101n]); break;
    case "committed_extra_delegate": target().followees.get(4).push(104n); break;
    case "non_committed_mismatch": target().followees.set(17, [7n]); break;
    case "quorum_edge": target().followees.set(1, [100n, 101n, 102n, 103n, 104n, 105n]); break;
    case "controller_unavailable": evidence.controller = undefined; break;
    case "controller_module_present": evidence.controller.moduleHash = new Uint8Array([1]); break;
    case "controller_list_retained": evidence.controller.controllers.push(principal); break;
    case "unknown_committed_topic": evidence.unknownCommittedTopics = 1; break;
    case "source_failure": evidence.sourceFailures.push({ method: "list_neurons", kind: "Rejected", message: "bounded rejection", affectedNeuronIds: [100n] }); break;
    case "unknown_following_topic": target().followees.set(99, [7n]); break;
    case "contradictory_unavailable_evidence": target().effectiveStakeE8s = undefined; break;
    default: throw new Error(`unknown differential fixture ${name}`);
  }
}

test("browser evaluator matches all deterministic Rust policy fixtures", () => {
  const fixtures = JSON.parse(readFileSync("canisters/dendrite/web/test/fixtures/evaluator.json", "utf8"));
  assert.equal(fixtures.length, 32);
  for (const fixture of fixtures) {
    const evidence = differentialEvidence();
    mutateDifferential(fixture.name, evidence);
    const report = evaluatePreliminary(42n, evidence);
    assert.equal(variantName(report.overall_status), fixture.overall_status, fixture.name);
    assert.equal(report.quorum_threshold[0], fixture.quorum_threshold ?? undefined, fixture.name);
    assert.deepEqual(report.rules.map((rule) => ({ rule_id: rule.rule_id, status: variantName(rule.status) })), fixture.rules, fixture.name);
  }
});

class FakeNode {
  constructor(tag) { this.tag = tag; this.children = []; this.textContent = ""; this.listeners = {}; this.attributes = {}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  dispatch(name, event = { preventDefault() {} }) { return this.listeners[name](event); }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  focus() {}
}
const fakeDocument = (root) => ({ createElement: (tag) => new FakeNode(tag), createTextNode: (text) => ({ textContent: text }), querySelector: () => root });
const findNode = (root, predicate) => {
  if (predicate(root)) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
};
const report = (id = 42n) => ({
  standard_version: "nns-dendrite/1.0-draft", neuron_id: id, checked_at_timestamp_seconds: 100n,
  overall_status: { Indeterminate: null }, target: [], managers: [], committed_topics: [], non_committed_topics: [],
  controller: [], rules: [{ rule_id: "DENDRITE-CONTROL-001", status: { Indeterminate: null }, message: "requires on-chain verification", observed: [], expected: [], related_neuron_ids: [], relevant_topic: [] }],
  quorum_threshold: [], source_revision: "revision", source_failures: [],
});

test("route is preliminary-only and explicit verification calls Dendrite once while preserving low-cycle evidence", async () => {
  const prior = globalThis.document, root = new FakeNode("main"), location = { hash: "#/neuron/42" };
  globalThis.document = fakeDocument(root);
  try {
    let governanceReads = 0, dendriteCalls = 0, lowCycles = true;
    const app = createApplication({
      root, location, onHashChange: () => {},
      governanceActorFactory: async () => ({ list_neurons: async () => { governanceReads += 1; } }),
      preliminaryAnalyzerFactory: () => ({ analyze: async () => { governanceReads += 1; return report(); }, clear() {} }),
      actorFactory: async () => ({ check_neuron: async () => { dendriteCalls += 1; return lowCycles ? { Err: { LowCycles: null } } : { Ok: { ...report(), overall_status: { NonCompliant: null }, controller: [{ call_succeeded: true, module_hash: [], controllers: [], principal: [] }] } }; } }),
      authSession: { configuration: { derivationOrigin: "https://dendrite.example" }, restore: async () => null },
    });
    await app.start();
    assert.equal(governanceReads, 1);
    assert.equal(dendriteCalls, 0);
    assert.match(JSON.stringify(root), /Preliminary/);
    await findNode(root, (node) => node.textContent === "Verify on-chain").dispatch("click");
    assert.equal(dendriteCalls, 1);
    assert.match(JSON.stringify(root), /Preliminary analysis remains available/);
    assert.match(JSON.stringify(root), /Preliminary/);
    lowCycles = false;
    await findNode(root, (node) => node.textContent === "Verify on-chain").dispatch("click");
    assert.equal(dendriteCalls, 2);
    assert.match(JSON.stringify(root), /Consensus verified/);
  } finally {
    globalThis.document = prior;
  }
});

test("presentation helpers order severity, group topics, shorten principals, and deliberately title unknown rules", () => {
  const findings = sortedFindings([
    { status: { Warning: null } }, { status: { Fail: null } }, { status: { Indeterminate: null } }, { status: { StandardUpdateRequired: null } },
  ]);
  assert.deepEqual(findings.map((item) => variantName(item.status)), ["Fail", "StandardUpdateRequired", "Indeterminate", "Warning"]);
  assert.equal(groupTopics({ committed_topics: [{ topic: 4, delegate_ids: [1n] }, { topic: 5, delegate_ids: [1n] }], non_committed_topics: [] })[0].topics.length, 2);
  assert.match(shortPrincipal("aaaaa-bbbbb-ccccc-ddddd"), /…/);
  assert.equal(ruleTitle("UNKNOWN-RULE"), "Technical check: UNKNOWN-RULE");
});

test("preliminary production modules use no persistent browser storage", () => {
  for (const path of [
    "canisters/dendrite/web/src/governance-read-actor.js",
    "canisters/dendrite/web/src/preliminary-evidence.js",
    "canisters/dendrite/web/src/preliminary-evaluator.js",
  ]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /localStorage|sessionStorage|indexedDB|caches\./);
  }
});
