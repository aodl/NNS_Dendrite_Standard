import { clear, element, safeHttpsLink } from "./dom.js";
import {
  buildRuleDiagnostic,
  formatStatusSummary,
  summarizeRuleStatuses,
} from "./rule-diagnostics.js";

export const variantName = (value) => Object.keys(value ?? {})[0] ?? "Unknown";
const optional = (value, fallback = "Unavailable") => value?.[0] ?? fallback;
const principalText = (principal) => principal?.toText?.() ?? String(principal);
const ids = (values) => values.map(String).join(", ") || "None";
const attribute = (node, name) => node.getAttribute?.(name) ?? node.attributes?.[name] ?? null;

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
export const RULE_DESCRIPTIONS = Object.freeze({
  "DENDRITE-KNOWN-001": "The target must be returned as a full public neuron.",
  "DENDRITE-KNOWN-002": "The target must contain valid known-neuron metadata.",
  "DENDRITE-KNOWN-003": "The target must commit to at least one concrete topic.",
  "DENDRITE-KNOWN-004": "Committed topics must be distinct, recognised concrete topics.",
  "DENDRITE-LOCK-001": "The target must remain locked and not be dissolving.",
  "DENDRITE-LOCK-002": "The dissolve delay must equal the standard maximum.",
  "DENDRITE-LOCK-003": "The target must have positive effective stake.",
  "DENDRITE-ACTIVE-001": "Voting power must have been refreshed within six nominal months.",
  "DENDRITE-ACTIVE-002": "Positive deciding voting power must equal potential voting power.",
  "DENDRITE-CONTROL-001": "The target controller must be inspectable as a canister.",
  "DENDRITE-CONTROL-002": "The controller canister must have no installed Wasm module.",
  "DENDRITE-CONTROL-003": "The controller canister must have no controllers.",
  "DENDRITE-CONTROL-004": "The target raw hotkey list must be empty.",
  "DENDRITE-CONTROL-005": "The target must not be marked not-for-profit.",
  "DENDRITE-NM-001": "Neuron Management must contain between five and fifteen managers.",
  "DENDRITE-NM-002": "The raw manager identifiers must be distinct.",
  "DENDRITE-NM-003": "The target must not list itself as a manager.",
  "DENDRITE-NM-004": "Every manager must be a full public known neuron.",
  "DENDRITE-NM-005": "The alpha-vote and omega-reject anchors must both be known.",
  "DENDRITE-COMMIT-001": "Each committed topic must have at least three delegates.",
  "DENDRITE-COMMIT-002": "Each committed topic's raw delegate identifiers must be distinct.",
  "DENDRITE-COMMIT-003": "Every committed delegate must also be a known manager.",
  "DENDRITE-COMMIT-004": "Every committed delegate must follow only omega-reject on that topic.",
  "DENDRITE-DEFAULT-001": "Every recognised uncommitted concrete topic must follow only alpha-vote.",
  "DENDRITE-DEFAULT-002": "CatchAll must follow only alpha-vote.",
  "DENDRITE-DEFAULT-003": "Every non-empty following topic code must be recognised by the standard.",
  "DENDRITE-DATA-001": "Every required lookup must end as found or confirmed missing.",
  "DENDRITE-DATA-002": "The report must include its standard, source, timestamp, and bounded failures.",
  "DENDRITE-DATA-003": "No rule may pass when evidence required by that rule is unavailable.",
});
export const ruleDescription = (id) => RULE_DESCRIPTIONS[id]
  ?? "This rule is not yet described by this interface; inspect its report message and raw evidence.";

export const RULE_GROUPS = Object.freeze([
  ["Target and committed topics", "DENDRITE-KNOWN-"],
  ["Locked and active posture", "DENDRITE-LOCK-", "DENDRITE-ACTIVE-"],
  ["Controller and target settings", "DENDRITE-CONTROL-"],
  ["Neuron Management managers", "DENDRITE-NM-"],
  ["Committed delegation", "DENDRITE-COMMIT-"],
  ["Non-committed following", "DENDRITE-DEFAULT-"],
  ["Evidence integrity", "DENDRITE-DATA-"],
]);

