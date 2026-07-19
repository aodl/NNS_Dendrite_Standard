import { clear, element, safeHttpsLink } from "./dom.js";

export const variantName = (value) => Object.keys(value ?? {})[0] ?? "Unknown";

export function errorMessage(error) {
  const kind = variantName(error);
  const value = error?.[kind];
  if (kind === "GlobalRateLimit") return `Too many live checks; try again in ${value.retry_after_seconds} seconds.`;
  if (kind === "LowCycles") return "Live checking is temporarily disabled to preserve canister cycles.";
  if (kind === "DuplicateInFlight") return "A live check for this neuron is already running.";
  if (kind === "ConcurrencyLimit") return "The verifier is currently at its live-check concurrency limit.";
  return typeof value === "string" ? value : kind;
}

const optional = (value, fallback = "Unavailable") => value?.[0] ?? fallback;
const ids = (values) => values.map(String).join(", ") || "None";
const row = (label, value) => {
  const tr = document.createElement("tr");
  tr.append(element("th", label), element("td", value));
  return tr;
};
const table = (caption, rows) => {
  const node = document.createElement("table");
  node.append(element("caption", caption), ...rows);
  return node;
};

function renderKnownNeuron(root, known) {
  if (!known) return;
  root.append(row("Known-neuron name", known.name));
  root.append(row("Known-neuron description", optional(known.description, "None")));
  for (const url of known.links) {
    const tr = document.createElement("tr"), cell = document.createElement("td");
    tr.append(element("th", "Known-neuron link"), cell);
    try { cell.append(safeHttpsLink(url, url)); } catch { cell.textContent = "Rejected unsafe URL"; }
    root.append(tr);
  }
}

export function renderReport(root, report) {
  clear(root);
  const status = variantName(report.overall_status);
  root.append(
    element("h1", `Neuron ${report.neuron_id}`),
    element("p", `${status} — live consensus result`, `status status-${status.toLowerCase()}`),
    table("Verification", [
      row("Standard", report.standard_version),
      row("Source revision", report.source_revision),
      row("Checked at (Unix seconds)", report.checked_at_timestamp_seconds),
      row("Quorum", optional(report.quorum_threshold)),
    ]),
  );
  const target = report.target?.[0];
  if (target) {
    const body = document.createElement("tbody");
    renderKnownNeuron(body, target.known_neuron?.[0]);
    for (const [label, value] of [
      ["Controller", optional(target.controller)?.toText?.() ?? optional(target.controller)],
      ["Hotkeys", ids(target.hot_keys)],
      ["not_for_profit", optional(target.not_for_profit)],
      ["Dissolving", optional(target.dissolving)],
      ["Dissolve delay (seconds)", optional(target.dissolve_delay_seconds)],
      ["Effective stake (e8s)", optional(target.effective_stake_e8s)],
      ["Voting-power refresh timestamp", optional(target.voting_power_refreshed_timestamp_seconds)],
      ["Potential voting power", optional(target.potential_voting_power)],
      ["Deciding voting power", optional(target.deciding_voting_power)],
    ]) body.append(row(label, value));
    const targetTable = document.createElement("table");
    targetTable.append(element("caption", "Target evidence"), body);
    root.append(targetTable);
  }
  root.append(table("Managers", report.managers.map((manager) =>
    row(String(manager.neuron_id), manager.known_neuron?.[0]?.name ?? "Not returned as a known neuron"))));
  root.append(table("Committed topics", report.committed_topics.map((topic) =>
    row(String(topic.topic), ids(topic.delegate_ids)))));
  root.append(table("Non-committed topic checks", report.non_committed_topics.map((topic) =>
    row(String(topic.topic), ids(topic.followee_ids)))));
  const rules = document.createElement("table");
  rules.append(element("caption", "Standard rule results"));
  const head = document.createElement("tr");
  for (const name of ["Rule", "Status", "Message", "Observed", "Expected", "Topic", "Related neurons"]) head.append(element("th", name));
  rules.append(head);
  for (const rule of report.rules) {
    const tr = document.createElement("tr");
    for (const value of [rule.rule_id, variantName(rule.status), rule.message, optional(rule.observed, "—"), optional(rule.expected, "—"), optional(rule.relevant_topic, "—"), ids(rule.related_neuron_ids)]) tr.append(element("td", value));
    rules.append(tr);
  }
  root.append(rules);
  if (report.source_failures.length) {
    root.append(element("h2", "Source failures"));
    const list = document.createElement("ul");
    for (const failure of report.source_failures) list.append(element("li", `${failure.method} / ${variantName(failure.kind)}: ${failure.message}`));
    root.append(list);
  }
}
