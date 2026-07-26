#![forbid(unsafe_code)]

#[cfg(test)]
use candid::Principal;
#[cfg(test)]
use std::collections::BTreeMap;
use std::collections::BTreeSet;

mod model;
mod topics;
pub use model::*;
pub use topics::*;

pub const STANDARD_VERSION: &str = "nns-dendrite/1.0-draft";
pub const SOURCE_REVISION: &str = "d55a0f4d4edfabe49d8fd543aff473084cb741f2";
pub const ALPHA_VOTE_NEURON_ID: u64 = 2_947_465_672_511_369;
pub const OMEGA_REJECT_NEURON_ID: u64 = 18_422_777_432_977_120_264;
pub const ONE_DAY_SECONDS: u64 = 86_400;
pub const ONE_YEAR_SECONDS: u64 = (4 * 365 + 1) * ONE_DAY_SECONDS / 4;
pub const ONE_MONTH_SECONDS: u64 = ONE_YEAR_SECONDS / 12;
pub const MAX_DISSOLVE_DELAY_SECONDS: u64 = 2 * ONE_YEAR_SECONDS;
pub const SIX_NOMINAL_MONTHS_SECONDS: u64 = 6 * ONE_MONTH_SECONDS;
fn rule(_now: u64, id: &str, ok: bool, message: &str) -> RuleResult {
    RuleResult {
        rule_id: id.into(),
        status: if ok {
            RuleStatus::Pass
        } else {
            RuleStatus::Fail
        },
        message: message.into(),
        observed: None,
        expected: None,
        related_neuron_ids: vec![],
        relevant_topic: None,
    }
}
fn distinct(xs: &[u64]) -> bool {
    xs.iter().copied().collect::<BTreeSet<_>>().len() == xs.len()
}
fn singleton(xs: Option<&Vec<u64>>, expected: u64) -> bool {
    xs.is_some_and(|x| x.as_slice() == [expected])
}

fn lookup_known(lookup: Option<&NeuronLookup>) -> Option<&KnownNeuron> {
    match lookup {
        Some(NeuronLookup::Found(neuron)) => neuron.known_data.as_ref(),
        _ => None,
    }
}

fn dependent_rule(
    now: u64,
    id: &str,
    lookups: impl IntoIterator<Item = (u64, bool, bool)>,
    message: &str,
) -> RuleResult {
    let mut factual_failure = false;
    let mut unavailable = false;
    let mut related = Vec::new();
    for (neuron_id, satisfied, is_unavailable) in lookups {
        related.push(neuron_id);
        factual_failure |= !satisfied && !is_unavailable;
        unavailable |= is_unavailable;
    }
    let mut result = rule(now, id, !factual_failure && !unavailable, message);
    result.related_neuron_ids = related;
    if !factual_failure && unavailable {
        result.status = RuleStatus::Indeterminate;
        result.message = format!("{message}; required neuron evidence was unavailable");
    }
    result
}

