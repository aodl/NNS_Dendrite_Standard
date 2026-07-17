#![forbid(unsafe_code)]

use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub const STANDARD_VERSION: &str = "nns-dendrite/1.0-draft";
pub const SOURCE_REVISION: &str = "d55a0f4d4edfabe49d8fd543aff473084cb741f2";
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
    pub unknown_committed_topics: usize,
    pub requested_neuron_ids: Vec<u64>,
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

pub const RECOGNISED_TOPICS: [i32; 18] =
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18];
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
        let mut missing = rule(
            now,
            "DENDRITE-KNOWN-001",
            false,
            "target neuron was not returned",
        );
        if !evidence.source_errors.is_empty() {
            missing.status = RuleStatus::Indeterminate;
            missing.summary = "target existence could not be established".into();
        }
        out.push(missing);
        let mut complete = rule(
            now,
            "DENDRITE-DATA-001",
            false,
            "complete dependency graph was not obtained",
        );
        complete.status = RuleStatus::Indeterminate;
        out.push(complete);
        out.push(rule(
            now,
            "DENDRITE-DATA-002",
            !source_revision.is_empty(),
            "timestamped fixed-source provenance is present",
        ));
        let mut inferred = rule(
            now,
            "DENDRITE-DATA-003",
            false,
            "missing evidence was not inferred as passing",
        );
        inferred.status = RuleStatus::Indeterminate;
        out.push(inferred);
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
    let committed_ok = evidence.unknown_committed_topics == 0
        && !target.committed_topics.is_empty()
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
    if evidence.unknown_committed_topics > 0
        && let Some(last) = out.last_mut()
    {
        last.status = RuleStatus::StandardUpdateRequired;
        last.observed = Some(format!(
            "{} unknown committed-topic variant(s)",
            evidence.unknown_committed_topics
        ));
    }
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
                .all(|id| evidence.dependencies.contains_key(id))
            && evidence
                .requested_neuron_ids
                .iter()
                .all(|id| evidence.dependencies.contains_key(id) || *id == neuron_id),
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
    let source_failed = |method: &str| {
        evidence
            .source_errors
            .iter()
            .any(|error| error.contains(method))
    };
    let missing_requested = evidence
        .requested_neuron_ids
        .iter()
        .any(|id| *id != neuron_id && !evidence.dependencies.contains_key(id));
    for result in &mut out {
        let unavailable = match result.rule_id.as_str() {
            "DENDRITE-KNOWN-002" | "DENDRITE-NM-004" | "DENDRITE-NM-005" => {
                source_failed("list_known_neurons")
            }
            "DENDRITE-LOCK-001" => target.dissolving.is_none(),
            "DENDRITE-LOCK-002" => target.dissolve_delay_seconds.is_none(),
            "DENDRITE-LOCK-003" => target.effective_stake_e8s.is_none(),
            "DENDRITE-ACTIVE-001" => {
                target.voting_power_refreshed_timestamp_seconds.is_none()
                    || evidence.start_reducing_voting_power_after_seconds.is_none()
            }
            "DENDRITE-ACTIVE-002" => {
                target.potential_voting_power.is_none() || target.deciding_voting_power.is_none()
            }
            "DENDRITE-CONTROL-001" | "DENDRITE-CONTROL-002" | "DENDRITE-CONTROL-003" => {
                target.controller.is_some()
                    && evidence
                        .controller
                        .as_ref()
                        .is_none_or(|value| !value.call_succeeded)
            }
            "DENDRITE-CONTROL-005" => target.not_for_profit.is_none(),
            "DENDRITE-COMMIT-004" => missing_requested,
            "DENDRITE-DATA-001" | "DENDRITE-DATA-003" => {
                !evidence.source_errors.is_empty() || missing_requested
            }
            _ => false,
        };
        if unavailable && result.status == RuleStatus::Fail {
            result.status = RuleStatus::Indeterminate;
            result.summary = format!("{}; mandatory evidence was unavailable", result.summary);
        }
    }
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
    h.update(STANDARD_VERSION.as_bytes());
    h.update(ALPHA_VOTE_NEURON_ID.to_be_bytes());
    h.update(OMEGA_REJECT_NEURON_ID.to_be_bytes());
    h.update(MAX_DISSOLVE_DELAY_SECONDS.to_be_bytes());
    h.update(SIX_NOMINAL_MONTHS_SECONDS.to_be_bytes());
    h.update(revision.as_bytes());
    h.update(serde_json::to_vec(evidence).expect("bounded evidence serializes"));
    h.update(serde_json::to_vec(&rules).expect("bounded rule output serializes"));
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
    fn compliant_evidence() -> EvaluationEvidence {
        let managers = vec![100, 101, 102, 103, 104];
        let mut followees = BTreeMap::new();
        followees.insert(1, managers.clone());
        followees.insert(4, vec![100, 101, 102]);
        for topic in RECOGNISED_TOPICS {
            if topic != 1 && topic != 4 {
                followees.insert(topic, vec![ALPHA_VOTE_NEURON_ID]);
            }
        }
        let target = NeuronEvidence {
            id: 42,
            controller: Some(Principal::from_slice(&[1])),
            known_data: Some(KnownNeuron {
                id: 42,
                name: "Dendrite".into(),
            }),
            hot_keys: vec![],
            not_for_profit: Some(false),
            dissolve_delay_seconds: Some(MAX_DISSOLVE_DELAY_SECONDS),
            dissolving: Some(false),
            effective_stake_e8s: Some(100_000_000),
            voting_power_refreshed_timestamp_seconds: Some(999_999),
            potential_voting_power: Some(10),
            deciding_voting_power: Some(10),
            committed_topics: vec![4],
            followees,
        };
        let mut dependencies = BTreeMap::new();
        for id in managers
            .iter()
            .chain([&ALPHA_VOTE_NEURON_ID, &OMEGA_REJECT_NEURON_ID])
        {
            let mut manager_followees = BTreeMap::new();
            if managers[..3].contains(id) {
                manager_followees.insert(4, vec![OMEGA_REJECT_NEURON_ID]);
            }
            dependencies.insert(
                *id,
                NeuronEvidence {
                    id: *id,
                    controller: None,
                    known_data: Some(KnownNeuron {
                        id: *id,
                        name: format!("known-{id}"),
                    }),
                    hot_keys: vec![],
                    not_for_profit: Some(false),
                    dissolve_delay_seconds: Some(MAX_DISSOLVE_DELAY_SECONDS),
                    dissolving: Some(false),
                    effective_stake_e8s: Some(1),
                    voting_power_refreshed_timestamp_seconds: Some(999_999),
                    potential_voting_power: Some(1),
                    deciding_voting_power: Some(1),
                    committed_topics: vec![],
                    followees: manager_followees,
                },
            );
        }
        let known_neurons = std::iter::once((
            42,
            KnownNeuron {
                id: 42,
                name: "Dendrite".into(),
            },
        ))
        .chain(dependencies.keys().map(|id| {
            (
                *id,
                KnownNeuron {
                    id: *id,
                    name: format!("known-{id}"),
                },
            )
        }))
        .collect();
        EvaluationEvidence {
            now_seconds: 1_000_000,
            target: Some(target),
            dependencies,
            known_neurons,
            controller: Some(ControllerEvidence {
                call_succeeded: true,
                module_hash: None,
                controllers: vec![],
            }),
            start_reducing_voting_power_after_seconds: Some(SIX_NOMINAL_MONTHS_SECONDS),
            source_errors: vec![],
            unknown_committed_topics: 0,
            requested_neuron_ids: managers
                .into_iter()
                .chain([ALPHA_VOTE_NEURON_ID, OMEGA_REJECT_NEURON_ID])
                .collect(),
        }
    }
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
    #[test]
    fn fully_compliant_fixture_passes_every_mandatory_rule() {
        let snapshot = evaluate(42, &compliant_evidence(), SOURCE_REVISION);
        assert_eq!(snapshot.overall_status, ComplianceStatus::Compliant);
        assert!(
            snapshot
                .rules
                .iter()
                .all(|rule| rule.status == RuleStatus::Pass)
        );
        assert_eq!(snapshot.quorum_threshold, Some(3));
    }
    #[test]
    fn transport_missing_target_is_indeterminate_not_factual_failure() {
        let mut evidence = compliant_evidence();
        evidence.target = None;
        evidence.source_errors.push("list_neurons rejected".into());
        let snapshot = evaluate(42, &evidence, SOURCE_REVISION);
        assert_eq!(snapshot.overall_status, ComplianceStatus::Indeterminate);
        assert_eq!(snapshot.rules[0].status, RuleStatus::Indeterminate);
    }
    #[test]
    fn rejected_controller_call_is_indeterminate_not_blackhole_failure() {
        let mut evidence = compliant_evidence();
        evidence.controller = Some(ControllerEvidence {
            call_succeeded: false,
            module_hash: None,
            controllers: vec![],
        });
        evidence
            .source_errors
            .push("aaaaa-aa canister_info: rejected".into());
        let snapshot = evaluate(42, &evidence, SOURCE_REVISION);
        assert_eq!(snapshot.overall_status, ComplianceStatus::Indeterminate);
        for id in [
            "DENDRITE-CONTROL-001",
            "DENDRITE-CONTROL-002",
            "DENDRITE-CONTROL-003",
        ] {
            assert!(
                snapshot
                    .rules
                    .iter()
                    .any(|rule| rule.rule_id == id && rule.status == RuleStatus::Indeterminate)
            );
        }
    }
    #[test]
    fn incomplete_dependency_response_is_indeterminate() {
        let mut evidence = compliant_evidence();
        evidence.dependencies.remove(&100);
        evidence
            .source_errors
            .push("list_neurons response omitted requested neuron 100".into());
        let snapshot = evaluate(42, &evidence, SOURCE_REVISION);
        assert_eq!(snapshot.overall_status, ComplianceStatus::Indeterminate);
        assert!(
            snapshot
                .rules
                .iter()
                .any(|rule| rule.rule_id == "DENDRITE-DATA-001"
                    && rule.status == RuleStatus::Indeterminate)
        );
    }
    #[test]
    fn unknown_committed_variant_requires_standard_update() {
        let mut evidence = compliant_evidence();
        evidence.unknown_committed_topics = 1;
        let snapshot = evaluate(42, &evidence, SOURCE_REVISION);
        assert_eq!(
            snapshot.overall_status,
            ComplianceStatus::StandardUpdateRequired
        );
    }
    #[test]
    fn duplicate_managers_and_extra_omega_followee_fail_focused_rules() {
        let mut evidence = compliant_evidence();
        evidence
            .target
            .as_mut()
            .unwrap()
            .followees
            .get_mut(&1)
            .unwrap()[4] = 100;
        evidence
            .dependencies
            .get_mut(&100)
            .unwrap()
            .followees
            .get_mut(&4)
            .unwrap()
            .push(7);
        let snapshot = evaluate(42, &evidence, SOURCE_REVISION);
        assert!(
            snapshot
                .rules
                .iter()
                .any(|r| r.rule_id == "DENDRITE-NM-002" && r.status == RuleStatus::Fail)
        );
        assert!(
            snapshot
                .rules
                .iter()
                .any(|r| r.rule_id == "DENDRITE-COMMIT-004" && r.status == RuleStatus::Fail)
        );
    }
    #[test]
    fn digest_covers_evidence_order_and_revision() {
        let evidence = compliant_evidence();
        let digest = evaluate(42, &evidence, SOURCE_REVISION).evidence_digest;
        let mut reordered = evidence.clone();
        reordered.dependencies = reordered.dependencies.into_iter().rev().collect();
        assert_eq!(
            digest,
            evaluate(42, &reordered, SOURCE_REVISION).evidence_digest
        );
        let mut changed = evidence.clone();
        changed
            .dependencies
            .get_mut(&100)
            .unwrap()
            .effective_stake_e8s = Some(2);
        assert_ne!(
            digest,
            evaluate(42, &changed, SOURCE_REVISION).evidence_digest
        );
        assert_ne!(digest, evaluate(42, &evidence, "different").evidence_digest);
    }
}
