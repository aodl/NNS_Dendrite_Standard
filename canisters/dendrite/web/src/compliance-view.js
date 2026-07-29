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
  const node = document.createElement("span");
  node.className = `rule-status badge badge-${presentation.kind}`;
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
function relatedNeuronChip(value, copyText) {
  const id = String(value);
  const chip = document.createElement("span");
  chip.className = "neuron-chip";
  const link = document.createElement("a");
  link.href = `#/neuron/${id}`;
  link.textContent = shortNeuronId(id);
  link.title = id;
  link.setAttribute("aria-label", `Open Dendrite report for neuron ${id}`);
  chip.append(link, copyButton(id, "Copy", copyText));
  return chip;
}
function ruleDetails(rule, verificationKind, copyText) {
  const region = document.createElement("div");
  region.id = disclosureId("rule-detail");
  region.className = "rule-detail";
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", `${ruleTitle(rule.rule_id)} details`);
  region.append(
    element("p", ruleDescription(rule.rule_id), "rule-explanation"),
    element("p", rule.message, "rule-message"),
  );
  const facts = document.createElement("dl");
  if (rule.observed?.length) facts.append(metric("Observed value", rule.observed[0]));
  if (rule.expected?.length) facts.append(metric("Expected value", rule.expected[0]));
  if (rule.relevant_topic?.length) facts.append(metric("Relevant topic", topicLabel(rule.relevant_topic[0])));
  if (rule.related_neuron_ids.length) {
    const chips = document.createElement("div");
    chips.className = "neuron-chips";
    for (const id of rule.related_neuron_ids) chips.append(relatedNeuronChip(id, copyText));
    facts.append(metric("Related neurons", chips));
  }
  const source = verificationKind === "Consensus"
    ? "Live consensus-backed Dendrite report"
    : "Preliminary browser query; controller evidence requires consensus verification";
  facts.append(
    metric("Evidence source", source),
    metric("Technical rule ID", element("code", rule.rule_id)),
  );
  region.append(facts);
  if (rule.observed?.length || rule.expected?.length || rule.related_neuron_ids.length) {
    region.append(details("Complete raw values", [element("pre", safeJson({
      observed: rule.observed,
      expected: rule.expected,
      relevant_topic: rule.relevant_topic,
      related_neuron_ids: rule.related_neuron_ids,
    }))]));
  }
  return region;
}
function aggregateRuleDetails(aggregate, verificationKind, copyText) {
  if (aggregate.evaluationCount === 1) {
    return ruleDetails(aggregate.entries[0], verificationKind, copyText);
  }
  const region = document.createElement("div");
  region.id = disclosureId("rule-detail");
  region.className = "rule-detail";
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", `${aggregate.title} details`);
  region.append(
    element("p", aggregate.description, "rule-explanation"),
    element("p", aggregateSummary(aggregate, verificationKind), "aggregate-status-summary"),
  );
  const list = document.createElement("ol");
  list.className = "rule-instance-list";
  for (const entry of aggregate.entries) {
    const item = document.createElement("li");
    item.className = "rule-instance";
    const heading = document.createElement("div");
    heading.className = "rule-instance-heading";
    heading.append(
      element("h5", entry.relevant_topic?.length ? topicLabel(entry.relevant_topic[0]) : "General evaluation"),
      statusNode(entry, verificationKind),
    );
    item.append(heading, element("p", entry.message, "rule-message"));
    const facts = document.createElement("dl");
    if (entry.observed?.length) facts.append(metric("Observed value", entry.observed[0]));
    if (entry.expected?.length) facts.append(metric("Expected value", entry.expected[0]));
    if (entry.related_neuron_ids.length) {
      const chips = document.createElement("div");
      chips.className = "neuron-chips";
      for (const id of entry.related_neuron_ids) chips.append(relatedNeuronChip(id, copyText));
      facts.append(metric("Related neurons", chips));
    }
    if (facts.children.length) item.append(facts);
    item.append(details("Complete raw values", [element("pre", safeJson({
      observed: entry.observed,
      expected: entry.expected,
      relevant_topic: entry.relevant_topic,
      related_neuron_ids: entry.related_neuron_ids,
    }))]));
    list.append(item);
  }
  region.append(
    list,
    element("p", "", "technical-rule-label"),
  );
  region.children[region.children.length - 1].append(
    "Technical rule ID: ",
    element("code", aggregate.rule_id),
  );
  return region;
}
function renderRuleRow(rule, verificationKind, copyText) {
  const status = variantName(rule.status);
  const row = document.createElement("li");
  row.className = `rule-row rule-${status.toLowerCase()}`;
  row.dataset && (row.dataset.status = status);
  row.setAttribute("data-status", status);
  row.setAttribute("data-rule-id", rule.rule_id);
  const region = aggregateRuleDetails(rule, verificationKind, copyText);
  const heading = document.createElement("div");
  heading.className = "rule-row-heading";
  const toggle = disclosureButton("Show details", region, false, "rule-toggle");
  toggle.setAttribute("aria-label", `Show details for ${ruleTitle(rule.rule_id)}`);
  const summary = document.createElement("div");
  summary.className = "rule-summary";
  summary.append(element("h4", rule.title));
  if (rule.evaluationCount > 1) {
    summary.append(element("p", aggregateSummary(rule, verificationKind), "rule-reason"));
  } else if (attentionStatus(status)) {
    summary.append(element("p", rule.entries[0].message, "rule-reason"));
  }
  heading.append(toggle, summary, statusNode(rule, verificationKind));
  toggle.addEventListener("click", () => {
    const expanded = toggle.attributes?.["aria-expanded"] === "true"
      || toggle.getAttribute?.("aria-expanded") === "true";
    toggle.textContent = expanded ? "Hide details" : "Show details";
    toggle.setAttribute("aria-label", `${expanded ? "Hide" : "Show"} details for ${ruleTitle(rule.rule_id)}`);
  });
  row.append(heading, region);
  return row;
}
function renderRules(report, verificationKind, copyText) {
  const section = document.createElement("section");
  section.id = "rules";
  section.className = "rules-section";
  section.append(element("h2", "Standard rules"));
  const controls = document.createElement("div");
  controls.className = "rule-controls";
  controls.setAttribute("aria-label", "Filter and expand standard rules");
  const count = element("p", "", "rule-count");
  count.setAttribute("aria-live", "polite");
  const list = document.createElement("div");
  list.className = "rule-groups";
  const rows = [];
  const groupSections = [];
  let currentGroup;
  let groupList;
  for (const rule of aggregateRules(report.rules)) {
    const group = canonicalGroup(rule.rule_id);
    if (group !== currentGroup) {
      const groupSection = document.createElement("section");
      groupSection.className = "rule-group";
      groupSection.append(element("h3", group));
      groupList = document.createElement("ul");
      groupList.className = "rule-list";
      groupSection.append(groupList);
      list.append(groupSection);
      groupSections.push({ section: groupSection, rows: [] });
      currentGroup = group;
    }
    const row = renderRuleRow(rule, verificationKind, copyText);
    rows.push({ rule, row });
    groupSections[groupSections.length - 1].rows.push(row);
    groupList.append(row);
  }
  let active = "All";
  const filters = [
    ["All", () => true],
    ["Needs attention", (status) => attentionStatus(status)],
    ["Failed", (status) => status === "Fail"],
    ["Passed", (status) => status === "Pass"],
  ];
  const apply = (label, predicate) => {
    active = label;
    let visible = 0;
    for (const { rule, row } of rows) {
      row.hidden = !predicate(variantName(rule.status));
      if (!row.hidden) visible += 1;
    }
    for (const group of groupSections) {
      group.section.hidden = !group.rows.some((row) => !row.hidden);
    }
    for (const button of filterButtons) button.setAttribute("aria-pressed", String(button.textContent === active));
    count.textContent = `${active} filter · ${visible} of ${rows.length} Standard rules visible`;
  };
  const filterButtons = filters.map(([label, predicate]) => {
    const button = element("button", label, "secondary rule-filter");
    button.type = "button";
    button.setAttribute("aria-pressed", String(label === active));
    button.addEventListener("click", () => apply(label, predicate));
    controls.append(button);
    return button;
  });
  const setExpanded = (predicate, expanded) => {
    for (const { rule, row } of rows) {
      if (row.hidden || !predicate(variantName(rule.status))) continue;
      const toggle = row.children[0].children[0];
      const current = toggle.attributes?.["aria-expanded"] === "true"
        || toggle.getAttribute?.("aria-expanded") === "true";
      if (current !== expanded) {
        if (typeof toggle.dispatch === "function") toggle.dispatch("click");
        else toggle.click();
      }
    }
  };
  const expandAttention = element("button", "Expand attention", "secondary");
  expandAttention.type = "button";
  expandAttention.addEventListener("click", () => setExpanded(attentionStatus, true));
  const collapseAll = element("button", "Collapse all", "secondary");
  collapseAll.type = "button";
  collapseAll.addEventListener("click", () => setExpanded(() => true, false));
  controls.append(expandAttention, collapseAll);
  section.append(controls, count, list);
  apply("All", () => true);
  return section;
}

