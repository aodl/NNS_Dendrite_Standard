import { Principal } from "@icp-sdk/core/principal";
import { classifyManagerAuthority } from "./authority.js";
import { parseNeuronId } from "./ids.js";
import { ALPHA_VOTE_NEURON_ID, OMEGA_REJECT_NEURON_ID } from "./ids.js";
import { TOPIC_LABELS } from "./compliance-view.js";

export const PROPOSAL_TITLE = "Dendrite neuron management request";
export const COMMAND_CAPABILITIES = Object.freeze({
  Spawn: "high-risk", Split: "high-risk", Follow: "enabled", ClaimOrRefresh: "enabled",
  Configure: "enabled", RegisterVote: "enabled", Merge: "high-risk",
  DisburseToNeuron: "unavailable-target-not-for-profit-false",
  MakeProposal: "unavailable-nested-proposal", StakeMaturity: "enabled",
  MergeMaturity: "unavailable-removed-upstream", Disburse: "unavailable-target-not-for-profit-false",
  RefreshVotingPower: "enabled", DisburseMaturity: "high-risk", SetFollowing: "high-risk",
});
const E8S_PER_ICP = 100_000_000n;
const MAX_NOTE_BYTES = 1_000;
const MAX_NNS_ERROR_CHARS = 512;

export function formatE8s(value) {
  if (typeof value !== "bigint" || value < 0n) throw new TypeError("e8s must be a non-negative bigint.");
  const whole = value / E8S_PER_ICP;
  const fraction = String(value % E8S_PER_ICP).padStart(8, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export function parseIcpToE8s(value) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)(\.[0-9]{1,8})?$/.test(value)) {
    throw new TypeError("ICP must be a canonical non-negative decimal with at most 8 places.");
  }
  const [whole, fraction = ""] = value.split(".");
  const e8s = BigInt(whole) * E8S_PER_ICP + BigInt((fraction + "00000000").slice(0, 8));
  if (e8s > 18_446_744_073_709_551_615n) throw new RangeError("ICP amount exceeds nat64.");
  return e8s;
}

