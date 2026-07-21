import { clear, element, safeHttpsLink } from "./dom.js";

export const variantName = (value) => Object.keys(value ?? {})[0] ?? "Unknown";

export function errorMessage(error) {
  const generic = "Live check failed.";
  if (error instanceof Error) {
    const message = error.message.trim().slice(0, 512);
    return message || generic;
  }
  try {
    const kind = variantName(error);
    const value = error?.[kind];
    if (kind === "GlobalRateLimit") return `Too many live checks; try again in ${value.retry_after_seconds} seconds.`;
    if (kind === "LowCycles") return "Live checking is temporarily disabled to preserve canister cycles.";
    if (kind === "DuplicateInFlight") return "A live check for this neuron is already running.";
    if (kind === "ConcurrencyLimit") return "The verifier is currently at its live-check concurrency limit.";
    if (typeof value === "string") return value;
    return kind === "Unknown" ? generic : kind;
  } catch {
    return generic;
  }
}

const optional = (value, fallback = "Unavailable") => value?.[0] ?? fallback;
const ids = (values) => values.map(String).join(", ") || "None";
export const TOPIC_LABELS = new Map([
  [0, "CatchAll"], [1, "Neuron Management"], [2, "Exchange Rate"],
  [3, "Network Economics"], [4, "Governance"], [5, "Node Admin"],
  [6, "Participant Management"], [7, "Subnet Management"],
  [8, "Application Canister Management"], [9, "KYC"],
  [10, "Node Provider Rewards"], [12, "IC OS Version Deployment"],
  [13, "IC OS Version Election"], [14, "SNS and Community Fund"],
  [15, "API Boundary Node Management"], [16, "Subnet Rental"],
  [17, "Protocol Canister Management"], [18, "Service Nervous System Management"],
]);
export const topicLabel = (code) => `${code} — ${TOPIC_LABELS.get(code) ?? "Unknown topic"}`;
const principalText = (principal) => principal?.toText?.() ?? String(principal);
const checkedAtUtc = (seconds) => new Date(Number(seconds) * 1000).toISOString();
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
      row("Checked at (UTC)", checkedAtUtc(report.checked_at_timestamp_seconds)),
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
  const controller = report.controller?.[0];
  if (controller) {
    const moduleHash = controller.call_succeeded
      ? (controller.module_hash?.[0] ? "Present" : "Absent")
      : "Unavailable";
    const returnedControllers = controller.call_succeeded
      ? (controller.controllers.map(principalText).join(", ") || "None")
      : "Unavailable";
    root.append(table("Controller blackhole evidence", [
      row("Controller principal", controller.principal?.[0] ? principalText(controller.principal[0]) : "Unavailable"),
      row("canister_info succeeded", controller.call_succeeded),
      row("Module hash", moduleHash),
      row("Returned controllers", returnedControllers),
    ]));
  }
  root.append(table("Managers", report.managers.map((manager) => row(
    String(manager.neuron_id),
    `${variantName(manager.evidence_status)} · ${manager.known_neuron?.[0]?.name ?? "No known-neuron metadata"} · controller ${manager.controller?.[0] ? principalText(manager.controller[0]) : "none"} · hotkeys ${ids(manager.hot_keys)}`,
  ))));
  root.append(table("Committed topics", report.committed_topics.map((topic) =>
    row(topicLabel(topic.topic), ids(topic.delegate_ids)))));
  root.append(table("Non-committed topic checks", report.non_committed_topics.map((topic) =>
    row(topicLabel(topic.topic), ids(topic.followee_ids)))));
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
    for (const failure of report.source_failures) list.append(element("li", `${failure.method} / ${variantName(failure.kind)} / neurons ${ids(failure.affected_neuron_ids)}: ${failure.message}`));
    root.append(list);
  }
}
