import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AGGREGATE_SEVERITY,
  aggregateRules,
  aggregateSummary,
  canonicalRules,
  renderReport,
  ruleDescription,
  ruleTitle,
  statusPresentation,
} from "../src/compliance-view.js";

class FakeNode {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.textContent = "";
    this.listeners = {};
    this.attributes = {};
    this.hidden = false;
    this.className = "";
    this.focused = false;
    this.classList = {
      add: (name) => { if (!this.className.split(" ").includes(name)) this.className = `${this.className} ${name}`.trim(); },
      remove: (name) => { this.className = this.className.split(" ").filter((item) => item !== name).join(" "); },
    };
  }
  append(...nodes) {
    for (const node of nodes) {
      if (node && typeof node === "object") node.parentNode = this;
      this.children.push(node);
    }
  }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(name, listener) { (this.listeners[name] ??= []).push(listener); }
  dispatch(name, event = { preventDefault() {} }) {
    let result;
    for (const listener of this.listeners[name] ?? []) result = listener(event);
    return result;
  }
  click() { return this.dispatch("click", { target: this, preventDefault() {} }); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  focus() { this.focused = true; }
  closest(selector) {
    const tags = selector.split(",").map((item) => item.trim());
    return tags.includes(this.tag) ? this : this.parentNode?.closest?.(selector);
  }
}

const walk = (node, predicate, result = []) => {
  if (node === undefined || node === null) return result;
  if (predicate(node)) result.push(node);
  for (const child of node.children ?? []) walk(child, predicate, result);
  return result;
};
const byText = (root, text) => walk(root, (node) => node.textContent === text);
const byAttribute = (root, name, value) => walk(root, (node) => node.attributes?.[name] === value);
const statusRule = (rule_id, status, overrides = {}) => ({
  rule_id,
  status: { [status]: null },
  message: `${status} reason for ${rule_id}`,
  observed: [],
  expected: [],
  relevant_topic: [],
  related_neuron_ids: [],
  ...overrides,
});
const rules = [
  statusRule("DENDRITE-DATA-003", "Pass"),
  statusRule("DENDRITE-CONTROL-001", "Indeterminate"),
  statusRule("DENDRITE-KNOWN-002", "Fail", {
    observed: ["missing metadata"],
    expected: ["valid known_neuron_data"],
    relevant_topic: [4],
    related_neuron_ids: [18422777432977120264n],
  }),
  statusRule("DENDRITE-NM-001", "Warning"),
  statusRule("DENDRITE-DEFAULT-003", "StandardUpdateRequired"),
  statusRule("DENDRITE-KNOWN-001", "Pass"),
  statusRule("FUTURE-RULE-900", "Pass"),
];
const report = () => ({
  neuron_id: 42n,
  overall_status: { NonCompliant: null },
  standard_version: "nns-dendrite/1.0-draft",
  source_revision: "d55a0f4d4edfabe49d8fd543aff473084cb741f2",
  checked_at_timestamp_seconds: 100n,
  quorum_threshold: [3],
  target: [{
    known_neuron: [{ name: "Target", links: [] }],
    controller: [],
    hot_keys: [],
    not_for_profit: [false],
    dissolving: [false],
    dissolve_delay_seconds: [63115200n],
    effective_stake_e8s: [100000000n],
    voting_power_refreshed_timestamp_seconds: [90n],
  }],
  managers: [{ neuron_id: 9n, evidence_status: { Unavailable: null }, known_neuron: [], controller: [], hot_keys: [] }],
  committed_topics: [{ topic: 4, delegate_ids: [9n] }],
  non_committed_topics: [{ topic: 17, followee_ids: [2947465672511369n] }],
  controller: [],
  rules: rules.map((rule) => ({ ...rule })),
  source_failures: [{ method: "list_neurons", kind: { Rejected: null }, message: "unavailable", affected_neuron_ids: [9n] }],
});
const parityFixtures = JSON.parse(readFileSync(
  "canisters/dendrite/web/test/fixtures/evaluator.json",
  "utf8",
));
const decimalFields = new Set([
  "neuron_id", "checked_at_timestamp_seconds", "id", "dissolve_delay_seconds",
  "effective_stake_e8s", "minted_stake_e8s", "voting_power_refreshed_timestamp_seconds",
  "potential_voting_power", "deciding_voting_power",
]);
const decimalArrays = new Set([
  "related_neuron_ids", "affected_neuron_ids", "delegate_ids", "followee_ids",
  "neuron_management_followees",
]);
const optionFields = new Set([
  "target", "known_neuron", "controller", "not_for_profit", "dissolve_delay_seconds",
  "dissolving", "effective_stake_e8s", "voting_power_refreshed_timestamp_seconds",
  "potential_voting_power", "deciding_voting_power", "minted_stake_e8s", "module_hash",
  "observed", "expected", "relevant_topic", "quorum_threshold", "principal",
]);
const variantFields = new Set(["overall_status", "status", "evidence_status", "kind"]);
function reviveProjection(value, field) {
  if (value === null) return optionFields.has(field) ? [] : value;
  if (variantFields.has(field)) return { [value]: null };
  if (decimalFields.has(field)) {
    const revived = BigInt(value);
    return optionFields.has(field) ? [revived] : revived;
  }
  if (decimalArrays.has(field)) return value.map(BigInt);
  if (Array.isArray(value)) return value.map((item) => reviveProjection(item));
  if (typeof value === "object") {
    const revived = Object.fromEntries(Object.entries(value)
      .map(([name, item]) => [name, reviveProjection(item, name)]));
    return optionFields.has(field) ? [revived] : revived;
  }
  return optionFields.has(field) ? [value] : value;
}
const fullyCompliantReport = () => reviveProjection(
  parityFixtures.find((fixture) => fixture.name === "fully_compliant").projection,
);
const cssSource = readFileSync("canisters/dendrite/web/src/styles.css", "utf8");
const hexToken = (name) => cssSource.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))[1];
const luminance = (hex) => {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
};
const contrast = (left, right) => {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};