const STATUS_PRESENTATION = Object.freeze({
  Pass: { label: "Pass", icon: "✓", kind: "pass" },
  Fail: { label: "Fail", icon: "×", kind: "fail" },
  Indeterminate: { label: "Indeterminate", icon: "?", kind: "indeterminate" },
  Warning: { label: "Warning", icon: "!", kind: "warning" },
  StandardUpdateRequired: { label: "Standard update required", icon: "↻", kind: "standardupdaterequired" },
});
export const statusPresentation = (status, verificationKind = "Consensus", ruleId = "") => {
  if (status === "Indeterminate" && verificationKind === "Preliminary"
    && PRELIMINARY_CONTROLLER_RULES.has(ruleId)) {
    return { ...STATUS_PRESENTATION.Indeterminate, label: "Requires verification" };
  }
  return STATUS_PRESENTATION[status] ?? { label: status, icon: "?", kind: "indeterminate" };
};

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
function announceCopy(announcer, value) {
  if (!announcer) return;
  announcer.textContent = "";
  globalThis.setTimeout?.(() => { announcer.textContent = `Copied ${value}`; }, 0);
}
function copyButton(value, label, copyText, announcer) {
  const button = document.createElement("button");
  button.className = "button-icon copy-button";
  button.type = "button";
  button.title = String(value);
  button.setAttribute("aria-label", `${label}: ${value}`);
  const icon = element("span", "", "icon icon-copy");
  icon.setAttribute("aria-hidden", "true");
  button.append(icon);
  button.addEventListener("click", async () => {
    try {
      await copyText?.(String(value));
      button.classList?.add?.("copy-complete");
      announceCopy(announcer, String(value));
      globalThis.setTimeout?.(() => button.classList?.remove?.("copy-complete"), 1_500);
    } catch {
      if (announcer) announcer.textContent = "Copy failed";
    }
  });
  return button;
}
function metric(label, value, hint, className = "") {
  const node = document.createElement("div");
  node.className = `metric ${className}`.trim();
  const description = document.createElement("dd");
  if (value?.tagName || value?.tag) description.append(value);
  else description.textContent = String(value);
  node.append(element("dt", label), description);
  if (hint) node.append(element("p", hint, "muted"));
  return node;
}
function details(summary, children, className = "") {
  const node = document.createElement("details");
  node.className = `evidence-disclosure ${className}`.trim();
  const label = document.createElement("summary");
  const chevron = element("span", "", "chevron");
  chevron.setAttribute("aria-hidden", "true");
  label.append(element("span", summary), chevron);
  node.append(label, ...children);
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
function horizontalScroll(content) {
  const wrapper = document.createElement("div");
  wrapper.className = "horizontal-scroll";
  wrapper.append(content);
  return wrapper;
}
function safeJson(value) {
  return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : typeof item?.toText === "function" ? item.toText() : item, 2);
}
// Presentation aggregation follows the Standard's deterministic severity order.
// It never changes the underlying report entries or evaluator semantics.
export const AGGREGATE_SEVERITY = Object.freeze({
  Fail: 0,
  StandardUpdateRequired: 1,
  Indeterminate: 2,
  Warning: 3,
  Pass: 4,
});
const severity = AGGREGATE_SEVERITY;

export function sortedFindings(rules) {
  return [...rules].filter((rule) => variantName(rule.status) !== "Pass")
    .sort((left, right) => (severity[variantName(left.status)] ?? 9) - (severity[variantName(right.status)] ?? 9));
}

function renderManagers(report, copyText, announcer) {
  const table = document.createElement("table");
  table.className = "manager-table responsive-table";
  const head = document.createElement("thead");
  const heading = document.createElement("tr");
  for (const name of ["Manager", "Evidence", "Controller", "Hotkeys", "Readiness"]) {
    const cell = element("th", name);
    cell.setAttribute("scope", "col");
    heading.append(cell);
  }
  head.append(heading);
  const body = document.createElement("tbody");
  for (const manager of report.managers) {
    const row = document.createElement("tr");
    const id = manager.neuron_id.toString();
    const managerCell = document.createElement("th");
    managerCell.setAttribute("scope", "row");
    managerCell.setAttribute("data-label", "Manager");
    managerCell.append(
      element("span", manager.known_neuron?.[0]?.name ?? `Manager ${id}`, "row-primary"),
      safeHttpsLink(shortNeuronId(id), `https://dashboard.internetcomputer.org/neuron/${id}`),
    );
    const evidence = document.createElement("td");
    evidence.setAttribute("data-label", "Evidence");
    evidence.append(statusText(variantName(manager.evidence_status)));
    const controller = manager.controller?.[0];
    const controllerCell = document.createElement("td");
    controllerCell.setAttribute("data-label", "Controller");
    controllerCell.append(element("span", controller ? shortPrincipal(controller) : "Unavailable"));
    if (controller) controllerCell.append(copyButton(
      principalText(controller), "Copy controller", copyText, announcer,
    ));
    const hotkeys = element("td", manager.hot_keys.length
      ? manager.hot_keys.map(shortPrincipal).join(" · ") : "None");
    hotkeys.setAttribute("data-label", "Hotkeys");
    const readiness = document.createElement("td");
    readiness.setAttribute("data-label", "Readiness");
    readiness.append(
      element("span", `Management: ${ids(manager.neuron_management_followees ?? [])}`),
      element("span", `Omega-ready: ${manager.omega_ready_topics?.length
        ? manager.omega_ready_topics.map((topic) => TOPIC_LABELS.get(topic) ?? topic).join(" · ")
        : "None"}`, "table-support"),
    );
    row.append(managerCell, evidence, controllerCell, hotkeys, readiness);
    body.append(row);
  }
  table.append(head, body);
  return table;
}

export function groupTopics(report) {
  const groups = new Map();
  const add = (kind, topic, values) => {
    const normalized = [...values].map(BigInt).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
    const key = `${kind}:${normalized.map(String).join(",")}`;
    const group = groups.get(key) ?? { kind, values: normalized, topics: [] };
    group.topics.push(topic);
    groups.set(key, group);
  };
  for (const topic of report.committed_topics) add("Delegates", topic.topic, topic.delegate_ids);
  for (const topic of report.non_committed_topics) add("Followees", topic.topic, topic.followee_ids);
  return [...groups.values()];
}
const shortNeuronId = (value) => {
  const id = String(value);
  return id.length <= 12 ? id : `${id.slice(0, 6)}…${id.slice(-5)}`;
};