function expandableSection(id, title, summary, content, expanded = false, importance = "") {
  const section = document.createElement("section");
  section.id = id;
  section.className = `page-section ${importance}`.trim();
  const region = document.createElement("div");
  region.id = disclosureId(`${id}-content`);
  region.className = "section-content";
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", title);
  region.append(...content);
  const heading = document.createElement("h2");
  const button = disclosureButton(`${title} — ${summary}`, region, expanded, "section-toggle");
  heading.append(button);
  section.append(heading, region);
  return section;
}
function renderTopics(report, copyText) {
  const list = document.createElement("div");
  list.className = "topic-groups";
  for (const group of groupTopics(report)) {
    const card = document.createElement("article");
    card.className = "topic-group";
    const noun = group.kind === "Delegates" ? "delegate" : "followee";
    card.append(
      element("h3", `${group.values.length} ${noun}${group.values.length === 1 ? "" : "s"}`),
      element("p", `${group.topics.length} topic${group.topics.length === 1 ? "" : "s"} share this configuration`, "muted"),
    );
    const labels = document.createElement("ul");
    for (const topic of group.topics) labels.append(element("li", topicLabel(topic)));
    const chips = document.createElement("div");
    chips.className = "neuron-chips";
    for (const value of group.values) {
      const id = String(value);
      const chip = document.createElement("span");
      chip.className = "neuron-chip";
      const link = safeHttpsLink(shortNeuronId(id), `https://dashboard.internetcomputer.org/neuron/${id}`);
      link.title = id;
      link.setAttribute("aria-label", `Neuron ${id}`);
      chip.append(link, copyButton(id, "Copy", copyText));
      chips.append(chip);
    }
    const topicSet = new Set(group.topics);
    const relevant = report.rules.filter((rule) => rule.relevant_topic?.length
      && topicSet.has(rule.relevant_topic[0])
      && variantName(rule.status) !== "Pass");
    const statuses = document.createElement("div");
    statuses.className = "topic-statuses";
    if (!relevant.length) statuses.append(badge("No topic findings", "pass"));
    else for (const rule of relevant) {
      const status = variantName(rule.status);
      statuses.append(
        badge(status, status.toLowerCase()),
        element("p", `${ruleTitle(rule.rule_id)}: ${rule.message}`, "topic-warning"),
      );
    }
    card.append(
      labels,
      chips,
      statuses,
      details("Complete IDs and topic paths", [
        element("p", `${group.kind}: ${ids(group.values)}`),
        element("p", `Topics: ${group.topics.map(topicLabel).join(" · ")}`),
      ]),
    );
    list.append(card);
  }
  return list;
}