function render(verificationKind = "Consensus", options = {}) {
  const prior = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeNode(tag) };
  const root = new FakeNode("main");
  try {
    renderReport(root, { report: report(), verificationKind }, options);
    return root;
  } finally {
    globalThis.document = prior;
  }
}

test("policy status vocabulary has distinct visible text and decorative icons", () => {
  assert.deepEqual(
    ["Pass", "Fail", "Indeterminate", "Warning", "StandardUpdateRequired"]
      .map((status) => statusPresentation(status).label),
    ["Pass", "Fail", "Indeterminate", "Warning", "Standard update required"],
  );
  const root = render();
  for (const [label, icon] of [
    ["Pass", "✓"], ["Fail", "×"], ["Indeterminate", "?"],
    ["Warning", "!"], ["Standard update required", "↻"],
  ]) {
    assert.ok(byText(root, label).length, label);
    const icons = byText(root, icon);
    assert.ok(icons.length, icon);
    assert.ok(icons.every((node) => node.attributes["aria-hidden"] === "true"));
  }
});

test("visual tokens meet text, icon, control, and focus contrast requirements", () => {
  const canvas = hexToken("canvas"), surface = hexToken("surface");
  for (const name of ["text", "text-muted", "accent", "pass", "fail", "warning", "indeterminate"]) {
    assert(contrast(hexToken(name), name === "text" ? canvas : surface) >= 4.5, name);
  }
  for (const name of ["divider-strong", "accent", "pass", "fail", "warning", "indeterminate", "focus"]) {
    assert(contrast(hexToken(name), surface) >= 3, name);
  }
  assert.match(cssSource, /prefers-reduced-motion/);
  assert.match(cssSource, /forced-colors:\s*active/);
});

