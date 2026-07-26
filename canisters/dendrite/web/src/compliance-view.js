import { clear, element, safeHttpsLink } from "./dom.js";

export const variantName = (value) => Object.keys(value ?? {})[0] ?? "Unknown";
const optional = (value, fallback = "Unavailable") => value?.[0] ?? fallback;
const principalText = (principal) => principal?.toText?.() ?? String(principal);
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

export const RULE_TITLES = Object.freeze({
  "DENDRITE-KNOWN-001": "Target neuron is public",
  "DENDRITE-KNOWN-002": "Target is a known neuron",
  "DENDRITE-KNOWN-003": "Committed topics exist",
  "DENDRITE-KNOWN-004": "Committed topics are valid",
  "DENDRITE-LOCK-001": "Target is not dissolving",
  "DENDRITE-LOCK-002": "Maximum dissolve delay",
  "DENDRITE-LOCK-003": "Positive effective stake",
  "DENDRITE-ACTIVE-001": "Voting power is fresh",
  "DENDRITE-ACTIVE-002": "Voting power is fully effective",
  "DENDRITE-CONTROL-001": "Controller canister is inspectable",
  "DENDRITE-CONTROL-002": "Controller canister has no Wasm",
  "DENDRITE-CONTROL-003": "Controller canister has no controllers",
  "DENDRITE-CONTROL-004": "Target has no hotkeys",
  "DENDRITE-CONTROL-005": "Not-for-profit is disabled",
  "DENDRITE-NM-001": "Manager count is valid",
  "DENDRITE-NM-002": "Managers are distinct",
  "DENDRITE-NM-003": "Target does not manage itself",
  "DENDRITE-NM-004": "Managers are known neurons",
  "DENDRITE-NM-005": "Voting anchors are known",
  "DENDRITE-COMMIT-001": "Committed topic has enough delegates",
  "DENDRITE-COMMIT-002": "Committed delegates are distinct",
  "DENDRITE-COMMIT-003": "Committed delegates are managers",
  "DENDRITE-COMMIT-004": "Delegates follow omega-reject",
  "DENDRITE-DEFAULT-001": "Uncommitted topic follows alpha-vote",
  "DENDRITE-DEFAULT-002": "CatchAll follows alpha-vote",
  "DENDRITE-DEFAULT-003": "Following topics are recognised",
  "DENDRITE-DATA-001": "Required evidence is complete",
  "DENDRITE-DATA-002": "Evidence provenance is complete",
  "DENDRITE-DATA-003": "Unavailable evidence is fail-closed",
});
export const ruleTitle = (id) => RULE_TITLES[id] ?? `Technical check: ${id}`;

export function errorMessage(error) {
  const generic = "Live check failed.";
  if (error instanceof Error) return error.message.trim().slice(0, 512) || generic;
  try {
    const kind = variantName(error), value = error?.[kind];
    if (kind === "GlobalRateLimit") return `Too many consensus checks; try again in ${value.retry_after_seconds} seconds.`;
    if (kind === "LowCycles") return "Preliminary analysis remains available. Consensus verification is temporarily unavailable because the verifier is preserving its cycle reserve.";
    if (kind === "DuplicateInFlight") return "A consensus check for this neuron is already running.";
    if (kind === "ConcurrencyLimit") return "The verifier is currently at its consensus-check concurrency limit.";
    if (typeof value === "string") return value.slice(0, 512);
    return kind === "Unknown" ? generic : kind;
  } catch {
    return generic;
  }
}

