import {
  ALPHA_VOTE_NEURON_ID,
  OMEGA_REJECT_NEURON_ID,
  RECOGNISED_TOPICS,
  SOURCE_REVISION,
} from "./preliminary-evidence.js";

export const STANDARD_VERSION = "nns-dendrite/1.0-draft";
export const MAX_DISSOLVE_DELAY_SECONDS = 63_115_200n;
export const SIX_NOMINAL_MONTHS_SECONDS = 15_778_800n;

const variant = (name) => ({ [name]: null });
const option = (value) => value === undefined ? [] : [value];
const key = (value) => BigInt(value).toString();
const distinct = (values) => new Set(values.map(key)).size === values.length;
const singleton = (values, expected) => Array.isArray(values) && values.length === 1 && values[0] === expected;
const concrete = (topic) => RECOGNISED_TOPICS.includes(topic) && topic !== 0 && topic !== 1;

function rule(ruleId, passed, message) {
  return {
    rule_id: ruleId,
    status: variant(passed ? "Pass" : "Fail"),
    message,
    observed: [],
    expected: [],
    related_neuron_ids: [],
    relevant_topic: [],
  };
}
function evidencedRule(ruleId, passed, passMessage, failMessage, observed, expected) {
  const result = rule(ruleId, passed, passed ? passMessage : failMessage);
  result.observed = [observed];
  result.expected = [expected];
  return result;
}
const statusName = (result) => Object.keys(result.status)[0];
const setStatus = (result, status, message) => {
  result.status = variant(status);
  if (message) result.message = message;
  return result;
};
const lookup = (dependencies, id) => dependencies.get(key(id));
const known = (entry) => entry?.kind === "Found" ? entry.neuron.knownData : undefined;

function dependentRule(ruleId, entries, message) {
  let factualFailure = false;
  let unavailable = false;
  const result = rule(ruleId, true, message);
  for (const [id, satisfied, isUnavailable] of entries) {
    result.related_neuron_ids.push(id);
    factualFailure ||= !satisfied && !isUnavailable;
    unavailable ||= isUnavailable;
  }
  if (factualFailure) result.status = variant("Fail");
  else if (unavailable) setStatus(result, "Indeterminate", `${message}; required neuron evidence was unavailable`);
  return result;
}

function sourceFailure(failure) {
  return {
    method: String(failure.method).slice(0, 128),
    kind: variant(failure.kind),
    message: String(failure.message).slice(0, 512),
    affected_neuron_ids: failure.affectedNeuronIds.slice(0, 50),
  };
}

function finish(neuronId, evidence, managers, topics, quorum, rules) {
  const target = evidence.target.kind === "Found" ? evidence.target.neuron : undefined;
  const overall = rules.some((item) => statusName(item) === "Fail")
    ? "NonCompliant"
    : rules.some((item) => statusName(item) === "StandardUpdateRequired")
      ? "StandardUpdateRequired"
      : rules.some((item) => statusName(item) === "Indeterminate")
        ? "Indeterminate"
        : "Compliant";
  const managerSummaries = managers.map((id) => {
    const entry = lookup(evidence.dependencies, id);
    const found = entry?.kind === "Found" ? entry.neuron : undefined;
    return {
      neuron_id: id,
      evidence_status: variant(entry?.kind === "Found" ? "Found" : entry?.kind === "Unavailable" ? "Unavailable" : "ConfirmedMissing"),
      known_neuron: option(found?.knownData),
      controller: option(found?.controller),
      hot_keys: found?.hotKeys ?? [],
      minted_stake_e8s: option(found?.mintedStakeE8s),
      neuron_management_followees: found?.followees.get(1) ?? [],
      omega_ready_topics: found ? RECOGNISED_TOPICS.filter((topic) => singleton(found.followees.get(topic), OMEGA_REJECT_NEURON_ID)) : [],
    };
  });
  return {
    standard_version: STANDARD_VERSION,
    neuron_id: neuronId,
    checked_at_timestamp_seconds: evidence.nowSeconds,
    overall_status: variant(overall),
    target: option(target && {
      neuron_id: target.id,
      known_neuron: option(target.knownData),
      controller: option(target.controller),
      hot_keys: target.hotKeys,
      not_for_profit: option(target.notForProfit),
      dissolve_delay_seconds: option(target.dissolveDelaySeconds),
      dissolving: option(target.dissolving),
      effective_stake_e8s: option(target.effectiveStakeE8s),
      voting_power_refreshed_timestamp_seconds: option(target.votingPowerRefreshedTimestampSeconds),
      potential_voting_power: option(target.potentialVotingPower),
      deciding_voting_power: option(target.decidingVotingPower),
    }),
    managers: managerSummaries,
    committed_topics: topics.map((topic) => ({ topic, delegate_ids: target?.followees.get(topic) ?? [] })),
    non_committed_topics: target ? RECOGNISED_TOPICS
      .filter((topic) => topic !== 1 && !topics.includes(topic))
      .map((topic) => ({ topic, followee_ids: target.followees.get(topic) ?? [] })) : [],
    controller: option(evidence.controller && {
      principal: option(target?.controller),
      call_succeeded: evidence.controller.callSucceeded,
      module_hash: option(evidence.controller.moduleHash),
      controllers: evidence.controller.controllers,
    }),
    rules,
    quorum_threshold: option(quorum),
    source_revision: SOURCE_REVISION,
    source_failures: evidence.sourceFailures.slice(0, 32).map(sourceFailure),
  };
}