test("rules render once in canonical order with a safe future-rule fallback", () => {
  const root = render();
  const headings = walk(root, (node) => node.tag === "h4" && (
    Object.values(Object.fromEntries(rules.map((rule) => [rule.rule_id, ruleTitle(rule.rule_id)]))).includes(node.textContent)
  )).map((node) => node.textContent);
  assert.deepEqual(headings, canonicalRules(rules).map((rule) => ruleTitle(rule.rule_id)));
  for (const rule of rules) assert.equal(headings.filter((title) => title === ruleTitle(rule.rule_id)).length, 1);
  assert.equal(ruleTitle("FUTURE-RULE-900"), "Technical check: FUTURE-RULE-900");
  assert.match(ruleDescription("FUTURE-RULE-900"), /not yet described/);
});

test("aggregation severity is documented and preserves every report entry", () => {
  assert.deepEqual(AGGREGATE_SEVERITY, {
    Fail: 0,
    StandardUpdateRequired: 1,
    Indeterminate: 2,
    Warning: 3,
    Pass: 4,
  });
  for (const [other, expected] of [
    ["Fail", "Fail"],
    ["Warning", "Warning"],
    ["Indeterminate", "Indeterminate"],
    ["StandardUpdateRequired", "StandardUpdateRequired"],
  ]) {
    const entries = [statusRule("FUTURE-RULE-900", "Pass"), statusRule("FUTURE-RULE-900", other)];
    const [aggregate] = aggregateRules(entries);
    assert.equal(Object.keys(aggregate.status)[0], expected);
    assert.deepEqual(new Set(aggregate.entries), new Set(entries));
  }
});

test("fully compliant parity report renders 29 rules from all 43 policy evaluations", () => {
  const source = fullyCompliantReport();
  assert.equal(source.rules.length, 43);
  const aggregates = aggregateRules(source.rules);
  assert.equal(aggregates.length, 29);
  const defaultRule = aggregates.find((rule) => rule.rule_id === "DENDRITE-DEFAULT-001");
  assert.equal(defaultRule.entries.length, 15);
  assert.equal(aggregateSummary(defaultRule, "Consensus"), "Pass · 15 of 15 topics pass");

  const prior = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeNode(tag) };
  const root = new FakeNode("main");
  try { renderReport(root, { report: source, verificationKind: "Consensus" }); } finally { globalThis.document = prior; }
  assert.equal(walk(root, (node) => node.className?.includes?.("rule-summary-row")).length, 29);
  assert.equal(byText(root, "Uncommitted topic follows alpha-vote").length, 1);
  assert.ok(byText(root, "15 topic evaluations").length);
  const toggle = byAttribute(root, "aria-label", "Show details for Uncommitted topic follows alpha-vote")[0];
  const detail = walk(root, (node) => node.id === toggle.attributes["aria-controls"])[0];
  toggle.click();
  assert.equal(walk(detail, (node) => node.tag === "tbody")[0].children.length, 15);
  assert.equal(source.rules.length, 43);
  assert.ok(byText(root, "29 Standard rules · 43 policy evaluations").length);
});

test("mixed aggregates expose precedence, safe future IDs, and verification terminology", () => {
  const preliminary = aggregateRules([
    statusRule("DENDRITE-CONTROL-001", "Pass"),
    statusRule("DENDRITE-CONTROL-001", "Indeterminate"),
  ])[0];
  assert.match(aggregateSummary(preliminary, "Preliminary"), /^Requires verification/);
  const future = aggregateRules([
    statusRule("FUTURE-RULE-901", "Pass", { relevant_topic: [4] }),
    statusRule("FUTURE-RULE-901", "StandardUpdateRequired", { relevant_topic: [99] }),
  ])[0];
  assert.equal(Object.keys(future.status)[0], "StandardUpdateRequired");
  assert.equal(future.title, "Technical check: FUTURE-RULE-901");
  assert.match(aggregateSummary(future, "Consensus"), /^Standard update required/);
});