export const shortPrincipal = (principal) => {
  const value = principalText(principal);
  return value.length <= 17 ? value : `${value.slice(0, 7)}…${value.slice(-7)}`;
};
const checkedAtUtc = (seconds) => BigInt(seconds) > 0n ? new Date(Number(seconds) * 1000).toISOString() : "Unavailable";
const formatDuration = (seconds) => {
  if (seconds === "Unavailable") return seconds;
  const value = BigInt(seconds);
  const years = Number(value) / 31_557_600;
  return years >= 1 ? `${years.toFixed(2)} years` : `${(Number(value) / 86_400).toFixed(1)} days`;
};
const formatIcp = (e8s) => {
  if (e8s === "Unavailable") return e8s;
  const value = BigInt(e8s), whole = value / 100_000_000n, fraction = (value % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} ICP`;
};

function badge(text, kind) {
  return element("span", text, `badge badge-${kind}`);
}
function copyButton(value, label, copyText) {
  const button = element("button", label, "copy-button");
  button.type = "button";
  button.title = String(value);
  button.setAttribute("aria-label", `Copy ${value}`);
  button.addEventListener("click", () => copyText?.(String(value)));
  return button;
}
function metric(label, value, hint) {
  const node = document.createElement("div");
  node.className = "metric-card";
  const description = document.createElement("dd");
  if (value?.tagName || value?.tag) description.append(value);
  else description.textContent = String(value);
  node.append(element("dt", label), description);
  if (hint) node.append(element("p", hint, "muted"));
  return node;
}
function details(summary, children, className = "") {
  const node = document.createElement("details");
  node.className = className;
  node.append(element("summary", summary), ...children);
  return node;
}
function technicalTable(report) {
  const table = document.createElement("table");
  table.append(element("caption", "Complete rule table"));
  const head = document.createElement("tr");
  for (const name of ["Rule", "Status", "Message", "Observed", "Expected", "Topic", "Related neurons"]) head.append(element("th", name));
  table.append(head);
  for (const rule of report.rules) {
    const row = document.createElement("tr");
    for (const value of [rule.rule_id, variantName(rule.status), rule.message, optional(rule.observed, "—"), optional(rule.expected, "—"), optional(rule.relevant_topic, "—"), ids(rule.related_neuron_ids)]) row.append(element("td", value));
    table.append(row);
  }
  return table;
}
function safeJson(value) {
  return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : typeof item?.toText === "function" ? item.toText() : item, 2);
}
const severity = Object.freeze({ Fail: 0, StandardUpdateRequired: 1, Indeterminate: 2, Warning: 3, Pass: 4 });

export function sortedFindings(rules) {
  return [...rules].filter((rule) => variantName(rule.status) !== "Pass")
    .sort((left, right) => (severity[variantName(left.status)] ?? 9) - (severity[variantName(right.status)] ?? 9));
}

function renderFinding(rule) {
  const status = variantName(rule.status);
  const card = document.createElement("article");
  card.className = `finding finding-${status.toLowerCase()}`;
  card.append(element("h3", ruleTitle(rule.rule_id)), badge(status, status.toLowerCase()), element("p", rule.message));
  const facts = document.createElement("dl");
  if (rule.observed?.length) facts.append(metric("Observed", rule.observed[0]));
  if (rule.expected?.length) facts.append(metric("Expected", rule.expected[0]));
  if (rule.relevant_topic?.length) facts.append(metric("Topic", topicLabel(rule.relevant_topic[0])));
  if (rule.related_neuron_ids.length) {
    const links = document.createElement("div");
    links.className = "related-neurons";
    for (const id of rule.related_neuron_ids) links.append(safeHttpsLink(String(id), `https://dashboard.internetcomputer.org/neuron/${id}`));
    facts.append(metric("Related neurons", links));
  }
  if (facts.children.length) card.append(facts);
  card.append(details("Technical rule", [element("code", rule.rule_id)]));
  return card;
}

function renderManagers(report, copyText) {
  const section = document.createElement("section");
  section.className = "manager-grid";
  for (const manager of report.managers) {
    const card = document.createElement("article");
    card.className = "manager-card";
    const id = manager.neuron_id.toString();
    card.append(
      element("h3", manager.known_neuron?.[0]?.name ?? `Manager ${id}`),
      safeHttpsLink(id, `https://dashboard.internetcomputer.org/neuron/${id}`),
      badge(variantName(manager.evidence_status), variantName(manager.evidence_status).toLowerCase()),
    );
    const controller = manager.controller?.[0];
    const facts = document.createElement("dl");
    facts.append(metric("Controller", controller ? shortPrincipal(controller) : "Unavailable"));
    if (controller) card.append(copyButton(principalText(controller), "Copy controller", copyText));
    facts.append(metric("Hotkeys", manager.hot_keys.length ? manager.hot_keys.map(shortPrincipal).join(" · ") : "None"));
    facts.append(metric("Management followees", ids(manager.neuron_management_followees ?? [])));
    facts.append(metric("Omega-ready topics", manager.omega_ready_topics?.length ? manager.omega_ready_topics.map((topic) => TOPIC_LABELS.get(topic) ?? topic).join(" · ") : "None"));
    card.append(facts);
    section.append(card);
  }
  return section;
}