const attentionStatus = (status) => status !== "Pass";
const canonicalGroup = (ruleId) => RULE_GROUPS.find(([, ...prefixes]) =>
  prefixes.some((prefix) => ruleId.startsWith(prefix)))?.[0] ?? "Additional rules";
export function canonicalRules(rules) {
  const positions = new Map(Object.keys(RULE_TITLES).map((id, index) => [id, index]));
  return [...rules].sort((left, right) => {
    const leftPosition = positions.get(left.rule_id) ?? Number.MAX_SAFE_INTEGER;
    const rightPosition = positions.get(right.rule_id) ?? Number.MAX_SAFE_INTEGER;
    return leftPosition - rightPosition || left.rule_id.localeCompare(right.rule_id);
  });
}
const optionalCompare = (left, right) => {
  const leftPresent = left?.length > 0, rightPresent = right?.length > 0;
  if (leftPresent !== rightPresent) return leftPresent ? -1 : 1;
  if (!leftPresent) return 0;
  return Number(left[0]) - Number(right[0]);
};
const compareRuleInstances = (left, right) =>
  optionalCompare(left.relevant_topic, right.relevant_topic)
  || String(left.message).localeCompare(String(right.message))
  || String(optional(left.observed, "")).localeCompare(String(optional(right.observed, "")))
  || String(optional(left.expected, "")).localeCompare(String(optional(right.expected, "")));

