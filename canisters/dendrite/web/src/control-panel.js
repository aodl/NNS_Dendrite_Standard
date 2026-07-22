import { element, safeHttpsLink } from "./dom.js";
import { classifyManagerAuthority } from "./authority.js";
import { parseNeuronId } from "./ids.js";
import { buildRefreshVotingPowerCommand, classifyRewardReceiver, createTransactionPipeline, filterTargetManageNeuronProposals, formatE8s, managedNeuronId, openManageNeuronProposalRequest, prepareManagerHotkey, prepareManagerVote, preparePrimaryFollow, prepareRewardReceiver, prepareTargetVote, proposalReviewDetails, verifyRewardReceivers } from "./transaction.js";
import { renderAdvancedCommands } from "./advanced-panel.js";
import { TOPIC_LABELS } from "./compliance-view.js";

const input = (name, placeholder = "") => {
  const node = document.createElement("input"); node.name = name; node.placeholder = placeholder; return node;
};
const option = (value, label) => { const node = document.createElement("option"); node.value = value; node.textContent = label; return node; };
const topicSelect = () => { const node = document.createElement("select"); node.name = "topic"; for (const [code, label] of TOPIC_LABELS) node.append(option(String(code), `${code} — ${label}`)); node.value = "1"; return node; };
const ids = (value) => String(value).split(",").map((entry) => entry.trim()).filter(Boolean).map(parseNeuronId);

function managerSelect(report, principal) {
  const select = document.createElement("select");
  for (const manager of report.managers) {
    if (!classifyManagerAuthority(manager, principal).eligible) continue;
    select.append(option(manager.neuron_id.toString(), `${manager.neuron_id} — ${manager.known_neuron?.[0]?.name ?? "unknown"}`));
  }
  return select;
}

export function exactValue(value) {
  return JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") return `nat:${item}`;
    if (item instanceof Uint8Array) return `bytes:0x${[...item].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    if (typeof item?.toText === "function") return `principal:${item.toText()}`;
    return item;
  }, 2);
}

export function directImpact(operation) {
  if (/AddHotKey/.test(operation)) return "Expected direct impact: adding a target hotkey violates the Dendrite no-hotkey rule.";
  if (/StartDissolving/.test(operation)) return "Expected direct impact: starting dissolution violates the Dendrite locked-neuron rule.";
  if (/RemoveHotKey/.test(operation)) return "Expected direct impact: removing a target hotkey may restore no-hotkey compliance; only a fresh report is authoritative.";
  if (/Refresh target voting power/.test(operation)) return "Expected direct impact: execution should update voting-power freshness; adoption and execution are not guaranteed.";
  if (/Follow|following/.test(operation)) return "Expected direct impact: the replacement changes following compliance; only a fresh report is authoritative.";
  return undefined;
}

function reviewNode(pipeline, review, onSuccess, setControlsDisabled = () => {}) {
  const root = document.createElement("section"); root.className = "transaction-review";
  root.append(
    element("h3", "Exact NNS request review"),
    element("p", `Authenticated principal: ${review.principal}`),
    element("p", `Operation: ${review.operation}`),
    element("p", `Target: ${review.targetId} — ${review.targetName}; proposer/manager: ${review.managerId} — ${review.managerName}`),
  );
  for (const detail of review.details) root.append(element("p", detail));
  const impact = directImpact(review.operation); if (impact) root.append(element("p", impact));
  root.append(element("p", `Encoded request SHA-256: ${review.requestDigest}`), element("p", "Exact typed Candid value:"), element("pre", exactValue(review.request)));
  if (review.kind === "SubmitManageNeuronProposal") root.append(
    element("p", `Current proposal fee: ${review.reviewedFeeE8s} e8s (${formatE8s(review.reviewedFeeE8s)} ICP). Manager minted stake: ${review.mintedStakeE8s} e8s.`),
    element("p", `Current distinct managers: ${review.managerCount}; quorum: ${review.quorum ?? "unavailable"}. The proposer automatically votes Yes; each distinct target manager has one vote.`),
    element("p", "The Neuron Management proposal fee is charged on submission and is not reimbursed if the proposal is adopted."),
    element("p", "No NNS simulation was performed: the pinned NNS does not support simulation for this request type."),
  );
  const confirmation = input("confirmation"); confirmation.type = "checkbox";
  const label = document.createElement("label"); label.append(confirmation, document.createTextNode(" I have reviewed this exact request"));
  root.append(label);
  let typed;
  if (review.highRisk) { typed = input("target-confirmation", "Type target neuron ID"); root.append(typed); }
  const submit = element("button", "Submit exact reviewed request"); submit.type = "button";
  submit.addEventListener("click", async () => {
    setControlsDisabled(true); submit.disabled = true;
    try {
      const result = await pipeline.submit(review, { confirmed: confirmation.checked === true, typedTarget: typed?.value ?? "" });
      root.replaceChildren(element("p", result.proposalId ? `Proposal ${result.proposalId} submitted.` : `${result.operation} succeeded.`, "status"));
      if (result.proposalId) root.append(safeHttpsLink("View proposal", `https://dashboard.internetcomputer.org/proposal/${result.proposalId}`));
      await onSuccess();
    } catch (error) {
      root.append(element("p", String(error?.message ?? "Transaction outcome is unknown.").slice(0, 512), "error"));
      if (pipeline.state === "outcome-unknown") root.append(element("p", "Read-only recovery only: reload visible Open proposals, look up a proposal ID, or rerun the live Dendrite report before deliberately creating a new review."));
    } finally { setControlsDisabled(false); submit.disabled = pipeline.state === "outcome-unknown"; }
  });
  root.append(submit);
  return root;
}