export function groupTopics(report) {
  const groups = new Map();
  const add = (kind, topic, values) => {
    const key = `${kind}:${values.map(String).join(",")}`;
    const group = groups.get(key) ?? { kind, values, topics: [] };
    group.topics.push(topic);
    groups.set(key, group);
  };
  for (const topic of report.committed_topics) add("Delegates", topic.topic, topic.delegate_ids);
  for (const topic of report.non_committed_topics) add("Followees", topic.topic, topic.followee_ids);
  return [...groups.values()];
}
function renderTopics(report) {
  const list = document.createElement("div");
  list.className = "topic-groups";
  for (const group of groupTopics(report)) {
    const card = document.createElement("article");
    card.className = "topic-group";
    card.append(element("h3", `${group.kind}: ${ids(group.values)}`), element("p", `${group.topics.length} topic${group.topics.length === 1 ? "" : "s"}`));
    const labels = document.createElement("ul");
    for (const topic of group.topics) labels.append(element("li", topicLabel(topic)));
    card.append(labels, details(`${group.kind} path`, [element("p", ids(group.values))]));
    list.append(card);
  }
  return list;
}

function preliminaryStatus(report) {
  const statuses = new Set(report.rules.map((rule) => variantName(rule.status)));
  if (statuses.has("Fail")) return "Preliminary issues found";
  if (statuses.has("StandardUpdateRequired") || statuses.has("Indeterminate")) return "Preliminary analysis incomplete";
  return "No public-configuration blockers found";
}

