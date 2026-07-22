import { Principal } from "@icp-sdk/core/principal";
import { element } from "./dom.js";
import { parseIcpToE8s, buildAdvancedCommand, buildStandardSetFollowingCommand } from "./transaction.js";

const field = (name, placeholder = "") => {
  const node = document.createElement("input");
  node.name = name; node.placeholder = placeholder;
  return node;
};
const choice = (values) => {
  const node = document.createElement("select");
  for (const [value, label] of values) { const item = document.createElement("option"); item.value = value; item.textContent = label; node.append(item); }
  return node;
};
const button = (label, listener) => { const node = element("button", label); node.type = "button"; node.addEventListener("click", listener); return node; };
const box = (title, warning) => { const node = document.createElement("fieldset"); node.append(element("legend", title), element("p", warning)); return node; };
const optionalNat = (value) => value === "" ? undefined : BigInt(value);
const optionalPercent = (value) => value === "" ? undefined : Number(value);
const hex32 = (value, label) => {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) throw new Error(`${label} must be exactly 64 hexadecimal characters.`);
  return Uint8Array.from(value.match(/../g), (pair) => Number.parseInt(pair, 16));
};
const csvIds = (value) => value === "" ? [] : value.split(",").map((part) => part.trim());

export function renderAdvancedCommands(root, context) {
  const section = document.createElement("section");
  section.className = "advanced-commands";
  section.append(element("h3", "Advanced Neuron Management commands"), element("p", "These operations are secondary. Standard-breaking or destructive requests require typing the target neuron ID during final confirmation."));
  const review = async (command, operation, highRisk = false) => context.showReview(await context.pipeline.reviewProposal({ targetId: context.report.neuron_id, managerId: context.managerId(), innerCommand: command, operation, highRisk }));
  const run = (action) => async () => { try { await action(); } catch (error) { context.fail(error); } };

  const configure = box("Configure", "Adding a target hotkey or starting dissolution directly violates the Dendrite Standard. NNS is expected to reject making a known neuron private.");
  const configureKind = choice([["IncreaseDissolveDelay","Increase dissolve delay"],["SetDissolveTimestamp","Set dissolve timestamp"],["StartDissolving","Start dissolving"],["StopDissolving","Stop dissolving"],["AddHotKey","Add target hotkey"],["RemoveHotKey","Remove target hotkey"],["JoinCommunityFund","Join community fund"],["LeaveCommunityFund","Leave community fund"],["ChangeAutoStakeMaturity","Change auto-stake maturity"],["SetVisibility","Set visibility"]]);
  const configureValue = field("configure-value", "Seconds, principal, true/false, or visibility code");
  configure.append(configureKind, configureValue, button("Review Configure", run(async () => {
    const kind = configureKind.value; const value = configureValue.value; let fields = { configureKind: kind };
    switch (kind) {
      case "IncreaseDissolveDelay": fields.seconds = Number(value); break;
      case "SetDissolveTimestamp": fields.timestampSeconds = BigInt(value); break;
      case "AddHotKey": case "RemoveHotKey": fields.principal = Principal.fromText(value).toText(); break;
      case "ChangeAutoStakeMaturity": if (value !== "true" && value !== "false") throw new Error("Enter true or false."); fields.enabled = value === "true"; break;
      case "SetVisibility": fields.visibility = Number(value); break;
      default: break;
    }
    await review(buildAdvancedCommand("Configure", fields), `Configure: ${kind}`, ["StartDissolving","AddHotKey","SetVisibility"].includes(kind));
  })));

  const spawn = box("Spawn", "May create a new neuron and move maturity.");
  const spawnPercent = field("spawn-percent", "Optional percentage 1–100"), spawnController = field("spawn-controller", "Optional new controller principal"), spawnNonce = field("spawn-nonce", "Optional nonce");
  spawn.append(spawnPercent, spawnController, spawnNonce, button("Review Spawn", run(() => review(buildAdvancedCommand("Spawn", { percentage: optionalPercent(spawnPercent.value), newController: spawnController.value || undefined, nonce: optionalNat(spawnNonce.value) }), "Spawn from target maturity", true))));

  const split = box("Split", "Moves stake to a child neuron.");
  const splitAmount = field("split-amount", "Exact ICP amount"), splitMemo = field("split-memo", "Optional memo");
  split.append(splitAmount, splitMemo, button("Review Split", run(() => review(buildAdvancedCommand("Split", { amountE8s: parseIcpToE8s(splitAmount.value), memo: optionalNat(splitMemo.value) }), "Split target stake", true))));

  const claim = box("Claim or refresh cached stake", "Refreshes cached ledger stake and is different from RefreshVotingPower.");
  claim.append(button("Review ClaimOrRefresh", run(() => review(buildAdvancedCommand("ClaimOrRefresh"), "Refresh target cached ledger stake"))));

  const merge = box("Merge", "Source stake, maturity, and age may move into the target; Governance validates controller and state requirements.");
  const mergeSource = field("merge-source", "Source neuron ID");
  merge.append(mergeSource, button("Review Merge", run(() => review(buildAdvancedCommand("Merge", { sourceNeuronId: mergeSource.value }), "Merge source neuron into target", true))));

  const stake = box("Stake maturity", "Omitting percentage uses the NNS default.");
  const stakePercent = field("stake-percent", "Optional percentage 1–100");
  stake.append(stakePercent, button("Review StakeMaturity", run(() => review(buildAdvancedCommand("StakeMaturity", { percentage: optionalPercent(stakePercent.value) }), "Stake target maturity"))));

  const maturity = box("Disburse maturity", "A destination is mandatory because proposal execution uses the blackholed target-controller context.");
  const maturityPercent = field("maturity-percent", "Percentage 1–100"), destinationKind = choice([["icrc","ICRC account"],["legacy","Legacy account identifier"]]), owner = field("maturity-owner", "ICRC owner principal"), destinationBytes = field("maturity-bytes", "Optional subaccount or legacy identifier: 64 hex characters");
  maturity.append(maturityPercent, destinationKind, owner, destinationBytes, button("Review DisburseMaturity", run(() => {
    const fields = { percentage: Number(maturityPercent.value) };
    if (destinationKind.value === "legacy") fields.accountIdentifier = hex32(destinationBytes.value, "Account identifier");
    else fields.account = { owner: Principal.fromText(owner.value).toText(), ...(destinationBytes.value ? { subaccount: hex32(destinationBytes.value, "Subaccount") } : {}) };
    return review(buildAdvancedCommand("DisburseMaturity", fields), "Disburse target maturity", true);
  })));

  const following = box("Set following", "Each explicit row replaces one recognised topic with zero to fifteen unique followees. Candidate restrictions are the same as the single-topic workflow.");
  const rows = document.createElement("div");
  const addRow = () => { const row = document.createElement("div"), topic = field("set-topic", "Topic code"), followees = field("set-followees", "Comma-separated followee IDs; empty clears"); row.append(topic, followees); rows.append(row); };
  addRow();
  following.append(rows, button("Add topic row", addRow), button("Review SetFollowing", run(async () => {
    const values = rows.children.map ? rows.children.map((row) => ({ topic: Number(row.children[0].value), followeeIds: csvIds(row.children[1].value) })) : Array.from(rows.children, (row) => ({ topic: Number(row.children[0].value), followeeIds: csvIds(row.children[1].value) }));
    const managerIds = values.filter((row) => row.topic === 1).flatMap((row) => row.followeeIds).map(BigInt);
    let knownCandidates = [];
    if (managerIds.length) {
      const response = await context.nnsActor.list_neurons({ neuron_ids: managerIds, include_neurons_readable_by_caller: false, include_empty_neurons_readable_by_caller: [], include_public_neurons_in_full_neurons: [true], page_number: [], page_size: [], neuron_subaccounts: [] });
      knownCandidates = response.full_neurons.map((neuron) => ({ id: neuron.id?.[0]?.id, known: Boolean(neuron.known_neuron_data?.length) }));
    }
    return review(buildStandardSetFollowingCommand(context.report, values, knownCandidates), "Replace multiple topic followee lists", true);
  })));

  const unavailable = box("Recognised but unavailable", "Nested MakeProposal is rejected through a Neuron Management proposal; MergeMaturity was removed upstream; Disburse and DisburseToNeuron are rejected for a compliant not-for-profit=false target.");
  section.append(configure, spawn, split, claim, merge, stake, maturity, following, unavailable);
  root.append(section);
}
