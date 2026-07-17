use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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
    pub relevant_topic: Option<i32>,
    pub source: EvidenceSource,
}

#[derive(Clone, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub struct KnownNeuron {
    pub id: u64,
    pub name: String,
    pub description: Option<String>,
    pub links: Vec<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, CandidType, Deserialize, Serialize)]
pub struct SummaryField {
    pub label: String,
    pub value: String,
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
    pub summary_fields: Option<Vec<SummaryField>>,
    pub warnings: Option<Vec<String>>,
}
