import { clear, element, safeHttpsLink } from "./dom.js";

export const variantName = (value) => Object.keys(value ?? {})[0] ?? "Unknown";
export const hexDigest = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
export function errorMessage(error) {
  const kind = variantName(error);
  const value = error?.[kind];
  if (kind === "Cooldown" || kind === "GlobalRateLimit") return `${kind}: retry in ${value.retry_after_seconds} seconds.`;
  if (kind === "LowCycles") return "Live refresh is temporarily disabled to preserve canister cycles.";
  if (kind === "DuplicateInFlight") return "A refresh for this neuron is already running.";
  if (kind === "ConcurrencyLimit") return "The verifier is currently at its refresh concurrency limit.";
  return typeof value === "string" ? value : kind;
}
const row = (label, value) => { const tr = document.createElement("tr"); tr.append(element("th", label), element("td", value)); return tr; };
export function renderSnapshot(root, snapshot, nowSeconds = BigInt(Math.floor(Date.now() / 1000)), provenance = "Canister response") {
  clear(root);
  const stale = nowSeconds > snapshot.stale_after_timestamp_seconds;
  root.append(element("h1", `Neuron ${snapshot.neuron_id}`), element("p", `${variantName(snapshot.overall_status)}${stale ? " — STALE EVIDENCE" : " — fresh observation"}`, `status status-${variantName(snapshot.overall_status).toLowerCase()}`));
  const table = document.createElement("table"), caption = element("caption", "Compliance observation"); table.append(caption, row("Standard", snapshot.standard_version), row("Source revision", snapshot.source_revision), row("Checked at", new Date(Number(snapshot.checked_at_timestamp_seconds) * 1000).toISOString()), row("Evidence provenance", provenance), row("Evidence digest", hexDigest(snapshot.evidence_digest)), row("Managers", snapshot.manager_ids.join(", ") || "None"), row("Quorum", snapshot.quorum_threshold[0]?.toString() ?? "Unavailable"), row("Committed topics", snapshot.committed_topics.join(", ") || "None")); root.append(table);
  const summaryFields = snapshot.summary_fields?.[0] ?? [];
  if (summaryFields.length) { const summary = document.createElement("table"); summary.append(element("caption", "Normalized evidence summary")); for (const field of summaryFields) { if (field.label.startsWith("Known-neuron link ")) { const tr=document.createElement("tr"),cell=document.createElement("td"); tr.append(element("th",field.label),cell); try { cell.append(safeHttpsLink(field.value,field.value)); } catch { cell.textContent="Rejected unsafe URL"; } summary.append(tr); } else summary.append(row(field.label, field.value)); } root.append(summary); }
  const rules = document.createElement("table"); rules.append(element("caption", "Standard rule results")); const head = document.createElement("tr"); for (const name of ["Rule", "Status", "Summary", "Observed", "Expected", "Source"]) head.append(element("th", name)); rules.append(head);
  for (const rule of snapshot.rules) { const tr = document.createElement("tr"); const topic = rule.relevant_topic?.[0], related = rule.related_neuron_ids ?? []; const context = `${rule.source.method} @ ${rule.source.observed_at_seconds}${topic === undefined ? "" : `; topic ${topic}`}${related.length ? `; neurons ${related.join(", ")}` : ""}`; for (const value of [rule.rule_id, variantName(rule.status), rule.summary, rule.observed[0] ?? "—", rule.expected[0] ?? "—", context]) tr.append(element("td", value)); rules.append(tr); } root.append(rules);
  if (snapshot.source_errors.length) { root.append(element("h2", "Source errors")); const list = document.createElement("ul"); for (const value of snapshot.source_errors) list.append(element("li", value)); root.append(list); }
  const warnings = snapshot.warnings?.[0] ?? [];
  if (warnings.length) { root.append(element("h2", "Warnings")); const list = document.createElement("ul"); for (const value of warnings) list.append(element("li", value)); root.append(list); }
}