test("rule table has labelled columns, quiet chevrons, and no nested detail disclosure", async () => {
  let copied;
  const root = render("Consensus", { copyText: (value) => { copied = value; } });
  const toggle = byAttribute(root, "aria-label", "Show details for Target is a known neuron")[0];
  assert.equal(toggle.tag, "button");
  assert.equal(toggle.type, "button");
  assert.equal(toggle.attributes["aria-expanded"], "false");
  const detail = walk(root, (node) => node.id === toggle.attributes["aria-controls"])[0];
  assert.equal(detail.hidden, true);
  assert.equal(walk(root, (node) => node.tag === "table" && node.className === "rule-table").length, 6);
  for (const heading of ["Rule", "Result"]) assert.ok(byText(root, heading).length);
  assert.ok(byAttribute(root, "aria-label", "Details").length);
  assert.equal(byText(root, "+").length + byText(root, "−").length, 0);
  assert.ok(walk(toggle, (node) => node.className === "chevron").length);
  toggle.click();
  assert.equal(toggle.attributes["aria-expanded"], "true");
  assert.equal(detail.hidden, false);
  assert.equal(walk(detail, (node) => node.tag === "details").length, 0);
  assert.equal(byAttribute(detail, "role", "region").length, 0);
  assert.ok(byText(detail, "missing metadata").length);
  assert.ok(byText(detail, "valid known_neuron_data").length);
  assert.ok(byText(detail, "4 — Governance").length);
  const link = byAttribute(detail, "aria-label", "Open Dendrite report for neuron 18422777432977120264")[0];
  assert.equal(link.href, "#/neuron/18422777432977120264");
  await byAttribute(detail, "aria-label", "Copy neuron ID: 18422777432977120264")[0].click();
  assert.equal(copied, "18422777432977120264");
  toggle.click();
  assert.equal(toggle.attributes["aria-expanded"], "false");
});

test("complete summary row toggles except for controls and text selection", () => {
  const root = render();
  const toggle = byAttribute(root, "aria-label", "Show details for Target is a known neuron")[0];
  const row = walk(root, (node) => node.attributes?.["data-rule-id"] === "DENDRITE-KNOWN-002")[0];
  const nestedCopy = byAttribute(row.parentNode, "aria-label", "Copy neuron ID: 18422777432977120264")[0];
  row.dispatch("click", { target: nestedCopy });
  assert.equal(toggle.attributes["aria-expanded"], "false");
  const priorSelection = globalThis.getSelection;
  globalThis.getSelection = () => ({ toString: () => "selected text" });
  row.dispatch("click", { target: row });
  assert.equal(toggle.attributes["aria-expanded"], "false");
  globalThis.getSelection = () => ({ toString: () => "" });
  row.dispatch("click", { target: row });
  assert.equal(toggle.attributes["aria-expanded"], "true");
  assert.equal(toggle.focused, true);
  row.dispatch("click", { target: row });
  assert.equal(toggle.attributes["aria-expanded"], "false");
  globalThis.getSelection = priorSelection;
});

test("one attention filter changes only transient presentation state", () => {
  const source = report();
  const snapshot = JSON.stringify(source, (_key, value) => typeof value === "bigint" ? value.toString() : value);
  const prior = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeNode(tag) };
  const root = new FakeNode("main");
  try { renderReport(root, { report: source, verificationKind: "Consensus" }); } finally { globalThis.document = prior; }
  const rows = walk(root, (node) => node.className?.includes?.("rule-summary-row"));
  const filter = walk(root, (node) => node.className === "button-quiet attention-filter")[0];
  assert.ok(filter);
  assert.equal(walk(root, (node) => node.className?.includes?.("attention-filter")).length, 1);
  for (const removed of ["All", "Needs attention", "Failed", "Passed", "Expand attention", "Collapse all"]) {
    assert.equal(byText(root, removed).length, 0);
  }
  filter.click();
  assert.equal(rows.filter((row) => !row.hidden).length, 4);
  const groups = walk(root, (node) => node.className === "rule-group");
  const knownGroup = groups.find((group) => byText(group, "Target and committed topics").length);
  assert.equal(knownGroup.hidden, false);
  assert.equal(groups.find((group) => byText(group, "Evidence integrity").length).hidden, true);
  filter.click();
  assert.equal(rows.filter((row) => !row.hidden).length, rules.length);
  assert.ok(groups.every((group) => !group.hidden));
  assert.equal(JSON.stringify(source, (_key, value) => typeof value === "bigint" ? value.toString() : value), snapshot);
});