fn provenance_complete(evidence: &EvaluationEvidence, source_revision: &str) -> bool {
    evidence.now_seconds > 0 && !source_revision.is_empty() && evidence.source_failures.len() <= 32
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
) -> ComplianceReport {
    let now = evidence.now_seconds;
    let mut out = Vec::new();
    let target = match &evidence.target {
        NeuronLookup::Found(target) => target,
        NeuronLookup::ConfirmedMissing | NeuronLookup::Unavailable => {
            let mut missing = rule(
                now,
                "DENDRITE-KNOWN-001",
                false,
                "target neuron was not returned",
            );
            if matches!(evidence.target, NeuronLookup::Unavailable) {
                missing.status = RuleStatus::Indeterminate;
                missing.message = "target existence could not be established".into();
            }
            out.push(missing);
            let mut complete = rule(
                now,
                "DENDRITE-DATA-001",
                matches!(evidence.target, NeuronLookup::ConfirmedMissing),
                "target lookup reached a terminal factual result",
            );
            if matches!(evidence.target, NeuronLookup::Unavailable) {
                complete.status = RuleStatus::Indeterminate;
            }
            out.push(complete);
            let mut provenance = rule(
                now,
                "DENDRITE-DATA-002",
                provenance_complete(evidence, source_revision),
                "timestamped fixed-source provenance is present",
            );
            if now == 0 {
                provenance.status = RuleStatus::Indeterminate;
                provenance.message = "NNS evidence snapshot timestamp was unavailable".into();
            }
            out.push(provenance);
            let mut inferred = rule(
                now,
                "DENDRITE-DATA-003",
                matches!(evidence.target, NeuronLookup::ConfirmedMissing),
                "missing evidence was not inferred as passing",
            );
            if matches!(evidence.target, NeuronLookup::Unavailable) {
                inferred.status = RuleStatus::Indeterminate;
            }
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
        }
    };
    out.push(rule(now, "DENDRITE-KNOWN-001", true, "target exists"));
    out.push(rule(
        now,
        "DENDRITE-KNOWN-002",
        target.known_data.is_some(),
        "target is a current known neuron",
    ));
    let has_concrete_committed_topic = target
        .committed_topics
        .iter()
        .any(|topic| is_concrete_topic(*topic));
    let raw_committed_entry_count =
        target.committed_topics.len() + evidence.unknown_committed_topics;
    out.push(rule(
        now,
        "DENDRITE-KNOWN-003",
        has_concrete_committed_topic,
        "at least one concrete committed topic exists",
    ));
    if !has_concrete_committed_topic && evidence.unknown_committed_topics > 0 {
        let last = out.last_mut().expect("committed-topic rule was just added");
        last.status = RuleStatus::StandardUpdateRequired;
        last.observed = Some(format!(
            "{} unknown committed-topic variant(s)",
            evidence.unknown_committed_topics
        ));
    }
    let committed_ok = evidence.unknown_committed_topics == 0
        && raw_committed_entry_count > 0
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
    let factual_committed_invalidity = raw_committed_entry_count == 0
        || target
            .committed_topics
            .iter()
            .any(|topic| matches!(*topic, 0 | 1))
        || target
            .committed_topics
            .iter()
            .copied()
            .collect::<BTreeSet<_>>()
            .len()
            != target.committed_topics.len();
    if evidence.unknown_committed_topics > 0 && !factual_committed_invalidity {
        let last = out.last_mut().expect("committed-topic rule was just added");
        last.status = RuleStatus::StandardUpdateRequired;
        last.observed = Some(format!(
            "{} unknown committed-topic variant(s)",
            evidence.unknown_committed_topics
        ));
    }
    if !factual_committed_invalidity
        && target
            .committed_topics
            .iter()
            .any(|topic| !RECOGNISED_TOPICS.contains(topic))
    {
        let last = out.last_mut().expect("committed-topic rule was just added");
        last.status = RuleStatus::StandardUpdateRequired;
        last.message = "committed topic uses an unknown or reserved topic code".into();
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
    let active = target
        .voting_power_refreshed_timestamp_seconds
        .is_some_and(|timestamp| now >= timestamp && now - timestamp <= SIX_NOMINAL_MONTHS_SECONDS);
    out.push(rule(
        now,
        "DENDRITE-ACTIVE-001",
        active,
        "voting power was refreshed within six nominal months",
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
    out.push(dependent_rule(
        now,
        "DENDRITE-NM-004",
        managers.iter().map(|id| {
            let lookup = evidence.dependencies.get(id);
            (
                *id,
                lookup_known(lookup).is_some(),
                matches!(lookup, Some(NeuronLookup::Unavailable) | None),
            )
        }),
        "every manager is a current known neuron",
    ));
    out.push(dependent_rule(
        now,
        "DENDRITE-NM-005",
        [ALPHA_VOTE_NEURON_ID, OMEGA_REJECT_NEURON_ID]
            .into_iter()
            .map(|id| {
                let lookup = evidence.dependencies.get(&id);
                (
                    id,
                    lookup_known(lookup).is_some(),
                    matches!(lookup, Some(NeuronLookup::Unavailable) | None),
                )
            }),
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
        let result = out.last_mut().expect("delegate-count rule was just added");
        result.relevant_topic = Some(topic);
        result.related_neuron_ids = delegates.clone();
        result.observed = Some(delegates.len().to_string());
        result.expected = Some("at least 3".into());
        out.push(rule(
            now,
            "DENDRITE-COMMIT-002",
            distinct(&delegates),
            "committed delegates are distinct",
        ));
        let result = out
            .last_mut()
            .expect("delegate-distinctness rule was just added");
        result.relevant_topic = Some(topic);
        result.related_neuron_ids = delegates.clone();
        out.push(dependent_rule(
            now,
            "DENDRITE-COMMIT-003",
            delegates.iter().map(|id| {
                let lookup = evidence.dependencies.get(id);
                (
                    *id,
                    managers.contains(id) && lookup_known(lookup).is_some(),
                    managers.contains(id)
                        && matches!(lookup, Some(NeuronLookup::Unavailable) | None),
                )
            }),
            "committed delegates are managers and current known neurons",
        ));
        let result = out
            .last_mut()
            .expect("delegate-manager rule was just added");
        result.relevant_topic = Some(topic);
        result.related_neuron_ids = delegates.clone();
        result.expected = Some("all delegates are raw Neuron Management managers".into());
        out.push(dependent_rule(
            now,
            "DENDRITE-COMMIT-004",
            delegates.iter().map(|id| {
                let lookup = evidence.dependencies.get(id);
                let follows = matches!(lookup, Some(NeuronLookup::Found(neuron)) if singleton(neuron.followees.get(&topic), OMEGA_REJECT_NEURON_ID));
                (
                    *id,
                    follows,
                    matches!(lookup, Some(NeuronLookup::Unavailable) | None),
                )
            }),
            "each delegate follows omega-reject exactly",
        ));
        let result = out.last_mut().expect("delegate-follow rule was just added");
        result.relevant_topic = Some(topic);
        result.related_neuron_ids = delegates.clone();
        result.expected = Some(format!("exact singleton [{OMEGA_REJECT_NEURON_ID}]"));
    }
    for topic in RECOGNISED_TOPICS {
        if topic != 0 && topic != 1 && !target.committed_topics.contains(&topic) {
            out.push(rule(
                now,
                "DENDRITE-DEFAULT-001",
                singleton(target.followees.get(&topic), ALPHA_VOTE_NEURON_ID),
                "non-committed topic follows alpha-vote exactly",
            ));
            let result = out.last_mut().expect("default-follow rule was just added");
            result.relevant_topic = Some(topic);
            result.related_neuron_ids = target.followees.get(&topic).cloned().unwrap_or_default();
            result.expected = Some(format!("exact singleton [{ALPHA_VOTE_NEURON_ID}]"));
        }
    }
    out.push(rule(
        now,
        "DENDRITE-DEFAULT-002",
        singleton(target.followees.get(&0), ALPHA_VOTE_NEURON_ID),
        "CatchAll follows alpha-vote exactly",
    ));
    let result = out.last_mut().expect("CatchAll-follow rule was just added");
    result.relevant_topic = Some(0);
    result.related_neuron_ids = target.followees.get(&0).cloned().unwrap_or_default();
    result.expected = Some(format!("exact singleton [{ALPHA_VOTE_NEURON_ID}]"));
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
    let any_unavailable = evidence
        .dependencies
        .values()
        .any(|lookup| matches!(lookup, NeuronLookup::Unavailable));
    let mut complete = rule(
        now,
        "DENDRITE-DATA-001",
        !any_unavailable,
        "every required lookup reached a terminal factual result",
    );
    if any_unavailable {
        complete.status = RuleStatus::Indeterminate;
    }
    out.push(complete);
    out.push(rule(
        now,
        "DENDRITE-DATA-002",
        provenance_complete(evidence, source_revision),
        "timestamped fixed-source provenance is present",
    ));
    let unavailable_pass = out.iter().any(|result| {
        result.status == RuleStatus::Pass
            && matches!(
                result.rule_id.as_str(),
                "DENDRITE-NM-004"
                    | "DENDRITE-NM-005"
                    | "DENDRITE-COMMIT-003"
                    | "DENDRITE-COMMIT-004"
            )
            && result.related_neuron_ids.iter().any(|id| {
                matches!(
                    evidence.dependencies.get(id),
                    Some(NeuronLookup::Unavailable)
                )
            })
    });
    out.push(rule(
        now,
        "DENDRITE-DATA-003",
        !unavailable_pass,
        "no unavailable lookup was inferred as passing",
    ));
    for result in &mut out {
        let unavailable = match result.rule_id.as_str() {
            "DENDRITE-LOCK-001" => target.dissolving.is_none(),
            "DENDRITE-LOCK-002" => target.dissolve_delay_seconds.is_none(),
            "DENDRITE-LOCK-003" => target.effective_stake_e8s.is_none(),
            "DENDRITE-ACTIVE-001" => target.voting_power_refreshed_timestamp_seconds.is_none(),
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
            _ => false,
        };
        if unavailable {
            result.status = RuleStatus::Indeterminate;
            result.message = format!("{}; mandatory evidence was unavailable", result.message);
        }
    }
    let distinct_manager_count = managers.iter().copied().collect::<BTreeSet<_>>().len();
    let quorum = if distinct_manager_count == 0 {
        None
    } else {
        u8::try_from(distinct_manager_count / 2 + 1).ok()
    };
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
) -> ComplianceReport {
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
    let target = match &evidence.target {
        NeuronLookup::Found(target) => Some(TargetSummary {
            neuron_id: target.id,
            known_neuron: target.known_data.clone(),
            controller: target.controller,
            hot_keys: target.hot_keys.clone(),
            not_for_profit: target.not_for_profit,
            dissolve_delay_seconds: target.dissolve_delay_seconds,
            dissolving: target.dissolving,
            effective_stake_e8s: target.effective_stake_e8s,
            voting_power_refreshed_timestamp_seconds: target
                .voting_power_refreshed_timestamp_seconds,
            potential_voting_power: target.potential_voting_power,
            deciding_voting_power: target.deciding_voting_power,
        }),
        NeuronLookup::ConfirmedMissing | NeuronLookup::Unavailable => None,
    };
    let manager_summaries = managers
        .iter()
        .map(|id| {
            let lookup = evidence.dependencies.get(id);
            let found = lookup.and_then(NeuronLookup::as_ref);
            ManagerSummary {
                neuron_id: *id,
                evidence_status: match lookup {
                    Some(NeuronLookup::Found(_)) => ManagerEvidenceStatus::Found,
                    Some(NeuronLookup::ConfirmedMissing) | None => {
                        ManagerEvidenceStatus::ConfirmedMissing
                    }
                    Some(NeuronLookup::Unavailable) => ManagerEvidenceStatus::Unavailable,
                },
                known_neuron: found.and_then(|neuron| neuron.known_data.clone()),
                controller: found.and_then(|neuron| neuron.controller),
                hot_keys: found.map_or_else(Vec::new, |neuron| neuron.hot_keys.clone()),
                minted_stake_e8s: found.and_then(|neuron| neuron.minted_stake_e8s),
                neuron_management_followees: found
                    .and_then(|neuron| neuron.followees.get(&1))
                    .cloned()
                    .unwrap_or_default(),
                omega_ready_topics: found.map_or_else(Vec::new, |neuron| {
                    RECOGNISED_TOPICS
                        .into_iter()
                        .filter(|topic| {
                            neuron.followees.get(topic).is_some_and(|followees| {
                                followees.as_slice() == [OMEGA_REJECT_NEURON_ID]
                            })
                        })
                        .collect()
                }),
            }
        })
        .collect();
    let committed_topics = topics
        .iter()
        .map(|topic| TopicSummary {
            topic: *topic,
            delegate_ids: match &evidence.target {
                NeuronLookup::Found(target) => target.followees.get(topic),
                NeuronLookup::ConfirmedMissing | NeuronLookup::Unavailable => None,
            }
            .cloned()
            .unwrap_or_default(),
        })
        .collect();
    let non_committed_topics = match &evidence.target {
        NeuronLookup::Found(target) => RECOGNISED_TOPICS
            .into_iter()
            .filter(|topic| *topic != 1 && !topics.contains(topic))
            .map(|topic| NonCommittedTopicCheck {
                topic,
                followee_ids: target.followees.get(&topic).cloned().unwrap_or_default(),
            })
            .collect(),
        NeuronLookup::ConfirmedMissing | NeuronLookup::Unavailable => Vec::new(),
    };
    let controller = evidence
        .controller
        .as_ref()
        .map(|controller| ControllerSummary {
            principal: match &evidence.target {
                NeuronLookup::Found(target) => target.controller,
                NeuronLookup::ConfirmedMissing | NeuronLookup::Unavailable => None,
            },
            call_succeeded: controller.call_succeeded,
            module_hash: controller.module_hash.clone(),
            controllers: controller.controllers.clone(),
        });
    ComplianceReport {
        standard_version: STANDARD_VERSION.into(),
        neuron_id,
        checked_at_timestamp_seconds: evidence.now_seconds,
        overall_status,
        target,
        managers: manager_summaries,
        committed_topics,
        non_committed_topics,
        controller,
        rules,
        quorum_threshold: quorum,
        source_revision: revision.into(),
        source_failures: evidence.source_failures.iter().take(32).cloned().collect(),
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
                description: Some("A compliant target".into()),
                links: vec!["https://example.com/dendrite".into()],
            }),
            hot_keys: vec![],
            not_for_profit: Some(false),
            dissolve_delay_seconds: Some(MAX_DISSOLVE_DELAY_SECONDS),
            dissolving: Some(false),
            effective_stake_e8s: Some(100_000_000),
            minted_stake_e8s: Some(100_000_000),
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
                NeuronLookup::Found(Box::new(NeuronEvidence {
                    id: *id,
                    controller: None,
                    known_data: Some(KnownNeuron {
                        id: *id,
                        name: format!("known-{id}"),
                        description: None,
                        links: vec![],
                    }),
                    hot_keys: vec![],
                    not_for_profit: Some(false),
                    dissolve_delay_seconds: Some(MAX_DISSOLVE_DELAY_SECONDS),
                    dissolving: Some(false),
                    effective_stake_e8s: Some(1),
                    minted_stake_e8s: Some(1),
                    voting_power_refreshed_timestamp_seconds: Some(999_999),
                    potential_voting_power: Some(1),
                    deciding_voting_power: Some(1),
                    committed_topics: vec![],
                    followees: manager_followees,
                })),
            );
        }
        EvaluationEvidence {
            now_seconds: 1_000_000,
            target: NeuronLookup::Found(Box::new(target)),
            dependencies,
            controller: Some(ControllerEvidence {
                call_succeeded: true,
                module_hash: None,
                controllers: vec![],
            }),
            source_failures: vec![],
            unknown_committed_topics: 0,
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
        assert_eq!(
            snapshot
                .target
                .as_ref()
                .and_then(|target| target.known_neuron.as_ref())
                .map(|known| known.name.as_str()),
            Some("Dendrite")
        );
        assert_eq!(snapshot.controller.as_ref().unwrap().module_hash, None);
        assert_eq!(snapshot.managers[0].neuron_id, 100);
        assert_eq!(
            snapshot.managers[0].evidence_status,
            ManagerEvidenceStatus::Found
        );
        assert_eq!(
            snapshot.committed_topics[0].delegate_ids,
            vec![100, 101, 102]
        );
    }

    #[test]
    fn manager_summaries_preserve_raw_order_and_lookup_status() {
        let mut evidence = compliant_evidence();
        let authority = Principal::from_slice(&[9]);
        let manager = evidence
            .dependencies
            .get_mut(&100)
            .unwrap()
            .as_mut()
            .unwrap();
        manager.controller = Some(authority);
        manager.hot_keys = vec![authority];
        evidence
            .dependencies
            .get_mut(&101)
            .unwrap()
            .as_mut()
            .unwrap()
            .known_data = None;
        evidence
            .dependencies
            .insert(102, NeuronLookup::ConfirmedMissing);
        evidence.dependencies.insert(103, NeuronLookup::Unavailable);
        evidence
            .target
            .as_mut()
            .unwrap()
            .followees
            .insert(1, vec![100, 101, 102, 103, 100]);

        let report = evaluate(42, &evidence, SOURCE_REVISION);
        assert_eq!(
            report
                .managers
                .iter()
                .map(|manager| manager.neuron_id)
                .collect::<Vec<_>>(),
            vec![100, 101, 102, 103, 100]
        );
        assert_eq!(report.managers[0].controller, Some(authority));
        assert_eq!(report.managers[0].hot_keys, vec![authority]);
        assert_eq!(report.managers[0].minted_stake_e8s, Some(1));
        assert!(report.managers[0].neuron_management_followees.is_empty());
        assert_eq!(report.managers[0].omega_ready_topics, vec![4]);
        assert_eq!(
            report.managers[1].evidence_status,
            ManagerEvidenceStatus::Found
        );
        assert!(report.managers[1].known_neuron.is_none());
        assert_eq!(
            report.managers[2].evidence_status,
            ManagerEvidenceStatus::ConfirmedMissing
        );
        assert_eq!(
            report.managers[3].evidence_status,
            ManagerEvidenceStatus::Unavailable
        );
        for manager in &report.managers[2..4] {
            assert!(manager.controller.is_none());
            assert!(manager.hot_keys.is_empty());
        }
    }

    #[test]
    fn quorum_uses_distinct_manager_ballots() {
        for (managers, expected) in [
            (vec![1, 2, 3, 4, 5], Some(3)),
            (vec![1, 2, 3, 4, 5, 6], Some(4)),
            (vec![1, 1, 2, 3, 4], Some(3)),
            (vec![], None),
            (vec![1, 1, 1, 1, 1], Some(1)),
        ] {
            let mut evidence = compliant_evidence();
            evidence
                .target
                .as_mut()
                .unwrap()
                .followees
                .insert(1, managers.clone());
            let snapshot = evaluate(42, &evidence, SOURCE_REVISION);
            assert_eq!(snapshot.quorum_threshold, expected);
            if managers.len() != managers.iter().copied().collect::<BTreeSet<_>>().len() {
                assert!(snapshot.rules.iter().any(|rule| {
                    rule.rule_id == "DENDRITE-NM-002" && rule.status == RuleStatus::Fail
                }));
                assert_eq!(snapshot.overall_status, ComplianceStatus::NonCompliant);
            }
        }
    }
    #[test]
    fn transport_missing_target_is_indeterminate_not_factual_failure() {
        let mut evidence = compliant_evidence();
        evidence.target = NeuronLookup::Unavailable;
        evidence.source_failures.push(SourceFailure {
            method: "list_neurons".into(),
            kind: SourceFailureKind::Rejected,
            message: "rejected".into(),
            affected_neuron_ids: vec![42],
        });
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
        evidence.source_failures.push(SourceFailure {
            method: "canister_info".into(),
            kind: SourceFailureKind::Rejected,
            message: "rejected".into(),
            affected_neuron_ids: vec![42],
        });
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
        evidence.dependencies.insert(100, NeuronLookup::Unavailable);
        evidence.source_failures.push(SourceFailure {
            method: "list_neurons".into(),
            kind: SourceFailureKind::Rejected,
            message: "rejected".into(),
            affected_neuron_ids: vec![100],
        });
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

    fn committed_topic_evidence(known: Vec<i32>, unknown: usize) -> EvaluationEvidence {
        let mut evidence = compliant_evidence();
        let target = evidence.target.as_mut().unwrap();
        target.committed_topics = known;
        for topic in RECOGNISED_TOPICS {
            if topic != 1 && !target.committed_topics.contains(&topic) {
                target.followees.insert(topic, vec![ALPHA_VOTE_NEURON_ID]);
            }
        }
        evidence.unknown_committed_topics = unknown;
        evidence
    }

    #[test]
    fn committed_topic_rules_distinguish_empty_unknown_and_known_invalidity() {
        for unknown in [1, 2] {
            let evidence = committed_topic_evidence(vec![], unknown);
            assert_rule(
                evidence.clone(),
                "DENDRITE-KNOWN-003",
                RuleStatus::StandardUpdateRequired,
            );
            assert_rule(
                evidence,
                "DENDRITE-KNOWN-004",
                RuleStatus::StandardUpdateRequired,
            );
        }
        assert_eq!(
            evaluate(42, &committed_topic_evidence(vec![], 1), SOURCE_REVISION).overall_status,
            ComplianceStatus::StandardUpdateRequired
        );

        let governance_and_unknown = committed_topic_evidence(vec![4], 1);
        assert_rule(
            governance_and_unknown.clone(),
            "DENDRITE-KNOWN-003",
            RuleStatus::Pass,
        );
        assert_rule(
            governance_and_unknown,
            "DENDRITE-KNOWN-004",
            RuleStatus::StandardUpdateRequired,
        );

        for known in [vec![], vec![0], vec![1]] {
            let evidence = committed_topic_evidence(known, 0);
            assert_rule(evidence.clone(), "DENDRITE-KNOWN-003", RuleStatus::Fail);
            assert_rule(evidence, "DENDRITE-KNOWN-004", RuleStatus::Fail);
        }

        for known in [vec![0], vec![4, 4]] {
            assert_rule(
                committed_topic_evidence(known, 1),
                "DENDRITE-KNOWN-004",
                RuleStatus::Fail,
            );
        }
    }
    #[test]
    fn edge_semantics_cover_fail_closed_short_circuits() {
        let mut evidence = compliant_evidence();
        evidence.target = NeuronLookup::ConfirmedMissing;
        evidence.source_failures.clear();
        assert_eq!(
            evaluate(42, &evidence, SOURCE_REVISION).overall_status,
            ComplianceStatus::NonCompliant
        );

        let mut evidence = compliant_evidence();
        evidence.target.as_mut().unwrap().known_data = None;
        assert_rule(evidence, "DENDRITE-KNOWN-002", RuleStatus::Fail);

        let mut evidence = compliant_evidence();
        let future_refresh = evidence.now_seconds + 1;
        evidence
            .target
            .as_mut()
            .unwrap()
            .voting_power_refreshed_timestamp_seconds = Some(future_refresh);
        assert_rule(evidence, "DENDRITE-ACTIVE-001", RuleStatus::Fail);

        let mut evidence = compliant_evidence();
        evidence.target.as_mut().unwrap().potential_voting_power = Some(0);
        assert_rule(evidence, "DENDRITE-ACTIVE-002", RuleStatus::Fail);

        let mut evidence = compliant_evidence();
        evidence.target.as_mut().unwrap().controller = None;
        assert_rule(evidence, "DENDRITE-CONTROL-001", RuleStatus::Fail);

        let mut evidence = compliant_evidence();
        evidence
            .target
            .as_mut()
            .unwrap()
            .followees
            .insert(99, vec![]);
        let snapshot = evaluate(42, &evidence, SOURCE_REVISION);
        for rule_id in ["DENDRITE-DEFAULT-003", "DENDRITE-DATA-001"] {
            assert!(
                snapshot
                    .rules
                    .iter()
                    .any(|rule| { rule.rule_id == rule_id && rule.status == RuleStatus::Pass })
            );
        }

        let mut evidence = compliant_evidence();
        evidence
            .target
            .as_mut()
            .unwrap()
            .voting_power_refreshed_timestamp_seconds = None;
        assert_rule(evidence, "DENDRITE-ACTIVE-001", RuleStatus::Indeterminate);

        let mut evidence = compliant_evidence();
        evidence.target.as_mut().unwrap().potential_voting_power = None;
        assert_rule(evidence, "DENDRITE-ACTIVE-002", RuleStatus::Indeterminate);
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
            .as_mut()
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
    fn assert_rule(evidence: EvaluationEvidence, rule_id: &str, status: RuleStatus) {
        let snapshot = evaluate(42, &evidence, SOURCE_REVISION);
        assert!(
            snapshot
                .rules
                .iter()
                .any(|rule| rule.rule_id == rule_id && rule.status == status),
            "expected {rule_id}={status:?}"
        );
    }
    #[test]
    fn focused_target_posture_mutations_fail_their_rules() {
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().dissolving = Some(true);
        assert_rule(e, "DENDRITE-LOCK-001", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().dissolve_delay_seconds = Some(1);
        assert_rule(e, "DENDRITE-LOCK-002", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().effective_stake_e8s = Some(0);
        assert_rule(e, "DENDRITE-LOCK-003", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.now_seconds = 20_000_000;
        assert_rule(e, "DENDRITE-ACTIVE-001", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().deciding_voting_power = Some(9);
        assert_rule(e, "DENDRITE-ACTIVE-002", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.controller.as_mut().unwrap().module_hash = Some(vec![1]);
        assert_rule(e, "DENDRITE-CONTROL-002", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.controller
            .as_mut()
            .unwrap()
            .controllers
            .push(Principal::anonymous());
        assert_rule(e, "DENDRITE-CONTROL-003", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target
            .as_mut()
            .unwrap()
            .hot_keys
            .push(Principal::anonymous());
        assert_rule(e, "DENDRITE-CONTROL-004", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().not_for_profit = Some(true);
        assert_rule(e, "DENDRITE-CONTROL-005", RuleStatus::Fail);
    }
    #[test]
    fn pinned_time_constants_and_boundaries_are_exact() {
        assert_eq!(ONE_YEAR_SECONDS, 31_557_600);
        assert_eq!(ONE_MONTH_SECONDS, 2_629_800);
        assert_eq!(MAX_DISSOLVE_DELAY_SECONDS, 63_115_200);
        assert_eq!(SIX_NOMINAL_MONTHS_SECONDS, 15_778_800);

        let mut exact_delay = compliant_evidence();
        exact_delay.target.as_mut().unwrap().dissolve_delay_seconds =
            Some(MAX_DISSOLVE_DELAY_SECONDS);
        assert_rule(exact_delay, "DENDRITE-LOCK-002", RuleStatus::Pass);

        let mut short_delay = compliant_evidence();
        short_delay.target.as_mut().unwrap().dissolve_delay_seconds =
            Some(MAX_DISSOLVE_DELAY_SECONDS - 1);
        assert_rule(short_delay, "DENDRITE-LOCK-002", RuleStatus::Fail);

        let mut exact_age = compliant_evidence();
        exact_age.now_seconds = 20_000_000;
        exact_age
            .target
            .as_mut()
            .unwrap()
            .voting_power_refreshed_timestamp_seconds =
            Some(exact_age.now_seconds - SIX_NOMINAL_MONTHS_SECONDS);
        assert_rule(exact_age, "DENDRITE-ACTIVE-001", RuleStatus::Pass);

        let mut too_old = compliant_evidence();
        too_old.now_seconds = 20_000_000;
        too_old
            .target
            .as_mut()
            .unwrap()
            .voting_power_refreshed_timestamp_seconds =
            Some(too_old.now_seconds - SIX_NOMINAL_MONTHS_SECONDS - 1);
        assert_rule(too_old, "DENDRITE-ACTIVE-001", RuleStatus::Fail);

        let mut future = compliant_evidence();
        future
            .target
            .as_mut()
            .unwrap()
            .voting_power_refreshed_timestamp_seconds = Some(future.now_seconds + 1);
        assert_rule(future, "DENDRITE-ACTIVE-001", RuleStatus::Fail);
    }
    #[test]
    fn focused_manager_and_delegate_mutations_fail_their_rules() {
        let mut e = compliant_evidence();
        e.target
            .as_mut()
            .unwrap()
            .followees
            .get_mut(&1)
            .unwrap()
            .truncate(4);
        assert_rule(e, "DENDRITE-NM-001", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().followees.get_mut(&1).unwrap()[0] = 42;
        assert_rule(e, "DENDRITE-NM-003", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.dependencies.insert(100, NeuronLookup::ConfirmedMissing);
        assert_rule(e, "DENDRITE-NM-004", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.dependencies
            .insert(ALPHA_VOTE_NEURON_ID, NeuronLookup::ConfirmedMissing);
        assert_rule(e, "DENDRITE-NM-005", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target
            .as_mut()
            .unwrap()
            .followees
            .get_mut(&4)
            .unwrap()
            .truncate(2);
        assert_rule(e, "DENDRITE-COMMIT-001", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().followees.get_mut(&4).unwrap()[2] = 100;
        assert_rule(e, "DENDRITE-COMMIT-002", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().followees.get_mut(&4).unwrap()[2] = 999;
        assert_rule(e, "DENDRITE-COMMIT-003", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.dependencies
            .get_mut(&100)
            .unwrap()
            .as_mut()
            .unwrap()
            .followees
            .insert(4, vec![OMEGA_REJECT_NEURON_ID, 7]);
        assert_rule(e, "DENDRITE-COMMIT-004", RuleStatus::Fail);
    }
    #[test]
    fn focused_topic_mutations_are_fail_closed() {
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().committed_topics.clear();
        assert_rule(e, "DENDRITE-KNOWN-003", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().committed_topics = vec![0];
        assert_rule(e, "DENDRITE-KNOWN-004", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().committed_topics = vec![1];
        assert_rule(e, "DENDRITE-KNOWN-004", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().committed_topics = vec![11];
        assert_rule(e, "DENDRITE-KNOWN-004", RuleStatus::StandardUpdateRequired);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().followees.insert(3, vec![7]);
        assert_rule(e, "DENDRITE-DEFAULT-001", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target
            .as_mut()
            .unwrap()
            .followees
            .insert(0, vec![ALPHA_VOTE_NEURON_ID, 7]);
        assert_rule(e, "DENDRITE-DEFAULT-002", RuleStatus::Fail);
        let mut e = compliant_evidence();
        e.target.as_mut().unwrap().followees.insert(99, vec![7]);
        assert_rule(
            e,
            "DENDRITE-DEFAULT-003",
            RuleStatus::StandardUpdateRequired,
        );
    }

    #[test]
    fn factual_committed_topic_invalidity_precedes_unknown_semantics() {
        let mut evidence = compliant_evidence();
        evidence.target.as_mut().unwrap().committed_topics = vec![0, 4];
        evidence.unknown_committed_topics = 1;
        assert_rule(evidence, "DENDRITE-KNOWN-004", RuleStatus::Fail);
    }

    #[test]
    fn dependency_availability_is_rule_and_topic_local() {
        let mut unrelated_manager = compliant_evidence();
        unrelated_manager
            .dependencies
            .insert(104, NeuronLookup::Unavailable);
        assert_rule(unrelated_manager, "DENDRITE-COMMIT-004", RuleStatus::Pass);

        let mut alpha_unavailable = compliant_evidence();
        alpha_unavailable
            .dependencies
            .insert(ALPHA_VOTE_NEURON_ID, NeuronLookup::Unavailable);
        assert_rule(alpha_unavailable, "DENDRITE-COMMIT-004", RuleStatus::Pass);

        let mut missing_delegate = compliant_evidence();
        missing_delegate
            .dependencies
            .insert(100, NeuronLookup::ConfirmedMissing);
        assert_rule(missing_delegate, "DENDRITE-COMMIT-004", RuleStatus::Fail);

        let mut unavailable_delegate = compliant_evidence();
        unavailable_delegate
            .dependencies
            .insert(100, NeuronLookup::Unavailable);
        assert_rule(
            unavailable_delegate,
            "DENDRITE-COMMIT-004",
            RuleStatus::Indeterminate,
        );
    }

    #[test]
    fn evidence_provenance_requires_time_revision_and_bounded_failures() {
        let mut no_time = compliant_evidence();
        no_time.now_seconds = 0;
        assert_rule(no_time, "DENDRITE-DATA-002", RuleStatus::Fail);

        let no_revision = compliant_evidence();
        let report = evaluate(42, &no_revision, "");
        assert!(report.rules.iter().any(|rule| {
            rule.rule_id == "DENDRITE-DATA-002" && rule.status == RuleStatus::Fail
        }));

        let mut too_many_failures = compliant_evidence();
        too_many_failures.source_failures = (0..33)
            .map(|id| SourceFailure {
                method: "list_neurons".into(),
                kind: SourceFailureKind::Rejected,
                message: "rejected".into(),
                affected_neuron_ids: vec![id],
            })
            .collect();
        assert_rule(too_many_failures, "DENDRITE-DATA-002", RuleStatus::Fail);
    }

    fn differential_case(name: &str) -> EvaluationEvidence {
        let mut evidence = compliant_evidence();
        match name {
            "fully_compliant" => {}
            "target_missing" => evidence.target = NeuronLookup::ConfirmedMissing,
            "target_unavailable" => evidence.target = NeuronLookup::Unavailable,
            "wrong_target_id" => evidence.target.as_mut().unwrap().id = 43,
            "missing_known_neuron" => evidence.target.as_mut().unwrap().known_data = None,
            "target_hotkeys" => evidence
                .target
                .as_mut()
                .unwrap()
                .hot_keys
                .push(Principal::from_slice(&[2])),
            "not_for_profit" => evidence.target.as_mut().unwrap().not_for_profit = Some(true),
            "dissolving" => evidence.target.as_mut().unwrap().dissolving = Some(true),
            "short_dissolve_delay" => {
                evidence.target.as_mut().unwrap().dissolve_delay_seconds = Some(1)
            }
            "stale_voting_power" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .voting_power_refreshed_timestamp_seconds = Some(1)
            }
            "voting_power_mismatch" => {
                evidence.target.as_mut().unwrap().deciding_voting_power = Some(9)
            }
            "too_few_managers" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .followees
                    .insert(1, vec![100, 101, 102, 103]);
            }
            "too_many_managers" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .followees
                    .insert(1, (100..116).collect());
            }
            "duplicate_managers" => evidence
                .target
                .as_mut()
                .unwrap()
                .followees
                .get_mut(&1)
                .unwrap()
                .push(100),
            "self_manager" => evidence
                .target
                .as_mut()
                .unwrap()
                .followees
                .get_mut(&1)
                .unwrap()
                .push(42),
            "manager_missing" => {
                evidence
                    .dependencies
                    .insert(100, NeuronLookup::ConfirmedMissing);
            }
            "manager_unavailable" => {
                evidence.dependencies.insert(100, NeuronLookup::Unavailable);
            }
            "manager_hotkeys" => evidence
                .dependencies
                .get_mut(&100)
                .unwrap()
                .as_mut()
                .unwrap()
                .hot_keys
                .push(Principal::from_slice(&[3])),
            "incorrect_management_following" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .followees
                    .insert(1, vec![7]);
            }
            "alpha_vote_mismatch" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .followees
                    .insert(3, vec![7]);
            }
            "omega_reject_mismatch" => {
                evidence
                    .dependencies
                    .get_mut(&100)
                    .unwrap()
                    .as_mut()
                    .unwrap()
                    .followees
                    .insert(4, vec![ALPHA_VOTE_NEURON_ID]);
            }
            "committed_missing_delegate" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .followees
                    .insert(4, vec![100, 101]);
            }
            "committed_extra_delegate" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .followees
                    .get_mut(&4)
                    .unwrap()
                    .push(104);
            }
            "non_committed_mismatch" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .followees
                    .insert(17, vec![7]);
            }
            "quorum_edge" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .followees
                    .insert(1, vec![100, 101, 102, 103, 104, 105]);
            }
            "controller_unavailable" => evidence.controller = None,
            "controller_module_present" => {
                evidence.controller.as_mut().unwrap().module_hash = Some(vec![1])
            }
            "controller_list_retained" => evidence
                .controller
                .as_mut()
                .unwrap()
                .controllers
                .push(Principal::from_slice(&[4])),
            "unknown_committed_topic" => evidence.unknown_committed_topics = 1,
            "source_failure" => evidence.source_failures.push(SourceFailure {
                method: "list_neurons".into(),
                kind: SourceFailureKind::Rejected,
                message: "bounded rejection".into(),
                affected_neuron_ids: vec![100],
            }),
            "unknown_following_topic" => {
                evidence
                    .target
                    .as_mut()
                    .unwrap()
                    .followees
                    .insert(99, vec![7]);
            }
            "contradictory_unavailable_evidence" => {
                evidence.target.as_mut().unwrap().effective_stake_e8s = None
            }
            _ => panic!("unknown differential fixture {name}"),
        }
        evidence
    }

    #[test]
    fn frontend_differential_fixture_is_current() {
        let names = [
            "fully_compliant",
            "target_missing",
            "target_unavailable",
            "wrong_target_id",
            "missing_known_neuron",
            "target_hotkeys",
            "not_for_profit",
            "dissolving",
            "short_dissolve_delay",
            "stale_voting_power",
            "voting_power_mismatch",
            "too_few_managers",
            "too_many_managers",
            "duplicate_managers",
            "self_manager",
            "manager_missing",
            "manager_unavailable",
            "manager_hotkeys",
            "incorrect_management_following",
            "alpha_vote_mismatch",
            "omega_reject_mismatch",
            "committed_missing_delegate",
            "committed_extra_delegate",
            "non_committed_mismatch",
            "quorum_edge",
            "controller_unavailable",
            "controller_module_present",
            "controller_list_retained",
            "unknown_committed_topic",
            "source_failure",
            "unknown_following_topic",
            "contradictory_unavailable_evidence",
        ];
        let fixtures = names
            .iter()
            .map(|name| {
                let report = evaluate(42, &differential_case(name), SOURCE_REVISION);
                serde_json::json!({
                    "name": name,
                    "overall_status": report.overall_status,
                    "quorum_threshold": report.quorum_threshold,
                    "rules": report.rules.iter().map(|rule| serde_json::json!({
                        "rule_id": rule.rule_id,
                        "status": rule.status,
                    })).collect::<Vec<_>>(),
                })
            })
            .collect::<Vec<_>>();
        let generated = format!("{}\n", serde_json::to_string_pretty(&fixtures).unwrap());
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../canisters/dendrite/web/test/fixtures/evaluator.json"
        );
        if std::env::var_os("DENDRITE_UPDATE_EVALUATOR_FIXTURE").is_some() {
            std::fs::create_dir_all(std::path::Path::new(path).parent().unwrap()).unwrap();
            std::fs::write(path, &generated).unwrap();
        }
        assert_eq!(std::fs::read_to_string(path).unwrap(), generated);
    }
}