export function evaluatePreliminary(neuronId, evidence) {
  const id = BigInt(neuronId);
  const rules = [];
  if (evidence.target.kind !== "Found") {
    const unavailable = evidence.target.kind === "Unavailable";
    rules.push(setStatus(rule("DENDRITE-KNOWN-001", false, unavailable ? "target existence could not be established" : "target neuron was not returned"), unavailable ? "Indeterminate" : "Fail"));
    rules.push(setStatus(rule("DENDRITE-DATA-001", !unavailable, "target lookup reached a terminal factual result"), unavailable ? "Indeterminate" : "Pass"));
    const provenance = rule("DENDRITE-DATA-002", evidence.nowSeconds > 0n && evidence.sourceFailures.length <= 32, "timestamped fixed-source provenance is present");
    if (evidence.nowSeconds === 0n) setStatus(provenance, "Indeterminate", "NNS evidence snapshot timestamp was unavailable");
    rules.push(provenance);
    rules.push(setStatus(rule("DENDRITE-DATA-003", !unavailable, "missing evidence was not inferred as passing"), unavailable ? "Indeterminate" : "Pass"));
    return finish(id, evidence, [], [], undefined, rules);
  }
  const target = evidence.target.neuron;
  rules.push(rule("DENDRITE-KNOWN-001", true, "target exists"));
  rules.push(rule("DENDRITE-KNOWN-002", target.knownData !== undefined, "target is a current known neuron"));
  const concreteTopics = target.committedTopics.some(concrete);
  const known3 = rule("DENDRITE-KNOWN-003", concreteTopics, "at least one concrete committed topic exists");
  if (!concreteTopics && evidence.unknownCommittedTopics > 0) {
    setStatus(known3, "StandardUpdateRequired");
    known3.observed = [`${evidence.unknownCommittedTopics} unknown committed-topic variant(s)`];
  }
  rules.push(known3);
  const rawCommittedCount = target.committedTopics.length + evidence.unknownCommittedTopics;
  const duplicateTopics = new Set(target.committedTopics).size !== target.committedTopics.length;
  const factualCommittedInvalidity = rawCommittedCount === 0 || target.committedTopics.some((topic) => topic === 0 || topic === 1) || duplicateTopics;
  const known4 = rule("DENDRITE-KNOWN-004",
    evidence.unknownCommittedTopics === 0 && rawCommittedCount > 0 && target.committedTopics.every(concrete) && !duplicateTopics,
    "committed topics are recognised, concrete, and distinct");
  if (evidence.unknownCommittedTopics > 0 && !factualCommittedInvalidity) {
    setStatus(known4, "StandardUpdateRequired");
    known4.observed = [`${evidence.unknownCommittedTopics} unknown committed-topic variant(s)`];
  } else if (!factualCommittedInvalidity && target.committedTopics.some((topic) => !RECOGNISED_TOPICS.includes(topic))) {
    setStatus(known4, "StandardUpdateRequired", "committed topic uses an unknown or reserved topic code");
  }
  rules.push(known4);
  rules.push(evidencedRule("DENDRITE-LOCK-001", target.dissolving === false,
    "target is locked and not dissolving",
    `target is ${target.dissolving === undefined ? "unavailable" : target.dissolving ? "dissolving" : "locked"}`,
    target.dissolving === undefined ? "dissolving state unavailable" : target.dissolving ? "dissolving" : "locked and not dissolving",
    "locked and not dissolving"));
  rules.push(evidencedRule("DENDRITE-LOCK-002", target.dissolveDelaySeconds === MAX_DISSOLVE_DELAY_SECONDS,
    "target has the standard maximum dissolve delay",
    `dissolve delay is ${target.dissolveDelaySeconds ?? "unavailable"} seconds; expected ${MAX_DISSOLVE_DELAY_SECONDS} seconds`,
    target.dissolveDelaySeconds === undefined ? "unavailable" : `${target.dissolveDelaySeconds} seconds`,
    "63115200 seconds"));
  rules.push(evidencedRule("DENDRITE-LOCK-003", target.effectiveStakeE8s !== undefined && target.effectiveStakeE8s > 0n,
    "effective stake is positive",
    `effective stake is ${target.effectiveStakeE8s ?? "unavailable"} e8s; expected a positive value`,
    target.effectiveStakeE8s === undefined ? "unavailable" : `${target.effectiveStakeE8s} e8s`,
    "positive effective stake"));
  rules.push(evidencedRule("DENDRITE-ACTIVE-001",
    target.votingPowerRefreshedTimestampSeconds !== undefined
      && evidence.nowSeconds >= target.votingPowerRefreshedTimestampSeconds
      && evidence.nowSeconds - target.votingPowerRefreshedTimestampSeconds <= SIX_NOMINAL_MONTHS_SECONDS,
    "voting power was refreshed within six nominal months",
    "voting-power refresh age exceeds the permitted threshold",
    target.votingPowerRefreshedTimestampSeconds === undefined ? "refresh timestamp unavailable"
      : `refreshed at ${target.votingPowerRefreshedTimestampSeconds}; evidence at ${evidence.nowSeconds}`,
    "age no greater than 15778800 seconds"));
  rules.push(evidencedRule("DENDRITE-ACTIVE-002",
    target.potentialVotingPower !== undefined && target.potentialVotingPower > 0n && target.potentialVotingPower === target.decidingVotingPower,
    "deciding and potential voting power match and are positive",
    "deciding and potential voting power do not match as positive values",
    `potential ${target.potentialVotingPower ?? "unavailable"}; deciding ${target.decidingVotingPower ?? "unavailable"}`,
    "equal positive potential and deciding voting power"));
  const controller = evidence.controller;
  const controllerText = target.controller?.toText?.() ?? target.controller?.toString?.() ?? "none";
  const control1 = evidencedRule("DENDRITE-CONTROL-001", target.controller !== undefined && controller?.callSucceeded === true,
    "controller canister state is available",
    target.controller === undefined ? "target neuron did not report a controller canister" : "controller canister state was unavailable",
    `controller canister ${controllerText}`, "controller canister state available");
  const moduleHash = controller?.moduleHash;
  const moduleHex = moduleHash ? [...moduleHash].map((byte) => byte.toString(16).padStart(2, "0")).join("") : undefined;
  const control2 = evidencedRule("DENDRITE-CONTROL-002", controller?.callSucceeded === true && moduleHash === undefined,
    "controller canister has no Wasm",
    moduleHash ? "controller canister has an installed Wasm module" : "controller module state could not be determined",
    moduleHash ? `module hash ${moduleHex}` : "no installed Wasm module", "no installed Wasm module");
  const retained = controller?.controllers?.length ?? 0;
  const retainedText = controller?.controllers?.map((principal) => principal.toText?.() ?? String(principal)).join(", ");
  const control3 = evidencedRule("DENDRITE-CONTROL-003", controller?.callSucceeded === true && retained === 0,
    "controller canister has an empty controller list",
    controller?.callSucceeded === true ? `controller canister retains ${retained} controller${retained === 1 ? "" : "s"}` : "controller-list status could not be determined",
    controller ? retained ? `${retained} controller${retained === 1 ? "" : "s"}: ${retainedText}` : "no controllers" : "controller list unavailable",
    "no controllers");
  if (target.controller !== undefined && controller?.callSucceeded !== true) {
    setStatus(control1, "Indeterminate", `${control1.message}; mandatory evidence was unavailable`);
    setStatus(control2, "Indeterminate", `${control2.message}; mandatory evidence was unavailable`);
    setStatus(control3, "Indeterminate", `${control3.message}; mandatory evidence was unavailable`);
  }
  rules.push(control1, control2, control3);
  const hotkeyText = target.hotKeys.map((principal) => principal.toText?.() ?? String(principal)).join(", ");
  rules.push(evidencedRule("DENDRITE-CONTROL-004", target.hotKeys.length === 0,
    "target has no hotkeys",
    `target retains ${target.hotKeys.length} hotkey${target.hotKeys.length === 1 ? "" : "s"}`,
    target.hotKeys.length ? `${target.hotKeys.length} hotkey${target.hotKeys.length === 1 ? "" : "s"}: ${hotkeyText}` : "0 hotkeys",
    "no hotkeys"));
  rules.push(evidencedRule("DENDRITE-CONTROL-005", target.notForProfit === false,
    "not-for-profit exception is disabled",
    `not_for_profit is ${target.notForProfit ?? "unavailable"}; expected false`,
    String(target.notForProfit ?? "unavailable"), "false"));
  const managers = target.followees.get(1) ?? [];
  rules.push(evidencedRule("DENDRITE-NM-001", managers.length >= 5 && managers.length <= 15,
    "there are five to fifteen raw managers",
    `target reports ${managers.length} manager${managers.length === 1 ? "" : "s"}; expected 5 to 15`,
    `${managers.length} manager${managers.length === 1 ? "" : "s"}`, "5 to 15 managers"));
  const managerSeen = new Set();
  const duplicateManagers = managers.filter((manager) => {
    const value = String(manager);
    if (managerSeen.has(value)) return true;
    managerSeen.add(value);
    return false;
  });
  rules.push(evidencedRule("DENDRITE-NM-002", duplicateManagers.length === 0,
    "manager IDs are distinct",
    `duplicate manager IDs were found: ${duplicateManagers.join(", ")}`,
    duplicateManagers.length ? `duplicate manager IDs: ${duplicateManagers.join(", ")}` : "manager IDs are distinct",
    "distinct manager IDs"));
  rules.push(evidencedRule("DENDRITE-NM-003", !managers.includes(id),
    "target is not its own manager", `target neuron ${id} appears as a manager`,
    managers.includes(id) ? `target neuron ${id} appears as a manager` : "target is absent from manager list",
    "target is not its own manager"));
  rules.push(dependentRule("DENDRITE-NM-004", managers.map((managerId) => {
    const entry = lookup(evidence.dependencies, managerId);
    return [managerId, known(entry) !== undefined, !entry || entry.kind === "Unavailable"];
  }), "every manager is a current known neuron"));
  rules.push(dependentRule("DENDRITE-NM-005", [ALPHA_VOTE_NEURON_ID, OMEGA_REJECT_NEURON_ID].map((anchorId) => {
    const entry = lookup(evidence.dependencies, anchorId);
    return [anchorId, known(entry) !== undefined, !entry || entry.kind === "Unavailable"];
  }), "alpha-vote and omega-reject remain known"));
  for (const topic of [...new Set(target.committedTopics)].sort((a, b) => a - b)) {
    const delegates = target.followees.get(topic) ?? [];
    const count = rule("DENDRITE-COMMIT-001", delegates.length >= 3, "committed topic has at least three delegates");
    count.relevant_topic = [topic]; count.related_neuron_ids = [...delegates]; count.observed = [String(delegates.length)]; count.expected = ["at least 3"]; rules.push(count);
    const unique = rule("DENDRITE-COMMIT-002", distinct(delegates), "committed delegates are distinct");
    unique.relevant_topic = [topic]; unique.related_neuron_ids = [...delegates]; rules.push(unique);
    const managerRule = dependentRule("DENDRITE-COMMIT-003", delegates.map((delegateId) => {
      const entry = lookup(evidence.dependencies, delegateId);
      return [delegateId, managers.includes(delegateId) && known(entry) !== undefined, managers.includes(delegateId) && (!entry || entry.kind === "Unavailable")];
    }), "committed delegates are managers and current known neurons");
    managerRule.relevant_topic = [topic]; managerRule.related_neuron_ids = [...delegates]; managerRule.expected = ["all delegates are raw Neuron Management managers"]; rules.push(managerRule);
    const omegaRule = dependentRule("DENDRITE-COMMIT-004", delegates.map((delegateId) => {
      const entry = lookup(evidence.dependencies, delegateId);
      return [delegateId, entry?.kind === "Found" && singleton(entry.neuron.followees.get(topic), OMEGA_REJECT_NEURON_ID), !entry || entry.kind === "Unavailable"];
    }), "each delegate follows omega-reject exactly");
    omegaRule.relevant_topic = [topic]; omegaRule.related_neuron_ids = [...delegates]; omegaRule.expected = [`exact singleton [${OMEGA_REJECT_NEURON_ID}]`]; rules.push(omegaRule);
  }
  for (const topic of RECOGNISED_TOPICS) {
    if (topic === 0 || topic === 1 || target.committedTopics.includes(topic)) continue;
    const result = rule("DENDRITE-DEFAULT-001", singleton(target.followees.get(topic), ALPHA_VOTE_NEURON_ID), "non-committed topic follows alpha-vote exactly");
    result.relevant_topic = [topic]; result.related_neuron_ids = target.followees.get(topic) ?? []; result.expected = [`exact singleton [${ALPHA_VOTE_NEURON_ID}]`]; rules.push(result);
  }
  const catchAll = rule("DENDRITE-DEFAULT-002", singleton(target.followees.get(0), ALPHA_VOTE_NEURON_ID), "CatchAll follows alpha-vote exactly");
  catchAll.relevant_topic = [0]; catchAll.related_neuron_ids = target.followees.get(0) ?? []; catchAll.expected = [`exact singleton [${ALPHA_VOTE_NEURON_ID}]`]; rules.push(catchAll);
  const hasUnknown = [...target.followees].some(([topic, ids]) => ids.length > 0 && !RECOGNISED_TOPICS.includes(topic));
  rules.push(setStatus(rule("DENDRITE-DEFAULT-003", !hasUnknown, "no unknown non-empty following topics"), hasUnknown ? "StandardUpdateRequired" : "Pass"));
  const anyUnavailable = [...evidence.dependencies.values()].some((entry) => entry.kind === "Unavailable");
  rules.push(setStatus(rule("DENDRITE-DATA-001", !anyUnavailable, "every required lookup reached a terminal factual result"), anyUnavailable ? "Indeterminate" : "Pass"));
  rules.push(rule("DENDRITE-DATA-002", evidence.nowSeconds > 0n && evidence.sourceFailures.length <= 32, "timestamped fixed-source provenance is present"));
  const unavailablePass = rules.some((result) => statusName(result) === "Pass"
    && ["DENDRITE-NM-004", "DENDRITE-NM-005", "DENDRITE-COMMIT-003", "DENDRITE-COMMIT-004"].includes(result.rule_id)
    && result.related_neuron_ids.some((related) => lookup(evidence.dependencies, related)?.kind === "Unavailable"));
  rules.push(rule("DENDRITE-DATA-003", !unavailablePass, "no unavailable lookup was inferred as passing"));
  for (const result of rules) {
    const unavailable = result.rule_id === "DENDRITE-LOCK-001" ? target.dissolving === undefined
      : result.rule_id === "DENDRITE-LOCK-002" ? target.dissolveDelaySeconds === undefined
        : result.rule_id === "DENDRITE-LOCK-003" ? target.effectiveStakeE8s === undefined
          : result.rule_id === "DENDRITE-ACTIVE-001" ? target.votingPowerRefreshedTimestampSeconds === undefined
            : result.rule_id === "DENDRITE-ACTIVE-002" ? target.potentialVotingPower === undefined || target.decidingVotingPower === undefined
              : result.rule_id === "DENDRITE-CONTROL-005" ? target.notForProfit === undefined
                : false;
    if (unavailable) setStatus(result, "Indeterminate", `${result.message}; mandatory evidence was unavailable`);
  }
  const distinctManagers = new Set(managers.map(key)).size;
  const quorum = distinctManagers === 0 ? undefined : Math.floor(distinctManagers / 2) + 1;
  return finish(id, evidence, managers, target.committedTopics, quorum, rules);
}

