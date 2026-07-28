import test from "node:test";
import assert from "node:assert/strict";
import {
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
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(name, listener) { (this.listeners[name] ??= []).push(listener); }
  dispatch(name, event = { preventDefault() {} }) {
    let result;
    for (const listener of this.listeners[name] ?? []) result = listener(event);
    return result;
  }
  click() { return this.dispatch("click"); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
}

const walk = (node, predicate, result = []) => {
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

test("rule disclosure exposes policy evidence, topic, Dendrite link, and copy control", () => {
  let copied;
  const root = render("Consensus", { copyText: (value) => { copied = value; } });
  const toggle = byAttribute(root, "aria-label", "Show details for Target is a known neuron")[0];
  assert.equal(toggle.tag, "button");
  assert.equal(toggle.attributes["aria-expanded"], "false");
  const region = byAttribute(root, "aria-label", "Target is a known neuron details")[0];
  assert.equal(region.hidden, true);
  toggle.click();
  assert.equal(toggle.attributes["aria-expanded"], "true");
  assert.equal(region.hidden, false);
  assert.ok(byText(region, "missing metadata").length);
  assert.ok(byText(region, "valid known_neuron_data").length);
  assert.ok(byText(region, "4 — Governance").length);
  const link = byAttribute(region, "aria-label", "Open Dendrite report for neuron 18422777432977120264")[0];
  assert.equal(link.href, "#/neuron/18422777432977120264");
  byAttribute(region, "aria-label", "Copy 18422777432977120264")[0].click();
  assert.equal(copied, "18422777432977120264");
  toggle.click();
  assert.equal(toggle.attributes["aria-expanded"], "false");
});

test("filters and bulk disclosures change only transient presentation state", () => {
  const source = report();
  const snapshot = JSON.stringify(source, (_key, value) => typeof value === "bigint" ? value.toString() : value);
  const prior = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeNode(tag) };
  const root = new FakeNode("main");
  try { renderReport(root, { report: source, verificationKind: "Consensus" }); } finally { globalThis.document = prior; }
  const rows = walk(root, (node) => node.className?.includes?.("rule-row "));
  byText(root, "Needs attention")[0].click();
  assert.equal(rows.filter((row) => !row.hidden).length, 4);
  byText(root, "Failed")[0].click();
  assert.equal(rows.filter((row) => !row.hidden).length, 1);
  byText(root, "Passed")[0].click();
  assert.equal(rows.filter((row) => !row.hidden).length, 3);
  byText(root, "All")[0].click();
  assert.equal(rows.filter((row) => !row.hidden).length, rules.length);
  byText(root, "Expand attention")[0].click();
  assert.equal(byAttribute(root, "aria-expanded", "true").filter((node) => node.className === "rule-toggle").length, 4);
  byText(root, "Collapse all")[0].click();
  assert.equal(byAttribute(root, "aria-expanded", "true").filter((node) => node.className === "rule-toggle").length, 0);
  assert.equal(JSON.stringify(source, (_key, value) => typeof value === "bigint" ? value.toString() : value), snapshot);
});

test("preliminary controller uncertainty is verification-required and never pass or fail", () => {
  const root = render("Preliminary");
  const controllerRegion = byAttribute(root, "aria-label", "Controller canister is inspectable details")[0];
  const row = walk(root, (node) => node.children?.includes?.(controllerRegion))[0];
  assert.ok(byText(row, "Requires verification").length);
  assert.equal(byText(row, "Pass").length, 0);
  assert.equal(byText(row, "Fail").length, 0);
  assert.ok(byText(root, "Preliminary public evidence is not a compliant verdict. Controller blackhole rules require a current consensus verification.").length);
});

test("section order, useful summaries, empty states, navigation, and disclosures are accessible", () => {
  const root = render();
  const sectionIds = walk(root, (node) => ["overview", "rules", "characteristics", "managers", "delegation", "evidence"].includes(node.id))
    .map((node) => node.id);
  assert.deepEqual(sectionIds, ["overview", "rules", "characteristics", "managers", "delegation", "evidence"]);
  for (const href of ["#overview", "#rules", "#characteristics", "#managers", "#delegation", "#evidence"]) {
    assert.equal(walk(root, (node) => node.href === href).length, 1);
  }
  assert.ok(byText(root, "Key characteristics — 9 metrics").length);
  assert.ok(byText(root, "Managers — 1 listed, evidence unavailable").length);
  assert.ok(byText(root, "Topic delegation — 2 configurations across 2 topics").length);
  assert.ok(byText(root, "Technical evidence — report, sources and raw values · 1 source failures").length);
  const sectionToggle = byText(root, "Managers — 1 listed, evidence unavailable")[0];
  assert.equal(sectionToggle.attributes["aria-expanded"], "false");
  sectionToggle.click();
  assert.equal(sectionToggle.attributes["aria-expanded"], "true");

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