export function renderControlPanel(root, { report, session, nnsActor, checkNeuron, onSuccess }) {
  const panel = document.createElement("section"); panel.className = "control-panel";
  panel.append(element("h2", "Manage through NNS Governance"), element("p", "Privileged calls are signed in this browser and sent only to NNS Governance. Dendrite remains anonymous and stores no transaction or proposal history."));
  const managers = managerSelect(report, session.principal);
  if (!managers.children?.length) { panel.append(element("p", "This principal has no authority over a Found target manager.")); root.append(panel); return; }
  panel.append(element("label", "Proposer manager "), managers);
  const output = document.createElement("div");
  const pipeline = createTransactionPipeline({ getSession: async () => session, getNnsActor: async () => nnsActor, checkNeuron });
  const setControlsDisabled = (disabled) => { const visit = (node) => { if (node.tagName === "BUTTON" || node.tag === "button") node.disabled = disabled; for (const child of node.children ?? []) visit(child); }; visit(panel); };
  const showReview = (review) => output.replaceChildren(reviewNode(pipeline, review, onSuccess, setControlsDisabled));
  const fail = (error) => output.replaceChildren(element("p", String(error?.message ?? error).slice(0, 512), "error"));

  const follow = document.createElement("fieldset");
  follow.append(element("legend", "1. Replace one topic’s entire followee list"));
  const topic = topicSelect(), followees = input("followees", "Complete replacement: comma-separated neuron IDs"), fixedFollowing = element("p", ""), followReview = element("button", "Review following replacement");
  const updateFollowInput = () => { const code = Number(topic.value), arbitrary = code === 1 || report.committed_topics?.some((entry) => entry.topic === code); followees.disabled = !arbitrary; fixedFollowing.textContent = arbitrary ? "Enter the complete replacement list." : "Fixed standard-preserving replacement: alpha-vote 2947465672511369."; };
  topic.addEventListener("change", updateFollowInput); updateFollowInput();
  followReview.type = "button";
  followReview.addEventListener("click", async () => { try {
    if (topic.value === "") throw new Error("Select an explicit recognised topic.");
    const code = Number(topic.value), selected = ids(followees.value);
    showReview(await pipeline.reviewProposal({ targetId: report.neuron_id, managerId: parseNeuronId(managers.value), prepare: preparePrimaryFollow(code, selected), operation: `Replace all followees for topic ${code}` }));
  } catch (error) { fail(error); } });
  follow.append(topic, followees, fixedFollowing, element("p", "Follow replaces the complete list for this topic; an empty list removes the entry where permitted."), followReview);

  const refresh = document.createElement("fieldset"); refresh.append(element("legend", "2. Refresh target voting power"));
  const refreshReview = element("button", "Review voting-power refresh"); refreshReview.type = "button";
  refreshReview.addEventListener("click", async () => { try { const target = report.target?.[0]; showReview(await pipeline.reviewProposal({ targetId: report.neuron_id, managerId: parseNeuronId(managers.value), innerCommand: buildRefreshVotingPowerCommand(), operation: "Refresh target voting power",
    details: [`NNS snapshot: ${report.checked_at_timestamp_seconds}; current refresh timestamp: ${target?.voting_power_refreshed_timestamp_seconds?.[0] ?? "unavailable"}; refresh age: ${target?.voting_power_refreshed_timestamp_seconds?.[0] == null ? "unavailable" : report.checked_at_timestamp_seconds - target.voting_power_refreshed_timestamp_seconds[0]} seconds; six-month threshold: 15778800 seconds.`, `Potential voting power: ${target?.potential_voting_power?.[0] ?? "unavailable"}; deciding voting power: ${target?.deciding_voting_power?.[0] ?? "unavailable"}.`] })); } catch (error) { fail(error); } });
  refresh.append(element("p", `NNS snapshot: ${report.checked_at_timestamp_seconds}; target refresh: ${report.target?.[0]?.voting_power_refreshed_timestamp_seconds?.[0] ?? "unavailable"}; threshold: 15778800 seconds. Adoption and execution are not guaranteed.`), refreshReview);

  const vote = document.createElement("fieldset"); vote.append(element("legend", "3. Register a target vote"));
  const proposal = input("proposal", "Proposal ID"), choice = document.createElement("select"); choice.append(option("1", "Yes"), option("2", "No"));
  const voteReview = element("button", "Review target vote"); voteReview.type = "button";
  voteReview.addEventListener("click", async () => { try { const proposalId = parseNeuronId(proposal.value), selectedVote = Number(choice.value); showReview(await pipeline.reviewProposal({ targetId: report.neuron_id, managerId: parseNeuronId(managers.value), prepare: prepareTargetVote(proposalId, selectedVote), operation: `Vote ${selectedVote === 1 ? "Yes" : "No"} on proposal ${proposalId}` })); } catch (error) { fail(error); } });
  vote.append(proposal, choice, voteReview);

  const managerVote = document.createElement("fieldset"); managerVote.append(element("legend", "Vote as a manager on an open target management proposal"));
  const managementProposal = input("management-proposal", "Proposal ID"), managerChoice = document.createElement("select"); managerChoice.append(option("1", "Yes"), option("2", "No"));
  const loadOpen = element("button", "Load bounded open proposals"), managerVoteReview = element("button", "Review manager vote"); loadOpen.type = managerVoteReview.type = "button";
  loadOpen.addEventListener("click", async () => { try { const response = await nnsActor.list_proposals(openManageNeuronProposalRequest()); const matching = filterTargetManageNeuronProposals(response.proposal_info, report.neuron_id); const result = document.createElement("section"); result.append(element("p", matching.length ? "Bounded live Open proposals visible to this caller under Governance's restricted Neuron Management visibility rules (not stored):" : "No matching proposal in the bounded caller-visible live result; use proposal-ID lookup.")); for (const entry of matching) { result.append(element("h4", `Proposal ${entry.id?.[0]?.id ?? "unknown"}`)); for (const detail of proposalReviewDetails(entry, undefined, managedNeuronId(entry))) result.append(element("p", detail)); } output.replaceChildren(result); } catch (error) { fail(error); } });
  managerVoteReview.addEventListener("click", async () => { try {
    const proposalId = parseNeuronId(managementProposal.value), managerId = parseNeuronId(managers.value), selectedVote = Number(managerChoice.value);
    showReview(await pipeline.reviewDirect({ targetId: report.neuron_id, managerId, prepare: prepareManagerVote(proposalId, selectedVote), operation: `Manager vote ${selectedVote === 1 ? "Yes" : "No"} on proposal ${proposalId}` }));
  } catch (error) { fail(error); } });
  managerVote.append(loadOpen, managementProposal, managerChoice, managerVoteReview);

  const readiness = document.createElement("fieldset"); readiness.append(element("legend", "Manager onboarding and reward-receiver readiness"));
  for (const manager of report.managers) { const receiver = classifyRewardReceiver(manager); readiness.append(element("p", `Manager ${manager.neuron_id}: ${receiver.status}${receiver.receiverId ? ` — receiver ${receiver.receiverId}` : ""}${receiver.duplicateConfiguration ? " — duplicate configuration warning" : ""}; hotkeys ${manager.hot_keys.length}/10.`)); }
  const verifyReceivers = element("button", "Verify receiver readiness"); verifyReceivers.type = "button";
  verifyReceivers.addEventListener("click", async () => { try { const results = await verifyRewardReceivers(report.managers, nnsActor); output.replaceChildren(element("p", results.length ? results.map((entry) => `Manager ${entry.managerId}, receiver ${entry.receiverId}: ${entry.status}`).join("; ") : "No single configured receiver IDs require live verification.")); } catch (error) { fail(error); } });
  const newHotkey = input("new-hotkey", "Different Dendrite principal"), hotkeyReview = element("button", "Review controller-only AddHotKey"); hotkeyReview.type = "button";
  newHotkey.value = session.principal.toText();
  hotkeyReview.addEventListener("click", async () => { try { const managerId = parseNeuronId(managers.value), value = newHotkey.value; showReview(await pipeline.reviewDirect({ targetId: report.neuron_id, managerId, prepare: prepareManagerHotkey(value), operation: `Add manager hotkey ${value}`, controllerOnly: true, highRisk: true,
    details: value === session.principal.toText() ? [] : ["Warning: this onboards a different finalized-origin principal than the currently authenticated Dendrite principal."] })); } catch (error) { fail(error); } });
  const receiver = input("receiver", "Reward-receiver neuron ID"), receiverReview = element("button", "Review controller-only reward receiver setup"); receiverReview.type = "button";
  receiverReview.addEventListener("click", async () => { try { const managerId = parseNeuronId(managers.value), receiverId = parseNeuronId(receiver.value); showReview(await pipeline.reviewDirect({ targetId: report.neuron_id, managerId, prepare: prepareRewardReceiver(receiverId), operation: `Set sole Neuron Management reward receiver ${receiverId}`, controllerOnly: true, highRisk: true })); } catch (error) { fail(error); } });
  readiness.append(element("p", "Adding a hotkey is controller-only; an existing hotkey cannot add another. Reward receiver setup gives that receiver sole Neuron Management proposal authority over the known manager neuron."), verifyReceivers, newHotkey, hotkeyReview, receiver, receiverReview);
  panel.append(follow, refresh, vote, managerVote, readiness);
  renderAdvancedCommands(panel, { report, nnsActor, pipeline, managerId: () => parseNeuronId(managers.value), showReview, fail });
  panel.append(output); root.append(panel);
  return () => pipeline.clear();
}