test("preliminary controller uncertainty is verification-required and never pass or fail", () => {
  const root = render("Preliminary");
  const row = walk(root, (node) => node.attributes?.["data-rule-id"] === "DENDRITE-CONTROL-001")[0];
  assert.ok(byText(row, "Requires verification").length);
  assert.equal(byText(row, "Pass").length, 0);
  assert.equal(byText(row, "Fail").length, 0);
  assert.ok(byText(root, "Consensus verification is required before management actions.").length);
});

test("live and consensus provenance appears once without per-rule trust warnings", () => {
  const prior = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeNode(tag) };
  try {
    const live = new FakeNode("main");
    renderReport(live, {
      report: report(),
      verificationKind: "Preliminary",
      provenance: {
        controllerEvidence: {
          kind: "certified-system-state",
          canisterId: "aaaaa-aa",
          certificateTime: "2026-07-29T00:00:00.000Z",
        },
      },
    });
    const visibleText = (root) => walk(root, (node) => typeof node.textContent === "string")
      .map((node) => node.textContent).join("\n");
    const liveText = visibleText(live);
    assert.match(liveText, /Neuron data: replica-signed NNS Governance query/);
    assert.match(liveText, /Controller state: IC-certified/);
    assert.match(liveText, /Evaluation: browser/);
    assert.equal((liveText.match(/Controller state: IC-certified/g) ?? []).length, 1);
    assert.doesNotMatch(liveText, /Preliminary browser query; controller evidence requires consensus verification/);

    const consensus = new FakeNode("main");
    renderReport(consensus, { report: report(), verificationKind: "Consensus" });
    assert.match(visibleText(consensus), /replicated Dendrite verification/);
  } finally {
    globalThis.document = prior;
  }
});

test("header action hierarchy and flat section structure are accessible", () => {
  const preliminary = render("Preliminary", {
    onRefreshPreliminary() {},
    onVerifyConsensus() {},
  });
  assert.equal(walk(preliminary, (node) => node.className?.includes?.("button-primary")).length, 1);
  assert.ok(byText(preliminary, "Verify on-chain")[0].className.includes("button-primary"));
  assert.ok(byText(preliminary, "Refresh live analysis")[0].className.includes("button-quiet"));
  assert.equal(walk(preliminary, (node) => node.className === "section-navigation").length, 0);
  const consensus = render("Consensus", { onVerifyConsensus() {} });
  assert.equal(walk(consensus, (node) => node.className?.includes?.("button-primary")).length, 0);

  const root = render();
  const sectionIds = walk(root, (node) => ["overview", "rules", "characteristics", "managers", "delegation", "evidence"].includes(node.id))
    .map((node) => node.id);
  assert.deepEqual(sectionIds, ["overview", "characteristics", "rules", "managers", "delegation", "evidence"]);
  assert.ok(byText(root, "Key characteristics").length);
  assert.equal(walk(root, (node) => node.className === "metrics")[0].children.length, 9);
  const sectionToggle = walk(root, (node) =>
    node.className === "section-title" && node.textContent === "Managers")[0].parentNode;
  assert.equal(sectionToggle.attributes["aria-expanded"], "false");
  sectionToggle.click();
  assert.equal(sectionToggle.attributes["aria-expanded"], "true");
  assert.equal(walk(root, (node) => node.id === "evidence")[0].tag, "section");
  assert.equal(walk(root, (node) => node.id === "evidence")[0].parentNode?.tag === "details", false);
  assert.equal(walk(walk(root, (node) => node.id === "evidence")[0], (node) => node.tag === "details").length, 6);

  const empty = report();
  empty.managers = [];
  empty.committed_topics = [];
  empty.non_committed_topics = [];
  const prior = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeNode(tag) };
  const emptyRoot = new FakeNode("main");
  try { renderReport(emptyRoot, empty); } finally { globalThis.document = prior; }
  assert.ok(byText(emptyRoot, "No manager evidence is available in this report.").length);
  assert.ok(byText(emptyRoot, "No topic delegation evidence is present in this report.").length);
});
