#![forbid(unsafe_code)]

use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub const STANDARD_VERSION: &str = "nns-dendrite/1.0-draft";
pub const ALPHA_VOTE_NEURON_ID: u64 = 2_947_465_672_511_369;
pub const OMEGA_REJECT_NEURON_ID: u64 = 18_422_777_432_977_120_264;
pub const MAX_DISSOLVE_DELAY_SECONDS: u64 = 63_072_000;
pub const SIX_NOMINAL_MONTHS_SECONDS: u64 = 15_768_000;
pub const MAX_CACHED_SNAPSHOTS: usize = 256;

#[derive(
    Clone, Copy, Debug, Eq, PartialEq, Ord, PartialOrd, CandidType, Deserialize, Serialize,
)]
pub enum RuleStatus {
    Pass,
    Fail,
    Warning,
    Indeterminate,
    StandardUpdateRequired,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub enum ComplianceStatus {
    Compliant,
    NonCompliant,
    Indeterminate,
    StandardUpdateRequired,
}

#[derive(Clone, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub struct EvidenceSource {
    pub method: String,
    pub observed_at_seconds: u64,
}

#[derive(Clone, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub struct RuleResult {
    pub rule_id: String,
    pub status: RuleStatus,
    pub summary: String,
    pub observed: Option<String>,
    pub expected: Option<String>,
    pub related_neuron_ids: Vec<u64>,
    pub source: EvidenceSource,
}

#[derive(Clone, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub struct KnownNeuron {
    pub id: u64,
    pub name: String,
}

#[derive(Clone, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub struct NeuronEvidence {
    pub id: u64,
    pub controller: Option<Principal>,
    pub known_data: Option<KnownNeuron>,
    pub hot_keys: Vec<Principal>,
    pub not_for_profit: Option<bool>,
    pub dissolve_delay_seconds: Option<u64>,
    pub dissolving: Option<bool>,
    pub effective_stake_e8s: Option<u64>,
    pub voting_power_refreshed_timestamp_seconds: Option<u64>,
    pub potential_voting_power: Option<u64>,
    pub deciding_voting_power: Option<u64>,
    pub committed_topics: Vec<i32>,
    pub followees: BTreeMap<i32, Vec<u64>>,
}

#[derive(Clone, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub struct ControllerEvidence {
    pub call_succeeded: bool,
    pub module_hash: Option<Vec<u8>>,
    pub controllers: Vec<Principal>,
}

#[derive(Clone, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub struct EvaluationEvidence {
    pub now_seconds: u64,
    pub target: Option<NeuronEvidence>,
    pub dependencies: BTreeMap<u64, NeuronEvidence>,
    pub known_neurons: BTreeMap<u64, KnownNeuron>,
    pub controller: Option<ControllerEvidence>,
    pub start_reducing_voting_power_after_seconds: Option<u64>,
    pub source_errors: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub struct ComplianceSnapshot {
    pub schema_version: u16,
    pub standard_version: String,
    pub neuron_id: u64,
    pub checked_at_timestamp_seconds: u64,
    pub overall_status: ComplianceStatus,
    pub stale_after_timestamp_seconds: u64,
    pub rules: Vec<RuleResult>,
    pub manager_ids: Vec<u64>,
    pub committed_topics: Vec<i32>,
    pub quorum_threshold: Option<u8>,
    pub source_revision: String,
    pub source_errors: Vec<String>,
    pub evidence_digest: Vec<u8>,
}

pub const RECOGNISED_TOPICS: [i32; 19] = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
];
pub fn is_concrete_topic(topic: i32) -> bool {
    RECOGNISED_TOPICS.contains(&topic) && topic != 0 && topic != 1
}

