const COMMANDS = new Set(["Configure","Disburse","Spawn","Follow","ClaimOrRefresh","RegisterVote","Merge","DisburseToNeuron","MakeProposal","StakeMaturity","MergeMaturity","RefreshVotingPower","DisburseMaturity","SetFollowing","Split"]);
const DISABLED = new Map([["MakeProposal", "Nested MakeProposal is rejected"], ["MergeMaturity", "Removed protocol command"], ["Disburse", "Unavailable while not_for_profit is false"], ["DisburseToNeuron", "Unavailable while not_for_profit is false"]]);
export function quorum(managerCount) { if (!Number.isInteger(managerCount) || managerCount < 0 || managerCount > 15) throw new TypeError("Invalid manager count"); return Math.floor(managerCount / 2) + 1; }
export function commandAvailability(name, notForProfit = false) { if (!COMMANDS.has(name)) return { enabled: false, reason: "Unsupported future command" }; if ((name === "Disburse" || name === "DisburseToNeuron") && notForProfit) return { enabled: true }; return DISABLED.has(name) ? { enabled: false, reason: DISABLED.get(name) } : { enabled: true }; }
export function buildNeuronManagementProposal({ proposerId, targetId, title, summary, command }) {
  if (!COMMANDS.has(command.kind)) throw new TypeError("Unsupported future command");
  return { id: [{ id: BigInt(proposerId) }], command: [{ MakeProposal: { title: [title], summary, url: "", action: [{ ManageNeuron: { id: [{ id: BigInt(targetId) }], command: [{ [command.kind]: command.value ?? {} }] } }] } }] };
}
export function projectedFollowing({ targetId, topic, followees, managers, committed }) {
  const ids = followees.map(BigInt); const unique = new Set(ids.map(String));
  if (unique.size !== ids.length) throw new TypeError("Followees must be distinct");
  if (topic === 1 && (ids.length < 5 || ids.length > 15 || ids.includes(BigInt(targetId)))) throw new TypeError("Neuron Management requires 5–15 distinct known managers and no self ID");
  if (committed && (ids.length < 3 || ids.some((id) => !managers.map(String).includes(String(id))))) throw new TypeError("Committed topics require at least three current managers");
  return ids;
}
export async function simulateThenSubmit({ actor, request, confirmed }) { const simulation = await actor.simulate_manage_neuron(request); if ("Err" in simulation || !confirmed) return { submitted: false, simulation }; return { submitted: true, response: await actor.manage_neuron(request), simulation }; }

