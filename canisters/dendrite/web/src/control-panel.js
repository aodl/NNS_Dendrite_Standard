import { element, safeHttpsLink } from "./dom.js";
import { classifyManagerAuthority } from "./authority.js";
import { parseNeuronId } from "./ids.js";
import { buildPrimaryFollowCommand, buildRefreshVotingPowerCommand, buildRegisterVoteCommand, createTransactionPipeline, formatE8s } from "./transaction.js";

const input = (name, placeholder = "") => {
  const node = document.createElement("input"); node.name = name; node.placeholder = placeholder; return node;
};
const option = (value, label) => { const node = document.createElement("option"); node.value = value; node.textContent = label; return node; };
const ids = (value) => String(value).split(",").map((entry) => entry.trim()).filter(Boolean).map(parseNeuronId);

function managerSelect(report, principal) {
  const select = document.createElement("select");
  for (const manager of report.managers) {
    if (!classifyManagerAuthority(manager, principal).eligible) continue;
    select.append(option(manager.neuron_id.toString(), `${manager.neuron_id} — ${manager.known_neuron?.[0]?.name ?? "unknown"}`));
  }
  return select;
}

function reviewNode(pipeline, review, onSuccess) {
  const root = document.createElement("section"); root.className = "transaction-review";
  root.append(
    element("h3", "Exact NNS request review"),
    element("p", `Operation: ${review.operation}`),
    element("p", `Target: ${review.targetId}; proposer/manager: ${review.managerId}`),
  );
  if (review.kind === "SubmitManageNeuronProposal") root.append(
    element("p", `Current proposal fee: ${review.reviewedFeeE8s} e8s (${formatE8s(review.reviewedFeeE8s)} ICP). Manager minted stake: ${review.mintedStakeE8s} e8s.`),
    element("p", `Current distinct managers: ${review.managerCount}; quorum: ${review.quorum ?? "unavailable"}. The proposer automatically votes Yes; each distinct target manager has one vote.`),
    element("p", "No NNS simulation was performed: the pinned NNS does not support simulation for this request type."),
  );
  const confirmation = input("confirmation"); confirmation.type = "checkbox";
  const label = document.createElement("label"); label.append(confirmation, document.createTextNode(" I have reviewed this exact request"));
  root.append(label);
  let typed;
  if (review.highRisk) { typed = input("target-confirmation", "Type target neuron ID"); root.append(typed); }
  const submit = element("button", "Submit exact reviewed request"); submit.type = "button";
  submit.addEventListener("click", async () => {
    submit.disabled = true;
    try {
      const result = await pipeline.submit(review, { confirmed: confirmation.checked === true, typedTarget: typed?.value ?? "" });
      root.replaceChildren(element("p", result.proposalId ? `Proposal ${result.proposalId} submitted.` : `${result.operation} succeeded.`, "status"));
      if (result.proposalId) root.append(safeHttpsLink("View proposal", `https://dashboard.internetcomputer.org/proposal/${result.proposalId}`));
      await onSuccess();
    } catch (error) { root.append(element("p", String(error?.message ?? "Transaction outcome is unknown.").slice(0, 512), "error")); }
    finally { submit.disabled = false; }
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
  const showReview = (review) => output.replaceChildren(reviewNode(pipeline, review, onSuccess));
  const fail = (error) => output.replaceChildren(element("p", String(error?.message ?? error).slice(0, 512), "error"));

  const follow = document.createElement("fieldset");
  follow.append(element("legend", "1. Replace one topic’s entire followee list"));
  const topic = input("topic", "Topic code"), followees = input("followees", "Comma-separated neuron IDs"), followReview = element("button", "Review following replacement");
  followReview.type = "button";
  followReview.addEventListener("click", async () => { try {
    const code = Number(topic.value), selected = ids(followees.value); let candidates = [];
    if (code === 1) {
      const response = await nnsActor.list_neurons({ neuron_ids: selected, include_neurons_readable_by_caller: false, include_empty_neurons_readable_by_caller: [], include_public_neurons_in_full_neurons: [true], page_number: [], page_size: [], neuron_subaccounts: [] });
      candidates = response.full_neurons.map((neuron) => ({ id: neuron.id?.[0]?.id, known: Boolean(neuron.known_neuron_data?.length) }));
    }
    const command = buildPrimaryFollowCommand(report, code, selected, candidates);
    showReview(await pipeline.reviewProposal({ targetId: report.neuron_id, managerId: parseNeuronId(managers.value), innerCommand: command, operation: `Replace all followees for topic ${code}` }));
  } catch (error) { fail(error); } });
  follow.append(topic, followees, element("p", "Follow replaces the complete list for this topic; an empty list removes the entry."), followReview);

  const refresh = document.createElement("fieldset"); refresh.append(element("legend", "2. Refresh target voting power"));
  const refreshReview = element("button", "Review voting-power refresh"); refreshReview.type = "button";
  refreshReview.addEventListener("click", async () => { try { showReview(await pipeline.reviewProposal({ targetId: report.neuron_id, managerId: parseNeuronId(managers.value), innerCommand: buildRefreshVotingPowerCommand(), operation: "Refresh target voting power" })); } catch (error) { fail(error); } });
  refresh.append(element("p", `NNS snapshot: ${report.checked_at_timestamp_seconds}; target refresh: ${report.target?.[0]?.voting_power_refreshed_timestamp_seconds?.[0] ?? "unavailable"}; threshold: 15778800 seconds. Adoption and execution are not guaranteed.`), refreshReview);

  const vote = document.createElement("fieldset"); vote.append(element("legend", "3. Register a target vote"));
  const proposal = input("proposal", "Proposal ID"), choice = document.createElement("select"); choice.append(option("1", "Yes"), option("2", "No"));
  const voteReview = element("button", "Review target vote"); voteReview.type = "button";
  voteReview.addEventListener("click", async () => { try { const proposalId = parseNeuronId(proposal.value); const info = (await nnsActor.get_proposal_info(proposalId))?.[0]; const command = buildRegisterVoteCommand(info, Number(choice.value), BigInt(Math.floor(Date.now() / 1000))); showReview(await pipeline.reviewProposal({ targetId: report.neuron_id, managerId: parseNeuronId(managers.value), innerCommand: command, operation: `Vote ${choice.value === "1" ? "Yes" : "No"} on proposal ${proposalId}` })); } catch (error) { fail(error); } });
  vote.append(proposal, choice, voteReview);
  panel.append(follow, refresh, vote, output); root.append(panel);
}