fn source(now: u64) -> EvidenceSource {
    EvidenceSource {
        method: "live bounded evidence graph".into(),
        observed_at_seconds: now,
    }
}
fn rule(now: u64, id: &str, ok: bool, summary: &str) -> RuleResult {
    RuleResult {
        rule_id: id.into(),
        status: if ok {
            RuleStatus::Pass
        } else {
            RuleStatus::Fail
        },
        summary: summary.into(),
        observed: None,
        expected: None,
        related_neuron_ids: vec![],
        source: source(now),
    }
}
fn distinct(xs: &[u64]) -> bool {
    xs.iter().copied().collect::<BTreeSet<_>>().len() == xs.len()
}
fn singleton(xs: Option<&Vec<u64>>, expected: u64) -> bool {
    xs.is_some_and(|x| x.as_slice() == [expected])
}

pub fn parse_canonical_neuron_id(value: &str) -> Result<u64, &'static str> {
    if value.is_empty() || !value.bytes().all(|b| b.is_ascii_digit()) {
        return Err("ID must contain decimal digits only");
    }
    if value.starts_with('0') {
        return Err("ID must be non-zero without leading zeroes");
    }
    value.parse::<u64>().map_err(|_| "ID exceeds u64")
}

pub fn evaluate(
    neuron_id: u64,
    evidence: &EvaluationEvidence,
    source_revision: &str,
) -> ComplianceSnapshot {
    let now = evidence.now_seconds;
    let mut out = Vec::new();
    let Some(target) = evidence.target.as_ref() else {
        out.push(rule(
            now,
            "DENDRITE-KNOWN-001",
            false,
            "target neuron was not returned",
        ));
        return finish(
            neuron_id,
            evidence,
            source_revision,
            vec![],
            vec![],
            None,
            out,
        );
    };
    out.push(rule(now, "DENDRITE-KNOWN-001", true, "target exists"));
    out.push(rule(
        now,
        "DENDRITE-KNOWN-002",
        target.known_data.is_some() && evidence.known_neurons.contains_key(&neuron_id),
        "target is a current known neuron",
    ));
    out.push(rule(
        now,
        "DENDRITE-KNOWN-003",
        !target.committed_topics.is_empty(),
        "committed topics are non-empty",
    ));
    let committed_ok = !target.committed_topics.is_empty()
        && target
            .committed_topics
            .iter()
            .all(|t| is_concrete_topic(*t))
        && target
            .committed_topics
            .iter()
            .copied()
            .collect::<BTreeSet<_>>()
            .len()
            == target.committed_topics.len();
    out.push(rule(
        now,
        "DENDRITE-KNOWN-004",
        committed_ok,
        "committed topics are recognised, concrete, and distinct",
    ));
    out.push(rule(
        now,
        "DENDRITE-LOCK-001",
        target.dissolving == Some(false),
        "target is not dissolving",
    ));
    out.push(rule(
        now,
        "DENDRITE-LOCK-002",
        target.dissolve_delay_seconds == Some(MAX_DISSOLVE_DELAY_SECONDS),
        "target has the standard maximum dissolve delay",
    ));
    out.push(rule(
        now,
        "DENDRITE-LOCK-003",
        target.effective_stake_e8s.is_some_and(|v| v > 0),
        "effective stake is positive",
    ));
    let active = match (
        target.voting_power_refreshed_timestamp_seconds,
        evidence.start_reducing_voting_power_after_seconds,
    ) {
        (Some(ts), Some(limit)) => now >= ts && now - ts <= limit.min(SIX_NOMINAL_MONTHS_SECONDS),
        _ => false,
    };
    out.push(rule(
        now,
        "DENDRITE-ACTIVE-001",
        active,
        "voting power was refreshed within both limits",
    ));
    let powers = target
        .potential_voting_power
        .zip(target.deciding_voting_power)
        .is_some_and(|(p, d)| p > 0 && p == d);
    out.push(rule(
        now,
        "DENDRITE-ACTIVE-002",
        powers,
        "deciding and potential voting power match and are positive",
    ));
    let ce = evidence.controller.as_ref();
    out.push(rule(
        now,
        "DENDRITE-CONTROL-001",
        target.controller.is_some() && ce.is_some_and(|x| x.call_succeeded),
        "controller resolves through canister_info",
    ));
    out.push(rule(
        now,
        "DENDRITE-CONTROL-002",
        ce.is_some_and(|x| x.call_succeeded && x.module_hash.is_none()),
        "controller canister has no Wasm",
    ));
    out.push(rule(
        now,
        "DENDRITE-CONTROL-003",
        ce.is_some_and(|x| x.call_succeeded && x.controllers.is_empty()),
        "controller canister has no controllers",
    ));
    out.push(rule(
        now,
        "DENDRITE-CONTROL-004",
        target.hot_keys.is_empty(),
        "target has no hotkeys",
    ));
    out.push(rule(
        now,
        "DENDRITE-CONTROL-005",
        target.not_for_profit == Some(false),
        "not-for-profit exception is disabled",
    ));
    let managers = target.followees.get(&1).cloned().unwrap_or_default();
    out.push(rule(
        now,
        "DENDRITE-NM-001",
        (5..=15).contains(&managers.len()),
        "there are five to fifteen raw managers",
    ));
    out.push(rule(
        now,
        "DENDRITE-NM-002",
        distinct(&managers),
        "manager IDs are distinct",
    ));
    out.push(rule(
        now,
        "DENDRITE-NM-003",
        !managers.contains(&neuron_id),
        "target is not its own manager",
    ));
    out.push(rule(
        now,
        "DENDRITE-NM-004",
        managers
            .iter()
            .all(|id| evidence.known_neurons.contains_key(id)),
        "every manager is a current known neuron",
    ));
    out.push(rule(
        now,
        "DENDRITE-NM-005",
        evidence.known_neurons.contains_key(&ALPHA_VOTE_NEURON_ID)
            && evidence.known_neurons.contains_key(&OMEGA_REJECT_NEURON_ID),
        "alpha-vote and omega-reject remain known",
    ));
    for topic in target
        .committed_topics
        .iter()
        .copied()
        .collect::<BTreeSet<_>>()
    {
        let delegates = target.followees.get(&topic).cloned().unwrap_or_default();
        out.push(rule(
            now,
            "DENDRITE-COMMIT-001",
            delegates.len() >= 3,
            "committed topic has at least three delegates",
        ));
        out.push(rule(
            now,
            "DENDRITE-COMMIT-002",
            distinct(&delegates),
            "committed delegates are distinct",
        ));
        out.push(rule(
            now,
            "DENDRITE-COMMIT-003",
            delegates.iter().all(|id| managers.contains(id)),
            "committed delegates are managers only",
        ));
        out.push(rule(
            now,
            "DENDRITE-COMMIT-004",
            delegates.iter().all(|id| {
                evidence
                    .dependencies
                    .get(id)
                    .is_some_and(|n| singleton(n.followees.get(&topic), OMEGA_REJECT_NEURON_ID))
            }),
            "each delegate follows omega-reject exactly",
        ));
    }
    for topic in RECOGNISED_TOPICS {
        if topic != 0 && topic != 1 && !target.committed_topics.contains(&topic) {
            out.push(rule(
                now,
                "DENDRITE-DEFAULT-001",
                singleton(target.followees.get(&topic), ALPHA_VOTE_NEURON_ID),
                "non-committed topic follows alpha-vote exactly",
            ));
        }
    }
    out.push(rule(
        now,
        "DENDRITE-DEFAULT-002",
        singleton(target.followees.get(&0), ALPHA_VOTE_NEURON_ID),
        "CatchAll follows alpha-vote exactly",
    ));
    let unknown = target
        .followees
        .iter()
        .any(|(topic, ids)| !ids.is_empty() && !RECOGNISED_TOPICS.contains(topic));
    let mut unknown_rule = rule(
        now,
        "DENDRITE-DEFAULT-003",
        !unknown,
        "no unknown non-empty following topics",
    );
    if unknown {
        unknown_rule.status = RuleStatus::StandardUpdateRequired;
    }
    out.push(unknown_rule);
    let dependency_ids: BTreeSet<_> = managers
        .iter()
        .chain([&ALPHA_VOTE_NEURON_ID, &OMEGA_REJECT_NEURON_ID])
        .copied()
        .collect();
    out.push(rule(
        now,
        "DENDRITE-DATA-001",
        evidence.source_errors.is_empty()
            && dependency_ids
                .iter()
                .all(|id| evidence.dependencies.contains_key(id)),
        "complete dependency graph was obtained",
    ));
    out.push(rule(
        now,
        "DENDRITE-DATA-002",
        !source_revision.is_empty(),
        "timestamped fixed-source provenance is present",
    ));
    out.push(rule(
        now,
        "DENDRITE-DATA-003",
        evidence.source_errors.is_empty(),
        "no missing evidence was inferred as passing",
    ));
    let quorum = u8::try_from(managers.len() / 2 + 1).ok();
    finish(
        neuron_id,
        evidence,
        source_revision,
        managers,
        target.committed_topics.clone(),
        quorum,
        out,
    )
}