export function aggregateRules(rules) {
  const groups = new Map();
  for (const entry of rules) {
    const aggregate = groups.get(entry.rule_id) ?? {
      rule_id: entry.rule_id,
      title: ruleTitle(entry.rule_id),
      description: ruleDescription(entry.rule_id),
      entries: [],
    };
    aggregate.entries.push(entry);
    groups.set(entry.rule_id, aggregate);
  }
  return canonicalRules([...groups.values()].map((aggregate) => {
    aggregate.entries = [...aggregate.entries].sort(compareRuleInstances);
    aggregate.status = aggregate.entries.reduce((selected, entry) =>
      (severity[variantName(entry.status)] ?? Number.MAX_SAFE_INTEGER)
        < (severity[variantName(selected.status)] ?? Number.MAX_SAFE_INTEGER) ? entry : selected
    ).status;
    aggregate.evaluationCount = aggregate.entries.length;
    aggregate.topics = aggregate.entries
      .filter((entry) => entry.relevant_topic?.length)
      .map((entry) => entry.relevant_topic[0]);
    aggregate.observed = aggregate.entries.flatMap((entry) => entry.observed);
    aggregate.expected = aggregate.entries.flatMap((entry) => entry.expected);
    aggregate.relatedNeuronIds = aggregate.entries.flatMap((entry) => entry.related_neuron_ids);
    aggregate.messages = aggregate.entries.map((entry) => entry.message);
    return aggregate;
  }));
}
function disclosureButton(label, region, expanded = false, className = "") {
  const button = element("button", label, className);
  button.type = "button";
  button.setAttribute("aria-expanded", String(expanded));
  button.setAttribute("aria-controls", region.id);
  region.hidden = !expanded;
  button.addEventListener("click", () => {
    const open = button.attributes?.["aria-expanded"] === "true"
      || button.getAttribute?.("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    region.hidden = open;
  });
  return button;
}
let disclosureSequence = 0;
const disclosureId = (prefix) => `${prefix}-${++disclosureSequence}`;
function statusNode(rule, verificationKind) {
  const presentation = statusPresentation(variantName(rule.status), verificationKind, rule.rule_id);
  return statusText(presentation.label, presentation);
}
function statusText(status, suppliedPresentation) {
  const evidencePresentation = {
    Found: { label: "Found", icon: "✓", kind: "pass" },
    ConfirmedMissing: { label: "Confirmed missing", icon: "×", kind: "fail" },
    Unavailable: { label: "Unavailable", icon: "?", kind: "indeterminate" },
  };
  const presentation = suppliedPresentation ?? evidencePresentation[status] ?? statusPresentation(status);
  const node = document.createElement("span");
  node.className = `status-text status-${presentation.kind}`;
  const icon = element("span", presentation.icon, "status-icon");
  icon.setAttribute("aria-hidden", "true");
  node.append(icon, element("span", presentation.label));
  return node;
}
const statusVerb = (status) => ({
  Pass: "pass",
  Fail: "fail",
  Indeterminate: "require verification",
  Warning: "have warnings",
  StandardUpdateRequired: "use an unknown Standard variant",
})[status] ?? status.toLowerCase();
export function aggregateSummary(aggregate, verificationKind) {
  const status = variantName(aggregate.status);
  const label = statusPresentation(status, verificationKind, aggregate.rule_id).label;
  if (aggregate.evaluationCount === 1) return label;
  const matching = aggregate.entries.filter((entry) => variantName(entry.status) === status).length;
  const unit = aggregate.topics.length === aggregate.evaluationCount ? "topic" : "evaluation";
  const count = status === "Pass" ? aggregate.evaluationCount : matching;
  return `${label} · ${count} of ${aggregate.evaluationCount} ${unit}${aggregate.evaluationCount === 1 ? "" : "s"} ${statusVerb(status)}`;
}
function relatedNeuronChip(value, copyText, announcer) {
  const id = String(value);
  const chip = document.createElement("span");
  chip.className = "neuron-chip";
  const link = document.createElement("a");
  link.href = `#/neuron/${id}`;
  link.textContent = shortNeuronId(id);
  link.title = id;
  link.setAttribute("aria-label", `Open Dendrite report for neuron ${id}`);
  chip.append(link, copyButton(id, "Copy neuron ID", copyText, announcer));
  return chip;
}
function diagnosticLink(link) {
  const visible = link.kind === "controller-canister" ? shortPrincipal(link.principal) : link.href;
  const node = safeHttpsLink(visible, link.href);
  node.title = link.principal ?? link.href;
  node.setAttribute("aria-label", `Open controller canister ${link.principal} in the Internet Computer Dashboard`);
  node.append(element("span", " ↗", "external-link-indicator"));
  return node;
}
function ruleDetails(report, rule, verificationKind, provenance, copyText, announcer) {
  const diagnostic = buildRuleDiagnostic({
    report,
    aggregate: { evaluationCount: 1 },
    entry: rule,
    verificationKind,
    provenance,
    requirement: ruleDescription(rule.rule_id),
  });
  const region = document.createElement("div");
  region.className = "rule-detail";
  region.append(
    element("h5", diagnostic.outcomeLabel, `outcome-heading outcome-${diagnostic.status.toLowerCase()}`),
    element("p", diagnostic.conciseReason, "rule-message"),
    element("p", "Requirement", "detail-label"),
    element("p", diagnostic.requirement, "rule-requirement"),
  );
  const facts = document.createElement("dl");
  for (const [index, value] of diagnostic.observedItems.entries()) {
    facts.append(metric(index ? "Observed (continued)" : "Observed", value));
  }
  for (const [index, value] of diagnostic.expectedItems.entries()) {
    facts.append(metric(index ? "Expected (continued)" : "Expected", value));
  }
  for (const link of diagnostic.links) facts.append(metric("Controller canister", diagnosticLink(link)));
  const controller = report.controller?.[0];
  if (rule.rule_id === "DENDRITE-CONTROL-003" && controller?.controllers?.length) {
    const principals = document.createElement("div");
    principals.className = "principal-list";
    for (const principal of controller.controllers) {
      const value = principalText(principal);
      const item = document.createElement("span");
      item.className = "principal-item";
      item.append(element("span", value), copyButton(value, "Copy controller principal", copyText, announcer));
      principals.append(item);
    }
    facts.append(metric("Retained controller principals", principals));
  }
  const target = report.target?.[0];
  if (rule.rule_id === "DENDRITE-CONTROL-004" && target?.hot_keys?.length) {
    const hotkeys = document.createElement("div");
    hotkeys.className = "principal-list";
    for (const principal of target.hot_keys) {
      const value = principalText(principal);
      const item = document.createElement("span");
      item.className = "principal-item";
      item.append(element("span", value), copyButton(value, "Copy hotkey principal", copyText, announcer));
      hotkeys.append(item);
    }
    facts.append(metric("Hotkey principals", hotkeys));
  }
  if (diagnostic.relevantTopic !== undefined) facts.append(metric("Relevant topic", topicLabel(diagnostic.relevantTopic)));
  if (diagnostic.relatedNeurons.length) {
    const chips = document.createElement("div");
    chips.className = "neuron-chips";
    for (const id of diagnostic.relatedNeurons) {
      chips.append(relatedNeuronChip(id, copyText, announcer));
    }
    facts.append(metric("Related neurons", chips));
  }
  facts.append(
    metric("Technical rule ID", element("code", rule.rule_id)),
  );
  region.append(facts);
  return region;
}
function aggregateRuleDetails(report, aggregate, verificationKind, provenance, copyText, announcer) {
  if (aggregate.evaluationCount === 1) {
    return ruleDetails(report, aggregate.entries[0], verificationKind, provenance, copyText, announcer);
  }
  const region = document.createElement("div");
  region.className = "rule-detail";
  region.append(
    element("p", aggregate.description, "rule-requirement"),
    element("p", aggregateSummary(aggregate, verificationKind), "aggregate-status-summary"),
  );
  const table = document.createElement("table");
  table.className = "rule-instance-table responsive-table";
  const head = document.createElement("thead");
  const heading = document.createElement("tr");
  for (const name of ["Topic", "Result", "Why this result", "Observed", "Expected", "Related neurons"]) {
    const cell = element("th", name);
    cell.setAttribute("scope", "col");
    heading.append(cell);
  }
  head.append(heading);
  const body = document.createElement("tbody");
  for (const entry of aggregate.entries) {
    const diagnostic = buildRuleDiagnostic({
      report, aggregate, entry, verificationKind, provenance, requirement: aggregate.description,
    });
    const row = document.createElement("tr");
    const topic = element("th", entry.relevant_topic?.length
      ? topicLabel(entry.relevant_topic[0]) : "General evaluation");
    topic.setAttribute("scope", "row");
    topic.setAttribute("data-label", "Topic");
    const result = document.createElement("td");
    result.setAttribute("data-label", "Result");
    result.append(statusNode(entry, verificationKind));
    const message = element("td", diagnostic.conciseReason);
    message.setAttribute("data-label", "Why this result");
    const observed = element("td", optional(entry.observed, "—"));
    observed.setAttribute("data-label", "Observed");
    const expected = element("td", optional(entry.expected, "—"));
    expected.setAttribute("data-label", "Expected");
    const related = document.createElement("td");
    related.setAttribute("data-label", "Related neurons");
    if (entry.related_neuron_ids.length) {
      const chips = document.createElement("div");
      chips.className = "neuron-chips";
      for (const id of entry.related_neuron_ids) {
        chips.append(relatedNeuronChip(id, copyText, announcer));
      }
      related.append(chips);
    } else {
      related.textContent = "—";
    }
    row.append(topic, result, message, observed, expected, related);
    body.append(row);
  }
  table.append(head, body);
  region.append(table, element("p", "", "technical-rule-label"));
  region.children[region.children.length - 1].append(
    "Technical rule ID: ",
    element("code", aggregate.rule_id),
  );
  return region;
}
function collapsedRuleSupport(report, rule, verificationKind, provenance) {
  const status = variantName(rule.status);
  if (rule.evaluationCount === 1) {
    return attentionStatus(status)
      ? buildRuleDiagnostic({
        report, aggregate: rule, entry: rule.entries[0], verificationKind, provenance,
        requirement: rule.description,
      }).conciseReason : "";
  }
  if (status === "Pass") return `${rule.evaluationCount} topic evaluations`;
  const matching = rule.entries.filter((entry) => variantName(entry.status) === status).length;
  const verb = status === "Fail" ? "fail"
    : status === "Warning" ? "have warnings"
      : status === "StandardUpdateRequired" ? "require a Standard update"
        : "require verification";
  return `${matching} of ${rule.evaluationCount} topic evaluations ${verb}`;
}
function renderRuleRows(report, rule, verificationKind, provenance, copyText, announcer) {
  const status = variantName(rule.status);
  const summaryRow = document.createElement("tr");
  summaryRow.className = `rule-summary-row rule-${status.toLowerCase()}`;
  summaryRow.setAttribute("data-status", status);
  summaryRow.setAttribute("data-rule-id", rule.rule_id);
  const detailRow = document.createElement("tr");
  detailRow.className = "rule-detail-row";
  detailRow.hidden = true;
  detailRow.id = disclosureId("rule-detail");
  const disclosureCell = document.createElement("td");
  disclosureCell.className = "rule-disclosure-cell";
  const toggle = document.createElement("button");
  toggle.className = "button-disclosure rule-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", detailRow.id);
  toggle.setAttribute("aria-label", `Show details for ${rule.title}`);
  const chevron = element("span", "", "chevron");
  chevron.setAttribute("aria-hidden", "true");
  toggle.append(chevron);
  const ruleCell = document.createElement("th");
  ruleCell.className = "rule-name-cell";
  ruleCell.setAttribute("scope", "row");
  const summary = document.createElement("div");
  summary.className = "rule-summary";
  summary.append(element("h4", rule.title));
  const support = collapsedRuleSupport(report, rule, verificationKind, provenance);
  if (support) summary.append(element("p", support, "rule-reason"));
  ruleCell.append(summary);
  const statusCell = document.createElement("td");
  statusCell.className = "rule-result-cell";
  statusCell.append(statusNode(rule, verificationKind));
  disclosureCell.append(toggle);
  summaryRow.append(disclosureCell, ruleCell, statusCell);
  const detailCell = document.createElement("td");
  detailCell.colSpan = 3;
  detailCell.setAttribute("colspan", "3");
  detailCell.append(aggregateRuleDetails(report, rule, verificationKind, provenance, copyText, announcer));
  detailRow.append(detailCell);
  toggle.addEventListener("click", () => {
    const expanded = attribute(toggle, "aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    toggle.setAttribute("aria-label", `${expanded ? "Show" : "Hide"} details for ${rule.title}`);
    detailRow.hidden = expanded;
  });
  summaryRow.addEventListener("click", (event) => {
    if (event.target === toggle || event.target?.closest?.("a, button, input, select, textarea")) return;
    if (globalThis.getSelection?.()?.toString()) return;
    toggle.click();
    toggle.focus();
  });
  return { rule, summaryRow, detailRow, toggle };
}
function renderRules(report, verificationKind, provenance, copyText, announcer) {
  const section = document.createElement("section");
  section.id = "rules";
  section.className = "rules-section";
  section.append(element("h2", "Standard rules"));
  const controls = document.createElement("div");
  controls.className = "rule-controls";
  controls.setAttribute("aria-label", "Filter standard rules");
  const count = element("p", "", "rule-count");
  count.setAttribute("aria-live", "polite");
  const list = document.createElement("div");
  list.className = "rule-groups";
  const rows = [];
  const groupSections = [];
  const aggregatedRules = aggregateRules(report.rules);
  const totalSummary = summarizeRuleStatuses(aggregatedRules, verificationKind);
  section.append(
    element("p", formatStatusSummary(totalSummary), "status-counts rule-total-statuses"),
    element("p", `${totalSummary.totalDistinctRules} Standard rules · ${totalSummary.totalPolicyEvaluations} policy evaluations`, "evaluation-counts"),
  );
  for (const rule of aggregatedRules) {
    const group = canonicalGroup(rule.rule_id);
    let current = groupSections[groupSections.length - 1];
    if (!current || current.name !== group) {
      const groupSection = document.createElement("section");
      groupSection.className = "rule-group";
      const content = document.createElement("div");
      content.id = disclosureId("rule-group-content");
      content.className = "rule-group-content";
      const heading = document.createElement("h3");
      groupSection.append(heading, content);
      const table = document.createElement("table");
      table.className = "rule-table";
      const head = document.createElement("thead");
      const tableHeading = document.createElement("tr");
      const disclosureHeading = element("th", "");
      disclosureHeading.setAttribute("scope", "col");
      disclosureHeading.setAttribute("aria-label", "Details");
      const ruleHeading = element("th", "Rule");
      ruleHeading.setAttribute("scope", "col");
      const resultHeading = element("th", "Result");
      resultHeading.setAttribute("scope", "col");
      tableHeading.append(disclosureHeading, ruleHeading, resultHeading);
      head.append(tableHeading);
      const body = document.createElement("tbody");
      table.append(head, body);
      content.append(table);
      list.append(groupSection);
      current = { name: group, section: groupSection, heading, content, body, rows: [] };
      groupSections.push(current);
    }
    const rendered = renderRuleRows(report, rule, verificationKind, provenance, copyText, announcer);
    rows.push(rendered);
    current.rows.push(rendered);
    current.body.append(rendered.summaryRow, rendered.detailRow);
  }
  for (const group of groupSections) {
    const summary = summarizeRuleStatuses(group.rows.map(({ rule }) => rule), verificationKind);
    const countsText = formatStatusSummary(summary);
    const expanded = summary.Fail > 0 || summary.Indeterminate > 0 || summary.Warning > 0
      || summary["Standard update required"] > 0 || summary["Requires verification"] > 0;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "rule-group-toggle";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-controls", group.content.id);
    toggle.setAttribute("aria-label", `${group.name}, ${countsText.replaceAll(" · ", ", ")}`);
    toggle.append(
      element("span", group.name, "rule-group-title"),
      element("span", countsText, "rule-group-counts"),
      element("span", "", "chevron"),
    );
    toggle.children[2].setAttribute("aria-hidden", "true");
    group.content.hidden = !expanded;
    toggle.addEventListener("click", () => {
      const open = attribute(toggle, "aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      group.content.hidden = open;
      if (open) {
        for (const row of group.rows) {
          row.toggle.setAttribute("aria-expanded", "false");
          row.toggle.setAttribute("aria-label", `Show details for ${row.rule.title}`);
          row.detailRow.hidden = true;
        }
      }
    });
    group.heading.append(toggle);
    group.toggle = toggle;
    group.summary = summary;
  }
  const attentionCount = rows.filter(({ rule }) => attentionStatus(variantName(rule.status))).length;
  let attentionOnly = false;
  const apply = () => {
    let visible = 0;
    for (const { rule, summaryRow, detailRow, toggle } of rows) {
      const hidden = attentionOnly && !attentionStatus(variantName(rule.status));
      summaryRow.hidden = hidden;
      detailRow.hidden = hidden || attribute(toggle, "aria-expanded") !== "true";
      if (!hidden) visible += 1;
    }
    for (const group of groupSections) {
      group.section.hidden = !group.rows.some(({ summaryRow }) => !summaryRow.hidden);
    }
    count.textContent = attentionOnly ? `Showing ${visible} of ${rows.length} Standard rules` : "";
  };
  if (attentionCount) {
    const button = document.createElement("button");
    button.className = "button-quiet attention-filter";
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.append(
      element("span", "", "filter-check"),
      element("span", `Attention only (${attentionCount})`),
    );
    button.addEventListener("click", () => {
      attentionOnly = !attentionOnly;
      button.setAttribute("aria-pressed", String(attentionOnly));
      apply();
    });
    controls.append(button);
  }
  section.append(controls, count, list);
  apply();
  return section;
}

function expandableSection(id, title, summary, content, expanded = false, importance = "") {
  const section = document.createElement("section");
  section.id = id;
  section.className = `major-section ${importance}`.trim();
  const region = document.createElement("div");
  region.id = disclosureId(`${id}-content`);
  region.className = "section-content";
  region.append(...content);
  const heading = document.createElement("h2");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button-disclosure section-toggle";
  button.setAttribute("aria-expanded", String(expanded));
  button.setAttribute("aria-controls", region.id);
  button.append(
    element("span", title, "section-title"),
    element("span", summary, "section-summary"),
    element("span", "", "chevron"),
  );
  button.children[2].setAttribute("aria-hidden", "true");
  region.hidden = !expanded;
  button.addEventListener("click", () => {
    const open = attribute(button, "aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    region.hidden = open;
  });
  heading.append(button);
  section.append(heading, region);
  return section;
}
function renderTopics(report, copyText, announcer) {
  const table = document.createElement("table");
  table.className = "delegation-table responsive-table";
  const head = document.createElement("thead");
  const heading = document.createElement("tr");
  for (const name of ["Configuration", "Topics", "Result"]) {
    const cell = element("th", name);
    cell.setAttribute("scope", "col");
    heading.append(cell);
  }
  head.append(heading);
  const body = document.createElement("tbody");
  for (const group of groupTopics(report)) {
    const row = document.createElement("tr");
    const noun = group.kind === "Delegates" ? "delegate" : "followee";
    const configuration = document.createElement("th");
    configuration.setAttribute("scope", "row");
    configuration.setAttribute("data-label", "Configuration");
    configuration.append(element("span",
      `${group.values.length} ${noun}${group.values.length === 1 ? "" : "s"}`, "row-primary"));
    const chips = document.createElement("div");
    chips.className = "neuron-chips";
    for (const value of group.values) {
      const id = String(value);
      const link = safeHttpsLink(shortNeuronId(id), `https://dashboard.internetcomputer.org/neuron/${id}`);
      link.title = id;
      link.setAttribute("aria-label", `Neuron ${id}`);
      chips.append(link, copyButton(id, "Copy neuron ID", copyText, announcer));
    }
    configuration.append(chips);
    const topics = document.createElement("td");
    topics.setAttribute("data-label", "Topics");
    topics.append(
      element("span", `${group.topics.length} topic${group.topics.length === 1 ? "" : "s"}`, "row-primary"),
      element("span", group.topics.map(topicLabel).join(" · "), "table-support"),
    );
    const topicSet = new Set(group.topics);
    const relevant = report.rules.filter((rule) => rule.relevant_topic?.length
      && topicSet.has(rule.relevant_topic[0])
      && variantName(rule.status) !== "Pass");
    const result = document.createElement("td");
    result.setAttribute("data-label", "Result");
    if (!relevant.length) result.append(element("span", "No findings", "muted"));
    else for (const rule of sortedFindings(relevant)) {
      const status = variantName(rule.status);
      result.append(
        statusText(status),
        element("p", `${ruleTitle(rule.rule_id)}: ${rule.message}`, "topic-warning"),
      );
    }
    row.append(configuration, topics, result);
    body.append(row);
  }
  table.append(head, body);
  return table;
}

export const PRELIMINARY_CONTROLLER_RULES = Object.freeze(new Set([
  "DENDRITE-CONTROL-001",
  "DENDRITE-CONTROL-002",
  "DENDRITE-CONTROL-003",
]));

export function preliminaryStatus(report) {
  const statuses = new Set(report.rules.map((rule) => variantName(rule.status)));
  if (statuses.has("Fail")) return "Issues found on live evidence";
  if (statuses.has("StandardUpdateRequired")) return "Standard update required";
  if (statuses.has("Indeterminate")) return "Live analysis incomplete";
  return "Meets the Standard on live evidence";
}

export function renderReport(root, viewModel, options = {}) {
  clear(root);
  const { report, verificationKind, stale = false, error, provenance } = viewModel.report ? viewModel : {
    report: viewModel,
    verificationKind: "Consensus",
    stale: false,
  };
  const target = report.target?.[0], known = target?.known_neuron?.[0];
  const announcer = element("p", "", "sr-only copy-announcer");
  announcer.setAttribute("aria-live", "polite");
  announcer.setAttribute("aria-atomic", "true");
  root.append(announcer);
  const header = document.createElement("header");
  header.className = "report-header";
  const title = document.createElement("div");
  const idLine = document.createElement("p");
  idLine.className = "neuron-id";
  idLine.append(
    element("span", `Neuron ${report.neuron_id}`),
    copyButton(report.neuron_id, "Copy neuron ID", options.copyText, announcer),
  );
  title.append(
    element("p", "NNS Dendrite analysis", "eyebrow"),
    element("h1", known?.name ?? `Neuron ${report.neuron_id}`),
    idLine,
  );
  const state = document.createElement("div");
  state.className = "verification-state";
  const verificationText = stale ? "Verification stale" : verificationKind === "Consensus" ? "Consensus verified" : error ? "Consensus unavailable" : "Live analysis";
  state.append(badge(verificationText, stale ? "stale" : verificationKind.toLowerCase()));
  if (verificationKind === "Consensus") {
    state.append(element("span", checkedAtUtc(report.checked_at_timestamp_seconds), "verification-time"));
  }
  header.append(title, state);
  const actions = document.createElement("div");
  actions.className = "report-actions";
  if (options.onRefreshPreliminary) {
    const refresh = element("button",
      options.preliminaryLoading ? "Refreshing live evidence…" : "Refresh live analysis",
      "button-quiet action-refresh");
    refresh.type = "button"; refresh.disabled = Boolean(options.preliminaryLoading); refresh.addEventListener("click", options.onRefreshPreliminary); actions.append(refresh);
  }
  if (options.onVerifyConsensus) {
    const verifyClass = verificationKind === "Consensus" && !stale ? "button-quiet" : "button-primary";
    const verify = element("button", options.consensusLoading ? "Verifying on-chain…" : "Verify on-chain",
      `${verifyClass} action-verify`);
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
  const overview = document.createElement("section");
  overview.id = "overview";
  overview.className = "overview";
  const overallHeading = verificationKind === "Consensus" ? exactStatus : preliminaryStatus(report);
  const aggregatedRules = aggregateRules(report.rules);
  const statusSummary = summarizeRuleStatuses(aggregatedRules, verificationKind);
  overview.append(
    element("h2", overallHeading, `main-status status-${exactStatus.toLowerCase()}`),
    element("p", formatStatusSummary(statusSummary), "status-counts"),
    element("p", `${statusSummary.totalDistinctRules} Standard rules · ${statusSummary.totalPolicyEvaluations} policy evaluations`, "evaluation-counts"),
  );
  if (verificationKind === "Preliminary") {
    overview.append(element("p", "Consensus verification is required before management actions.", "verification-warning"));
  }
  root.append(overview);

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
    metric("Controller blackhole", controller?.call_succeeded ? (!controller.module_hash.length && !controller.controllers.length ? "Confirmed" : "Not confirmed") : "Unavailable"),
    metric("Verification level", verificationKind === "Consensus" ? "Consensus verified" : "Live analysis"),
  );
  const characteristics = document.createElement("section");
  characteristics.id = "characteristics";
  characteristics.className = "characteristics-section";
  characteristics.append(element("h2", "Key characteristics"), metrics);
  root.append(characteristics, renderRules(report, verificationKind, provenance, options.copyText, announcer));

  const managerStatuses = report.managers.map((manager) => variantName(manager.evidence_status));
  const managersUnavailable = managerStatuses.some((status) => status === "Unavailable");
  const managersMissing = managerStatuses.some((status) => status === "ConfirmedMissing");
  const managerSummary = !report.managers.length
    ? "none found"
    : managersUnavailable
      ? `${report.managers.length} listed, evidence unavailable`
      : managersMissing
        ? `${report.managers.length} listed, missing evidence`
        : `${report.managers.length} found, evidence available`;
  const managerContent = report.managers.length
    ? [renderManagers(report, options.copyText, announcer)]
    : [element("p", "No manager evidence is available in this report.", "empty-state")];
  root.append(expandableSection("managers", "Managers", managerSummary, managerContent, false,
    managersUnavailable || managersMissing ? "section-important" : ""));

  const topicGroups = groupTopics(report);
  const topicCount = new Set([
    ...report.committed_topics.map((topic) => topic.topic),
    ...report.non_committed_topics.map((topic) => topic.topic),
  ]).size;
  const delegationSummary = topicCount
    ? `${topicGroups.length} configurations across ${topicCount} topics`
    : "no topic configurations";
  root.append(expandableSection("delegation", "Topic delegation", delegationSummary,
    topicCount ? [renderTopics(report, options.copyText, announcer)] : [
      element("p", "No topic delegation evidence is present in this report.", "empty-state"),
    ]));

  const metadata = [
    element("p", `Standard: ${report.standard_version}`),
    element("p", `Pinned source: ${report.source_revision}`),
    element("p", `Evidence timestamp: ${report.checked_at_timestamp_seconds}`),
    element("p", `Overall status: ${exactStatus}`),
  ];
  if (verificationKind === "Consensus") {
    metadata.push(
      element("p", "Neuron data: replicated Dendrite verification"),
      element("p", "Controller state: replicated Dendrite verification"),
      element("p", "Evaluation: replicated Dendrite verifier"),
    );
  } else {
    metadata.push(
      element("p", "Neuron data: replica-signed NNS Governance query"),
      element("p", provenance?.controllerEvidence?.kind === "certified-system-state"
        ? "Controller state: IC-certified"
        : "Controller state: unavailable"),
      element("p", "Evaluation: browser"),
    );
    if (provenance?.controllerEvidence?.kind === "certified-system-state") {
      metadata.push(
        element("p", `Controller principal: ${provenance.controllerEvidence.canisterId}`),
        element("p", `Controller certificate time: ${provenance.controllerEvidence.certificateTime}`),
        element("p", "Controller state was IC-certified for the controller principal reported by the live Governance query."),
      );
    }
  }
  const controllerTechnical = controller ? [
    element("p", `Controller principal: ${controller.principal?.[0] ? principalText(controller.principal[0]) : "Unavailable"}`),
    element("p", `Controller state: ${controller.call_succeeded ? "Available" : "Unavailable"}`),
    element("p", `Module hash: ${controller.call_succeeded ? (controller.module_hash?.length ? "Present" : "Absent") : "Unavailable"}`),
    element("p", `Returned controllers: ${controller.call_succeeded ? (controller.controllers.map(principalText).join(", ") || "None") : "Unavailable"}`),
  ] : [element("p", "Unavailable")];
  const technical = document.createElement("section");
  technical.className = "technical-evidence";
  technical.append(
    details("Verification metadata", metadata),
    details("Raw target evidence", [element("pre", safeJson(target ?? null))]),
    details("Controller blackhole evidence", [...controllerTechnical, element("pre", safeJson(controller ?? null))]),
    details("Complete rule table", [horizontalScroll(technicalTable(report))]),
    details(`Source failures (${report.source_failures.length})`, [element("pre", safeJson(report.source_failures))]),
    details("Raw report", [element("pre", safeJson(report))]),
  );
  const evidenceSection = document.createElement("section");
  evidenceSection.id = "evidence";
  evidenceSection.className = `technical-section ${report.source_failures.length ? "section-important" : ""}`.trim();
  evidenceSection.append(element("h2", "Technical evidence"));
  if (report.source_failures.length) {
    evidenceSection.append(element("p",
      `${report.source_failures.length} source failure${report.source_failures.length === 1 ? "" : "s"} recorded`,
      "source-failure-summary"));
  }
  evidenceSection.append(technical);
  root.append(evidenceSection);
}