export function renderReport(root, viewModel, options = {}) {
  clear(root);
  const { report, verificationKind, stale = false, error } = viewModel.report ? viewModel : {
    report: viewModel,
    verificationKind: "Consensus",
    stale: false,
  };
  const target = report.target?.[0], known = target?.known_neuron?.[0];
  const header = document.createElement("header");
  header.className = "report-header";
  const title = document.createElement("div");
  title.append(element("p", "NNS Dendrite analysis", "eyebrow"), element("h1", known?.name ?? `Neuron ${report.neuron_id}`), element("p", `Neuron ${report.neuron_id}`, "muted"));
  const state = document.createElement("div");
  const verificationText = stale ? "Verification stale" : verificationKind === "Consensus" ? "Consensus verified" : error ? "Consensus unavailable" : "Preliminary";
  state.append(badge(verificationText, stale ? "stale" : verificationKind.toLowerCase()));
  if (verificationKind === "Consensus") state.append(element("span", "live consensus result", "muted"));
  if (verificationKind === "Consensus") state.append(element("p", checkedAtUtc(report.checked_at_timestamp_seconds), "muted"));
  header.append(title, state, copyButton(report.neuron_id, "Copy neuron ID", options.copyText));
  const actions = document.createElement("div");
  actions.className = "report-actions";
  if (options.onRefreshPreliminary) {
    const refresh = element("button", options.preliminaryLoading ? "Refreshing public evidence…" : "Refresh preliminary");
    refresh.type = "button"; refresh.disabled = Boolean(options.preliminaryLoading); refresh.addEventListener("click", options.onRefreshPreliminary); actions.append(refresh);
  }
  if (options.onVerifyConsensus) {
    const verify = element("button", options.consensusLoading ? "Verifying on-chain…" : "Verify on-chain", "secondary");
    verify.type = "button"; verify.disabled = Boolean(options.consensusLoading); verify.addEventListener("click", options.onVerifyConsensus); actions.append(verify);
  }
  header.append(actions);
  if (known?.links?.length) {
    const links = document.createElement("div");
    links.className = "known-links";
    for (const url of known.links) {
      try { links.append(safeHttpsLink(url, url)); }
      catch { links.append(element("span", "Rejected unsafe URL")); }
    }
    header.append(links);
  }
  root.append(header);
  if (error) root.append(element("p", error, "verification-warning"));
  const exactStatus = variantName(report.overall_status);
  root.append(element("h2", verificationKind === "Consensus" ? exactStatus : preliminaryStatus(report), `main-status status-${exactStatus.toLowerCase()}`));
  if (verificationKind === "Preliminary") root.append(element("p", "Controller blackhole evidence requires consensus verification and is never inferred from browser-only data.", "muted"));

  const metrics = document.createElement("dl");
  metrics.className = "metrics";
  const controller = report.controller?.[0];
  metrics.append(
    metric("Managers", `${report.managers.length}`, report.quorum_threshold?.length ? `Quorum ${report.quorum_threshold[0]}` : "Quorum unavailable"),
    metric("Dissolve delay", formatDuration(optional(target?.dissolve_delay_seconds)), target?.dissolving?.length ? (target.dissolving[0] ? "Dissolving" : "Locked") : "State unavailable"),
    metric("Effective stake", formatIcp(optional(target?.effective_stake_e8s))),
    metric("Hotkeys", target ? String(target.hot_keys.length) : "Unavailable"),
    metric("not_for_profit", String(optional(target?.not_for_profit))),
    metric("Committed topics", String(report.committed_topics.length)),
    metric("Voting-power freshness", target?.voting_power_refreshed_timestamp_seconds?.length ? checkedAtUtc(target.voting_power_refreshed_timestamp_seconds[0]) : "Unavailable"),
    metric("Controller blackhole", controller?.call_succeeded ? (!controller.module_hash.length && !controller.controllers.length ? "Confirmed" : "Not confirmed") : "Requires on-chain verification"),
    metric("Verification level", verificationKind === "Consensus" ? "Consensus verified" : "Preliminary"),
  );
  root.append(metrics);

  const findings = sortedFindings(report.rules);
  root.append(element("h2", findings.length ? "Needs attention" : "No findings requiring attention"));
  const attention = document.createElement("section");
  attention.className = "attention";
  for (const finding of findings) attention.append(renderFinding(finding));
  root.append(attention);
  const passed = report.rules.filter((rule) => variantName(rule.status) === "Pass");
  root.append(details(`Passed checks (${passed.length})`, passed.map((item) => element("p", `${ruleTitle(item.rule_id)} — ${item.message}`)), "passed-checks"));

  root.append(element("h2", "Managers"), renderManagers(report, options.copyText));
  root.append(element("h2", "Topic configurations"), renderTopics(report));

  const metadata = [
    element("p", `Standard: ${report.standard_version}`),
    element("p", `Pinned source: ${report.source_revision}`),
    element("p", `Evidence timestamp: ${report.checked_at_timestamp_seconds}`),
    element("p", `Overall status: ${exactStatus}`),
  ];
  const controllerTechnical = controller ? [
    element("p", `Controller principal: ${controller.principal?.[0] ? principalText(controller.principal[0]) : "Unavailable"}`),
    element("p", `canister_info: ${controller.call_succeeded ? "Succeeded" : "Unavailable"}`),
    element("p", `Module hash: ${controller.call_succeeded ? (controller.module_hash?.length ? "Present" : "Absent") : "Unavailable"}`),
    element("p", `Returned controllers: ${controller.call_succeeded ? (controller.controllers.map(principalText).join(", ") || "None") : "Unavailable"}`),
  ] : [element("p", "Unavailable")];
  const technical = document.createElement("section");
  technical.className = "technical-evidence";
  technical.append(
    element("h2", "Technical evidence"),
    details("Verification metadata", metadata),
    details("Raw target evidence", [element("pre", safeJson(target ?? null))]),
    details("Controller blackhole evidence", [...controllerTechnical, element("pre", safeJson(controller ?? null))]),
    details("Complete rule table", [technicalTable(report)]),
    details(`Source failures (${report.source_failures.length})`, [element("pre", safeJson(report.source_failures))]),
    details("Raw report", [element("pre", safeJson(report))]),
  );
  root.append(technical);
}