fn finish(
    neuron_id: u64,
    evidence: &EvaluationEvidence,
    revision: &str,
    managers: Vec<u64>,
    topics: Vec<i32>,
    quorum: Option<u8>,
    rules: Vec<RuleResult>,
) -> ComplianceSnapshot {
    let overall_status = if rules.iter().any(|r| r.status == RuleStatus::Fail) {
        ComplianceStatus::NonCompliant
    } else if rules
        .iter()
        .any(|r| r.status == RuleStatus::StandardUpdateRequired)
    {
        ComplianceStatus::StandardUpdateRequired
    } else if rules.iter().any(|r| r.status == RuleStatus::Indeterminate) {
        ComplianceStatus::Indeterminate
    } else {
        ComplianceStatus::Compliant
    };
    let mut h = Sha256::new();
    h.update(neuron_id.to_be_bytes());
    h.update(evidence.now_seconds.to_be_bytes());
    h.update(revision.as_bytes());
    for r in &rules {
        h.update(r.rule_id.as_bytes());
        h.update([r.status as u8]);
    }
    ComplianceSnapshot {
        schema_version: 1,
        standard_version: STANDARD_VERSION.into(),
        neuron_id,
        checked_at_timestamp_seconds: evidence.now_seconds,
        overall_status,
        stale_after_timestamp_seconds: evidence.now_seconds.saturating_add(300),
        rules,
        manager_ids: managers,
        committed_topics: topics,
        quorum_threshold: quorum,
        source_revision: revision.into(),
        source_errors: evidence
            .source_errors
            .iter()
            .take(32)
            .map(|s| s.chars().take(512).collect())
            .collect(),
        evidence_digest: h.finalize().to_vec(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn canonical_ids() {
        assert_eq!(
            parse_canonical_neuron_id("18422777432977120264"),
            Ok(OMEGA_REJECT_NEURON_ID)
        );
        for bad in [
            "",
            "0",
            "01",
            "+1",
            "-1",
            " 1",
            "1 ",
            "1.0",
            "1e2",
            "18446744073709551616",
        ] {
            assert!(parse_canonical_neuron_id(bad).is_err(), "{bad}");
        }
    }
    #[test]
    fn exact_singletons_and_distinctness() {
        assert!(singleton(
            Some(&vec![OMEGA_REJECT_NEURON_ID]),
            OMEGA_REJECT_NEURON_ID
        ));
        assert!(!singleton(
            Some(&vec![OMEGA_REJECT_NEURON_ID, 1]),
            OMEGA_REJECT_NEURON_ID
        ));
        assert!(!distinct(&[1, 1]));
    }
}