export function createPreliminaryAnalyzer({ governanceActor, loaderFactory, controllerReader }) {
  const createLoader = loaderFactory ?? ((listNeurons) => import("./preliminary-evidence.js").then(({ createNeuronLoader }) => createNeuronLoader({ listNeurons })));
  let loader;
  let certifiedReader = controllerReader;
  return Object.freeze({
    async analyze(neuronId) {
      const { collectPreliminaryEvidence } = await import("./preliminary-evidence.js");
      loader ??= await createLoader((request) => governanceActor.list_neurons(request));
      certifiedReader ??= (await import("./certified-canister-state.js")).createCertifiedCanisterStateReader();
      const evidence = await collectPreliminaryEvidence(BigInt(neuronId), loader, certifiedReader);
      const report = evaluatePreliminary(BigInt(neuronId), evidence);
      return Object.freeze({
        report,
        provenance: Object.freeze({
          governanceEvidence: Object.freeze({
            kind: "replica-signed-query",
            canisterId: "rrkah-fqaaa-aaaaa-aaaaq-cai",
            retrievedAt: evidence.nowSeconds > 0n
              ? new Date(Number(evidence.nowSeconds) * 1_000).toISOString()
              : undefined,
          }),
          controllerEvidence: Object.freeze(evidence.controllerProvenance),
          evaluation: Object.freeze({ kind: "browser" }),
        }),
      });
    },
    clear() {
      loader?.clear();
      certifiedReader?.clear();
      loader = undefined;
    },
  });
}