export const PRELIMINARY_CONTROLLER_RULES = Object.freeze(new Set([
  "DENDRITE-CONTROL-001",
  "DENDRITE-CONTROL-002",
  "DENDRITE-CONTROL-003",
]));

export function preliminaryStatus(report) {
  const publicRules = report.rules.filter((rule) => !(
    PRELIMINARY_CONTROLLER_RULES.has(rule.rule_id)
    && variantName(rule.status) === "Indeterminate"
    && /mandatory evidence was unavailable|requires on-chain verification/i.test(rule.message)
  ));
  const statuses = new Set(publicRules.map((rule) => variantName(rule.status)));
  if (statuses.has("Fail")) return "Preliminary issues found";
  if (statuses.has("StandardUpdateRequired")) return "Standard update required";
  if (statuses.has("Indeterminate")) return "Preliminary analysis incomplete";
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
  const overview = document.createElement("section");
  overview.id = "overview";
  overview.className = "overview";
  const overallHeading = verificationKind === "Consensus" ? exactStatus : preliminaryStatus(report);
  const counts = new Map();
  const aggregatedRules = aggregateRules(report.rules);
  for (const rule of aggregatedRules) {
    const presentation = statusPresentation(variantName(rule.status), verificationKind, rule.rule_id);
    counts.set(presentation.label, (counts.get(presentation.label) ?? 0) + 1);
  }
  const countOrder = ["Pass", "Fail", "Requires verification", "Indeterminate", "Warning", "Standard update required"];
  const countText = countOrder.filter((label) => counts.has(label))
    .map((label) => `${counts.get(label)} ${label.toLowerCase()}`).join(" · ");
  overview.append(
    element("h2", overallHeading, `main-status status-${exactStatus.toLowerCase()}`),
    element("p", countText, "status-counts"),
    element("p", `${aggregatedRules.length} Standard rules · ${report.rules.length} policy evaluations`, "evaluation-counts"),
  );
  if (verificationKind === "Preliminary") {
    overview.append(element("p", "Preliminary public evidence is not a compliant verdict. Controller blackhole rules require a current consensus verification.", "verification-warning"));
  }
  root.append(overview);

  const navigation = document.createElement("nav");
  navigation.className = "section-navigation";
  navigation.setAttribute("aria-label", "Neuron report sections");
  for (const [label, id] of [
    ["Overview", "overview"], ["Rules", "rules"], ["Characteristics", "characteristics"],
    ["Managers", "managers"], ["Delegation", "delegation"], ["Evidence", "evidence"],
  ]) {
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = label;
    link.addEventListener("click", (event) => {
      const target = document.getElementById?.(id);
      if (!target?.scrollIntoView) return;
      event.preventDefault();
      target.scrollIntoView();
    });
    navigation.append(link);
  }
  root.append(navigation, renderRules(report, verificationKind, options.copyText));

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
  root.append(expandableSection("characteristics", "Key characteristics", `${metrics.children.length} metrics`, [metrics]));

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
    ? [renderManagers(report, options.copyText)]
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
    topicCount ? [renderTopics(report, options.copyText)] : [
      element("p", "No topic delegation evidence is present in this report.", "empty-state"),
    ]));

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
    details("Verification metadata", metadata),
    details("Raw target evidence", [element("pre", safeJson(target ?? null))]),
    details("Controller blackhole evidence", [...controllerTechnical, element("pre", safeJson(controller ?? null))]),
    details("Complete rule table", [technicalTable(report)]),
    details(`Source failures (${report.source_failures.length})`, [element("pre", safeJson(report.source_failures))]),
    details("Raw report", [element("pre", safeJson(report))]),
  );
  const evidenceImportance = report.source_failures.length ? "section-important" : "";
  root.append(expandableSection("evidence", "Technical evidence",
    report.source_failures.length
      ? `report, sources and raw values · ${report.source_failures.length} source failures`
      : "report, sources and raw values",
    [technical], false, evidenceImportance));
}