export function deepFreeze(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  if (value instanceof Principal || ArrayBuffer.isView(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

const neuron = (id) => ({ NeuronId: { id: parseNeuronId(String(id)) } });
const boundedNote = (note) => {
  const value = String(note ?? "");
  if (new TextEncoder().encode(value).length > MAX_NOTE_BYTES) throw new RangeError("Proposal note is too long.");
  return value;
};

export function buildManageNeuronProposal(managerId, targetId, innerCommand, note = "") {
  const manager = parseNeuronId(String(managerId));
  const target = parseNeuronId(String(targetId));
  if (!innerCommand || Object.keys(innerCommand).length !== 1) throw new TypeError("Exactly one target command is required.");
  const summary = `Manage Dendrite neuron ${target}.${boundedNote(note) ? ` Note: ${boundedNote(note)}` : ""}`;
  return deepFreeze({
    id: [],
    neuron_id_or_subaccount: [neuron(manager)],
    command: [{ MakeProposal: {
      title: [PROPOSAL_TITLE], url: "", summary,
      action: [{ ManageNeuron: {
        id: [], neuron_id_or_subaccount: [neuron(target)], command: [innerCommand],
      } }],
    } }],
  });
}

export function buildDirectManagerOperation(managerId, command) {
  if (!command || Object.keys(command).length !== 1) throw new TypeError("Exactly one direct command is required.");
  return deepFreeze({ id: [], neuron_id_or_subaccount: [neuron(managerId)], command: [command] });
}

const distinctNeuronIds = (values, minimum = 0, maximum = 15) => {
  if (!Array.isArray(values) || values.length < minimum || values.length > maximum) throw new RangeError(`Enter ${minimum}–${maximum} followees.`);
  const ids = values.map((value) => parseNeuronId(String(value)));
  if (new Set(ids.map(String)).size !== ids.length) throw new TypeError("Followee IDs must be distinct.");
  return ids;
};

export function buildFollowCommand(topic, followeeIds, minimum = 0) {
  if (!Number.isInteger(topic) || !TOPIC_LABELS.has(topic) || topic === 11) throw new Error("Unknown or reserved topic; Dendrite interface update required.");
  return deepFreeze({ Follow: { topic, followees: distinctNeuronIds(followeeIds, minimum).map((id) => ({ id })) } });
}

export function buildPrimaryFollowCommand(report, topic, selectedIds = [], knownCandidates = []) {
  const targetId = report?.neuron_id;
  if (topic === 1) {
    const ids = distinctNeuronIds(selectedIds, 5);
    if (ids.some((id) => id === targetId)) throw new Error("The target cannot manage itself.");
    const known = new Set(knownCandidates.filter((entry) => entry?.known).map((entry) => String(entry.id)));
    if (ids.some((id) => !known.has(String(id)))) throw new Error("Every manager candidate must be a returned full public known neuron.");
    return buildFollowCommand(topic, ids, 5);
  }
  const committed = report?.committed_topics?.some((entry) => entry.topic === topic);
  if (committed) {
    const ids = distinctNeuronIds(selectedIds, 3);
    for (const id of ids) {
      const candidate = report.managers.find((entry) => entry.neuron_id === id);
      if (!candidate || variant(candidate.evidence_status) !== "Found" || !candidate.known_neuron?.length) throw new Error("Committed delegates must be found known target managers.");
      if (!candidate.omega_ready_topics?.includes(topic)) throw new Error(`Manager ${id} does not follow omega-reject ${OMEGA_REJECT_NEURON_ID} exactly on this topic.`);
    }
    return buildFollowCommand(topic, ids, 3);
  }
  if (!TOPIC_LABELS.has(topic) || topic === 11) throw new Error("Unknown or reserved topic; Dendrite interface update required.");
  return buildFollowCommand(topic, [ALPHA_VOTE_NEURON_ID], 1);
}

export const buildRefreshVotingPowerCommand = () => deepFreeze({ RefreshVotingPower: {} });

export function buildStandardSetFollowingCommand(report, rows, knownCandidates = []) {
  if (!Array.isArray(rows) || rows.length > TOPIC_LABELS.size) throw new RangeError("SetFollowing rows exceed the recognised topic bound.");
  if (new Set(rows.map((row) => row.topic)).size !== rows.length) throw new Error("SetFollowing topics must be unique.");
  const topicFollowing = rows.map((row) => {
    const follow = buildPrimaryFollowCommand(report, row.topic, row.followeeIds, knownCandidates).Follow;
    return { topic: [row.topic], followees: [follow.followees] };
  });
  return deepFreeze({ SetFollowing: { topic_following: [topicFollowing] } });
}

export function buildRegisterVoteCommand(proposalInfo, vote, nowSeconds) {
  const id = proposalInfo?.id?.[0]?.id;
  if (typeof id !== "bigint") throw new Error("Proposal does not exist.");
  if (proposalInfo.status !== 1) throw new Error("Proposal is not Open.");
  if (proposalInfo.deadline_timestamp_seconds?.[0] <= nowSeconds) throw new Error("Proposal deadline has passed.");
  if (proposalInfo.topic === 1) throw new Error("Use manager voting for Neuron Management proposals.");
  if (vote !== 1 && vote !== 2) throw new Error("Vote must be explicitly Yes or No.");
  return deepFreeze({ RegisterVote: { proposal: [{ id }], vote } });
}

const percentage = (value) => {
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new RangeError("Percentage must be 1–100.");
  return value;
};
const optional = (value) => value === undefined ? [] : [value];
const nat64 = (value, label) => {
  const parsed = typeof value === "bigint" ? value : BigInt(value);
  if (parsed < 0n || parsed > 18_446_744_073_709_551_615n) throw new RangeError(`${label} must be nat64.`);
  return parsed;
};
const nat32 = (value, label) => {
  if (!Number.isInteger(value) || value < 0 || value > 4_294_967_295) throw new RangeError(`${label} must be nat32.`);
  return value;
};
const bytes32 = (value, label) => {
  if (!(value instanceof Uint8Array) || value.length !== 32) throw new TypeError(`${label} must be exactly 32 bytes.`);
  return value;
};

export function buildConfigureOperation(kind, fields = {}) {
  switch (kind) {
    case "IncreaseDissolveDelay": return { IncreaseDissolveDelay: { additional_dissolve_delay_seconds: nat32(fields.seconds, "Dissolve delay increase") } };
    case "SetDissolveTimestamp": return { SetDissolveTimestamp: { dissolve_timestamp_seconds: nat64(fields.timestampSeconds, "Dissolve timestamp") } };
    case "StartDissolving": return { StartDissolving: {} };
    case "StopDissolving": return { StopDissolving: {} };
    case "AddHotKey": return { AddHotKey: { new_hot_key: [Principal.fromText(fields.principal)] } };
    case "RemoveHotKey": return { RemoveHotKey: { hot_key_to_remove: [Principal.fromText(fields.principal)] } };
    case "JoinCommunityFund": return { JoinCommunityFund: {} };
    case "LeaveCommunityFund": return { LeaveCommunityFund: {} };
    case "ChangeAutoStakeMaturity": if (typeof fields.enabled !== "boolean") throw new TypeError("Auto-stake maturity setting must be boolean."); else return { ChangeAutoStakeMaturity: { requested_setting_for_auto_stake_maturity: fields.enabled } };
    case "SetVisibility": return { SetVisibility: { visibility: [nat32(fields.visibility, "Visibility")] } };
    default: throw new Error("Unknown Configure operation; interface update required.");
  }
}

export function buildAdvancedCommand(kind, fields = {}) {
  if (!(kind in COMMAND_CAPABILITIES)) throw new Error("Unknown command; interface update required.");
  if (COMMAND_CAPABILITIES[kind].startsWith("unavailable")) throw new Error(`Command unavailable: ${COMMAND_CAPABILITIES[kind]}.`);
  switch (kind) {
    case "Spawn": return deepFreeze({ Spawn: { percentage_to_spawn: optional(fields.percentage === undefined ? undefined : percentage(fields.percentage)), new_controller: optional(fields.newController === undefined ? undefined : Principal.fromText(fields.newController)), nonce: optional(fields.nonce === undefined ? undefined : nat64(fields.nonce, "Nonce")) } });
    case "Split": return deepFreeze({ Split: { amount_e8s: nat64(fields.amountE8s, "Amount"), memo: optional(fields.memo === undefined ? undefined : nat64(fields.memo, "Memo")) } });
    case "Follow": return buildFollowCommand(fields.topic, fields.followeeIds);
    case "ClaimOrRefresh": return deepFreeze({ ClaimOrRefresh: { by: [{ NeuronIdOrSubaccount: {} }] } });
    case "RegisterVote": return buildRegisterVoteCommand(fields.proposalInfo, fields.vote, fields.nowSeconds);
    case "Merge": return deepFreeze({ Merge: { source_neuron_id: [{ id: parseNeuronId(String(fields.sourceNeuronId)) }] } });
    case "StakeMaturity": return deepFreeze({ StakeMaturity: { percentage_to_stake: optional(fields.percentage === undefined ? undefined : percentage(fields.percentage)) } });
    case "RefreshVotingPower": return buildRefreshVotingPowerCommand();
    case "DisburseMaturity": {
      const command = { percentage_to_disburse: percentage(fields.percentage), to_account: [], to_account_identifier: [] };
      if (fields.account) command.to_account = [{ owner: [Principal.fromText(fields.account.owner)], subaccount: optional(fields.account.subaccount === undefined ? undefined : bytes32(fields.account.subaccount, "ICRC subaccount")) }];
      if (fields.accountIdentifier) command.to_account_identifier = [{ hash: bytes32(fields.accountIdentifier, "Account identifier") }];
      if ((command.to_account.length + command.to_account_identifier.length) !== 1) throw new Error("Choose exactly one explicit maturity destination.");
      return deepFreeze({ DisburseMaturity: command });
    }
    case "SetFollowing": {
      if (!Array.isArray(fields.rows) || fields.rows.length > TOPIC_LABELS.size) throw new RangeError("SetFollowing rows exceed the recognised topic bound.");
      if (new Set(fields.rows.map((row) => row.topic)).size !== fields.rows.length) throw new Error("SetFollowing topics must be unique.");
      return deepFreeze({ SetFollowing: { topic_following: [fields.rows.map((row) => {
        if (!TOPIC_LABELS.has(row.topic) || row.topic === 11) throw new Error("Unknown or reserved topic; interface update required.");
        return { topic: [row.topic], followees: [distinctNeuronIds(row.followeeIds).map((id) => ({ id }))] };
      })] } });
    }
    case "Configure": return deepFreeze({ Configure: { operation: [buildConfigureOperation(fields.configureKind, fields)] } });
    default: throw new Error(`Enabled command ${kind} needs an explicit reviewed builder.`);
  }
}

export function openManageNeuronProposalRequest(limit = 50) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("Proposal limit must be 1–100.");
  return deepFreeze({ include_reward_status: [], omit_large_fields: [true], before_proposal: [], limit,
    exclude_topic: [], include_all_manage_neuron_proposals: [true], include_status: [1], return_self_describing_action: [false] });
}

const storedManageNeuron = (info) => info?.proposal?.[0]?.action?.[0]?.ManageNeuron;
export function filterTargetManageNeuronProposals(proposals, targetId) {
  const target = parseNeuronId(String(targetId));
  return proposals.filter((info) => storedManageNeuron(info)?.neuron_id_or_subaccount?.[0]?.NeuronId?.id === target);
}

export function validateOpenManagerProposal(info, targetId, managerId, vote, nowSeconds) {
  const target = parseNeuronId(String(targetId)), manager = parseNeuronId(String(managerId));
  if (info?.status !== 1 || info?.deadline_timestamp_seconds?.[0] <= nowSeconds) throw new Error("Neuron Management proposal is no longer Open.");
  if (storedManageNeuron(info)?.neuron_id_or_subaccount?.[0]?.NeuronId?.id !== target) throw new Error("Stored proposal target does not match the current Dendrite neuron.");
  const ballot = info.ballots?.find(([id]) => id === manager)?.[1];
  if (ballot && ballot.vote !== 0) throw new Error("Selected manager has already voted conclusively.");
  if (vote !== 1 && vote !== 2) throw new Error("Manager vote must be explicitly Yes or No.");
  const proposalId = info.id?.[0]?.id;
  if (typeof proposalId !== "bigint") throw new Error("Proposal ID is unavailable.");
  return deepFreeze({ RegisterVote: { proposal: [{ id: proposalId }], vote } });
}

export function classifyRewardReceiver(manager) {
  if (variant(manager?.evidence_status) !== "Found") return Object.freeze({ status: "Indeterminate" });
  const followees = manager.neuron_management_followees ?? [];
  if (followees.length === 0) return Object.freeze({ status: "FallbackToKnownNeuron" });
  if (followees.length === 1) return Object.freeze({ status: "Configured", receiverId: followees[0] });
  return Object.freeze({ status: "Ambiguous", receiverIds: [...followees] });
}

export function buildAddManagerHotkeyCommand(manager, targetId, newPrincipal, maximum = 10) {
  const target = parseNeuronId(String(targetId));
  if (manager.neuron_id === target) throw new Error("Onboarding cannot add a hotkey to the target Dendrite neuron.");
  const principal = Principal.fromText(newPrincipal);
  if (manager.hot_keys.some((entry) => entry.compareTo(principal) === "eq")) throw new Error("That principal is already a manager hotkey.");
  if (manager.hot_keys.length >= maximum) throw new Error("Manager hotkey count is already at the NNS maximum.");
  return deepFreeze({ Configure: { operation: [{ AddHotKey: { new_hot_key: [principal] } }] } });
}

export function buildRewardReceiverCommand(receiverId) {
  return buildFollowCommand(1, [receiverId], 1);
}

const variant = (value) => Object.keys(value ?? {})[0];
export function decodeManageNeuronResponse(response, expected) {
  if (!Array.isArray(response?.command) || response.command.length !== 1) throw new Error("NNS response is missing a command; interface update required.");
  const command = response.command[0];
  const name = variant(command);
  if (name === "Error") {
    const error = command.Error ?? {};
    const type = Number.isInteger(error.error_type) ? error.error_type : "unknown";
    const message = String(error.error_message ?? "Governance rejected the request.").slice(0, MAX_NNS_ERROR_CHARS);
    throw new Error(`Governance error ${type}: ${message}`);
  }
  if (name !== expected) throw new Error(`Unexpected NNS ${name ?? "unknown"} response; interface update required.`);
  if (expected === "MakeProposal") {
    const id = command.MakeProposal?.proposal_id?.[0]?.id;
    if (typeof id !== "bigint") throw new Error("NNS proposal response omitted its proposal ID.");
    return Object.freeze({ proposalId: id });
  }
  return Object.freeze({ operation: expected });
}

const foundManager = (report, managerId, principal) => {
  const manager = report?.managers?.find((entry) => entry.neuron_id === managerId);
  if (!manager || variant(manager.evidence_status) !== "Found") throw new Error("Selected manager is not Found in fresh Dendrite evidence.");
  if (!classifyManagerAuthority(manager, principal).eligible) throw new Error("Authenticated principal no longer controls the selected manager.");
  return manager;
};

export function createTransactionPipeline({ getSession, getNnsActor, checkNeuron }) {
  let pending;
  let inFlight = false;
  const clear = () => { pending = undefined; };
  const liveContext = async (targetId, managerId) => {
    const session = await getSession();
    if (!session?.principal || !session?.signingIdentity || typeof session.validate !== "function") throw new Error("A current Governance-targeted session is required.");
    await session.validate();
    const report = await checkNeuron(targetId);
    if (report?.neuron_id !== targetId) throw new Error("Fresh Dendrite report target does not match the request.");
    return { session, report, manager: foundManager(report, managerId, session.principal) };
  };
  return Object.freeze({
    clear,
    get pending() { return pending; },
    async reviewProposal({ targetId, managerId, innerCommand, operation, note = "", highRisk = false }) {
      clear();
      const target = parseNeuronId(String(targetId)), manager = parseNeuronId(String(managerId));
      const context = await liveContext(target, manager);
      const economics = await (await getNnsActor()).get_network_economics_parameters();
      const fee = economics?.neuron_management_fee_per_proposal_e8s;
      const stake = context.manager.minted_stake_e8s?.[0];
      if (typeof fee !== "bigint" || typeof stake !== "bigint") throw new Error("Current proposal fee or manager minted stake is unavailable.");
      if (stake < fee) throw new Error("Selected manager minted stake does not cover the proposal fee.");
      const request = buildManageNeuronProposal(manager, target, innerCommand, note);
      pending = deepFreeze({ kind: "SubmitManageNeuronProposal", targetId: target, managerId: manager,
        operation, highRisk, request, reviewedFeeE8s: fee, mintedStakeE8s: stake,
        managerCount: new Set(context.report.managers.map((entry) => entry.neuron_id.toString())).size,
        quorum: context.report.quorum_threshold?.[0] });
      return pending;
    },
    async reviewDirect({ targetId, managerId, command, operation, highRisk = false, controllerOnly = false, revalidate }) {
      clear();
      const target = parseNeuronId(String(targetId)), manager = parseNeuronId(String(managerId));
      const context = await liveContext(target, manager);
      const authority = classifyManagerAuthority(context.manager, context.session.principal);
      if (controllerOnly && !authority.isController) throw new Error("This operation requires the manager controller.");
      pending = deepFreeze({ kind: "DirectManagerOperation", targetId: target, managerId: manager,
        operation, highRisk, request: buildDirectManagerOperation(manager, command), revalidate });
      return pending;
    },
    async submit(review, { confirmed = false, typedTarget = "" } = {}) {
      if (inFlight) throw new Error("Another transaction is already in flight.");
      if (!confirmed || review !== pending) throw new Error("Submit the current explicitly confirmed review.");
      if (review.highRisk && typedTarget !== review.targetId.toString()) throw new Error("Type the target neuron ID exactly.");
      inFlight = true;
      try {
        const context = await liveContext(review.targetId, review.managerId);
        if (review.revalidate) await review.revalidate();
        if (review.kind === "SubmitManageNeuronProposal") {
          const economics = await (await getNnsActor()).get_network_economics_parameters();
          if (economics?.neuron_management_fee_per_proposal_e8s !== review.reviewedFeeE8s) {
            clear(); throw new Error("The proposal fee changed; create a new review.");
          }
          if (context.manager.minted_stake_e8s?.[0] < review.reviewedFeeE8s) {
            clear(); throw new Error("Manager stake changed; create a new review.");
          }
        }
        let response;
        try {
          response = await (await getNnsActor()).manage_neuron(review.request);
        } catch (error) {
          throw new Error(`Transaction outcome is unknown; do not retry automatically. Use proposal lookup or a live recheck. ${String(error?.message ?? "Network call did not return evidence.").slice(0, 256)}`);
        }
        const expected = review.kind === "SubmitManageNeuronProposal" ? "MakeProposal" : variant(review.request.command[0]);
        const result = decodeManageNeuronResponse(response, expected);
        clear();
        return result;
      } finally { inFlight = false; }
    },
  });
}

export function principalText(value) { return Principal.fromText(value.toText()).toText(); }
