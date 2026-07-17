#![forbid(unsafe_code)]

use candid::{CandidType, Deserialize};
use dendrite_types::{
    ALPHA_VOTE_NEURON_ID, ComplianceSnapshot, ControllerEvidence, EvaluationEvidence, KnownNeuron,
    MAX_CACHED_SNAPSHOTS, NeuronEvidence, OMEGA_REJECT_NEURON_ID, SOURCE_REVISION,
    STANDARD_VERSION, evaluate,
};
use ic_clients::{DissolveState, KnownNeuronData, Neuron, TopicToFollow};
use std::{cell::RefCell, collections::BTreeMap};

mod rate_limit;
mod stable;
use rate_limit::{RefreshCounters, RefreshState, Rejection};

thread_local! { static REFRESH_STATE: RefCell<RefreshState> = RefCell::new(RefreshState::default()); }

const NNS_GOVERNANCE_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai";

#[derive(Clone, CandidType, Deserialize)]
pub struct StandardConfig {
    standard_version: String,
    alpha_vote_neuron_id: u64,
    omega_reject_neuron_id: u64,
    max_cached_snapshots: u16,
    governance_canister_id: String,
    source_revision: String,
}
#[derive(Clone, CandidType, Deserialize)]
pub struct PublicStatus {
    schema_version: u16,
    cached_snapshots: u16,
    refresh_counters: RefreshCounters,
}
#[derive(Clone, CandidType, Deserialize)]
pub enum DendriteError {
    InvalidNeuronId(String),
    TemporarilyUnavailable(String),
    Upstream(String),
    Cooldown { retry_after_seconds: u64 },
    GlobalRateLimit { retry_after_seconds: u64 },
    ConcurrencyLimit,
    DuplicateInFlight,
    LowCycles,
}

#[ic_cdk::query]
fn get_standard_config() -> StandardConfig {
    StandardConfig {
        standard_version: STANDARD_VERSION.into(),
        alpha_vote_neuron_id: ALPHA_VOTE_NEURON_ID,
        omega_reject_neuron_id: OMEGA_REJECT_NEURON_ID,
        max_cached_snapshots: MAX_CACHED_SNAPSHOTS as u16,
        governance_canister_id: NNS_GOVERNANCE_CANISTER_ID.into(),
        source_revision: SOURCE_REVISION.into(),
    }
}

#[ic_cdk::query]
fn get_cached_compliance(neuron_id: u64) -> Option<ComplianceSnapshot> {
    if neuron_id == 0 {
        return None;
    }
    stable::get(neuron_id)
}

#[ic_cdk::query]
fn get_public_status() -> PublicStatus {
    PublicStatus {
        schema_version: 1,
        cached_snapshots: stable::len() as u16,
        refresh_counters: REFRESH_STATE.with_borrow(|state| state.counters),
    }
}

// Live collection uses only the fixed Governance and management principals. The
// bounded adapter is intentionally unavailable on non-wasm test builds.
#[ic_cdk::update]
async fn refresh_compliance(neuron_id: u64) -> Result<ComplianceSnapshot, DendriteError> {
    if neuron_id == 0 {
        return Err(DendriteError::InvalidNeuronId(
            "neuron ID must be non-zero".into(),
        ));
    }
    if let Some(snapshot) = stable::get(neuron_id) {
        let now = ic_cdk::api::time() / 1_000_000_000;
        if now <= snapshot.stale_after_timestamp_seconds {
            REFRESH_STATE.with_borrow_mut(RefreshState::cache_hit);
            return Ok(snapshot);
        }
    }
    let now = ic_cdk::api::time() / 1_000_000_000;
    let cycles = ic_cdk::api::canister_liquid_cycle_balance();
    REFRESH_STATE
        .with_borrow_mut(|state| state.begin(neuron_id, now, cycles))
        .map_err(|rejection| match rejection {
            Rejection::Cooldown(retry_after_seconds) => DendriteError::Cooldown {
                retry_after_seconds,
            },
            Rejection::GlobalRate(retry_after_seconds) => DendriteError::GlobalRateLimit {
                retry_after_seconds,
            },
            Rejection::Concurrency => DendriteError::ConcurrencyLimit,
            Rejection::Duplicate => DendriteError::DuplicateInFlight,
            Rejection::LowCycles => DendriteError::LowCycles,
        })?;
    let collected = collect_live(neuron_id).await;
    let snapshot = match collected {
        Ok(snapshot) => snapshot,
        Err(error) => {
            REFRESH_STATE.with_borrow_mut(|state| state.finish(neuron_id, false, false));
            return Err(error);
        }
    };
    let mut evicted = false;
    if snapshot.overall_status != dendrite_types::ComplianceStatus::Indeterminate {
        evicted = stable::put(snapshot.clone());
    }
    REFRESH_STATE.with_borrow_mut(|state| state.finish(neuron_id, true, evicted));
    Ok(snapshot)
}

fn topic_code(topic: &TopicToFollow) -> i32 {
    match topic {
        TopicToFollow::CatchAll => 0,
        TopicToFollow::NeuronManagement => 1,
        TopicToFollow::ExchangeRate => 2,
        TopicToFollow::NetworkEconomics => 3,
        TopicToFollow::Governance => 4,
        TopicToFollow::NodeAdmin => 5,
        TopicToFollow::ParticipantManagement => 6,
        TopicToFollow::SubnetManagement => 7,
        TopicToFollow::ApplicationCanisterManagement => 8,
        TopicToFollow::Kyc => 9,
        TopicToFollow::NodeProviderRewards => 10,
        TopicToFollow::IcOsVersionDeployment => 12,
        TopicToFollow::IcOsVersionElection => 13,
        TopicToFollow::SnsAndCommunityFund => 14,
        TopicToFollow::ApiBoundaryNodeManagement => 15,
        TopicToFollow::SubnetRental => 16,
        TopicToFollow::ProtocolCanisterManagement => 17,
        TopicToFollow::ServiceNervousSystemManagement => 18,
    }
}

fn known_data(data: &KnownNeuronData, id: u64) -> KnownNeuron {
    KnownNeuron {
        id,
        name: data.name.chars().take(256).collect(),
    }
}

fn normalize_neuron(neuron: Neuron) -> (NeuronEvidence, usize) {
    let id = neuron.id.as_ref().map_or(0, |id| id.id);
    let mut unknown = 0;
    let committed_topics = neuron
        .known_neuron_data
        .as_ref()
        .and_then(|d| d.committed_topics.as_ref())
        .map(|topics| {
            topics
                .iter()
                .filter_map(|topic| match topic {
                    Some(topic) => Some(topic_code(topic)),
                    None => {
                        unknown += 1;
                        None
                    }
                })
                .collect()
        })
        .unwrap_or_default();
    let known_data = neuron.known_neuron_data.as_ref().map(|d| known_data(d, id));
    let followees = neuron
        .followees
        .into_iter()
        .map(|(topic, ids)| (topic, ids.followees.into_iter().map(|id| id.id).collect()))
        .collect();
    let (dissolve_delay_seconds, dissolving) = match neuron.dissolve_state {
        Some(DissolveState::DissolveDelaySeconds(delay)) => (Some(delay), Some(false)),
        Some(DissolveState::WhenDissolvedTimestampSeconds(_)) => (None, Some(true)),
        None => (None, None),
    };
    let effective_stake_e8s = neuron
        .cached_neuron_stake_e8s
        .checked_sub(neuron.neuron_fees_e8s)
        .and_then(|v| v.checked_add(neuron.staked_maturity_e8s_equivalent.unwrap_or(0)));
    (
        NeuronEvidence {
            id,
            controller: neuron.controller,
            known_data,
            hot_keys: neuron.hot_keys,
            not_for_profit: Some(neuron.not_for_profit),
            dissolve_delay_seconds,
            dissolving,
            effective_stake_e8s,
            voting_power_refreshed_timestamp_seconds: neuron
                .voting_power_refreshed_timestamp_seconds,
            potential_voting_power: neuron.potential_voting_power,
            deciding_voting_power: neuron.deciding_voting_power,
            committed_topics,
            followees,
        },
        unknown,
    )
}

async fn collect_live(neuron_id: u64) -> Result<ComplianceSnapshot, DendriteError> {
    let now = ic_cdk::api::time() / 1_000_000_000;
    let catalogue = ic_clients::fetch_known_neuron_catalogue()
        .await
        .map_err(|e| DendriteError::Upstream(e.to_string()))?;
    let known_neurons: BTreeMap<u64, KnownNeuron> = catalogue
        .known_neurons
        .into_iter()
        .filter_map(|known| {
            let id = known.id?.id;
            let data = known.known_neuron_data?;
            Some((id, known_data(&data, id)))
        })
        .collect();
    let target_response = ic_clients::fetch_public_full_neurons(vec![neuron_id])
        .await
        .map_err(|e| DendriteError::Upstream(e.to_string()))?;
    let target_raw = target_response
        .full_neurons
        .into_iter()
        .find(|n| n.id.as_ref().is_some_and(|id| id.id == neuron_id));
    let Some(target_raw) = target_raw else {
        let evidence = EvaluationEvidence {
            now_seconds: now,
            target: None,
            dependencies: BTreeMap::new(),
            known_neurons,
            controller: None,
            start_reducing_voting_power_after_seconds: None,
            source_errors: vec![],
            unknown_committed_topics: 0,
            requested_neuron_ids: vec![neuron_id],
        };
        return Ok(evaluate(neuron_id, &evidence, SOURCE_REVISION));
    };
    let (target, unknown_committed_topics) = normalize_neuron(target_raw);
    let mut requested = vec![ALPHA_VOTE_NEURON_ID, OMEGA_REJECT_NEURON_ID];
    requested.extend(target.followees.get(&1).into_iter().flatten().copied());
    for topic in &target.committed_topics {
        requested.extend(target.followees.get(topic).into_iter().flatten().copied());
    }
    requested.sort_unstable();
    requested.dedup();
    let dependency_response = ic_clients::fetch_public_full_neurons(requested.clone())
        .await
        .map_err(|e| DendriteError::Upstream(e.to_string()))?;
    let dependencies = dependency_response
        .full_neurons
        .into_iter()
        .map(normalize_neuron)
        .map(|(n, _)| (n.id, n))
        .collect();
    let economics = ic_clients::fetch_network_economics()
        .await
        .map_err(|e| DendriteError::Upstream(e.to_string()))?;
    let controller = match target.controller {
        Some(principal) => Some(
            ic_clients::inspect_controller_canister(principal)
                .await
                .map(|info| ControllerEvidence {
                    call_succeeded: true,
                    module_hash: info.module_hash,
                    controllers: info.controllers,
                })
                .unwrap_or_else(|_| ControllerEvidence {
                    call_succeeded: false,
                    module_hash: None,
                    controllers: vec![],
                }),
        ),
        None => None,
    };
    let evidence = EvaluationEvidence {
        now_seconds: now,
        target: Some(target),
        dependencies,
        known_neurons,
        controller,
        start_reducing_voting_power_after_seconds: economics
            .voting_power_economics
            .and_then(|v| v.start_reducing_voting_power_after_seconds),
        source_errors: vec![],
        unknown_committed_topics,
        requested_neuron_ids: requested,
    };
    Ok(evaluate(neuron_id, &evidence, SOURCE_REVISION))
}

ic_cdk::export_candid!();

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn fixed_protocol_configuration() {
        let c = get_standard_config();
        assert_eq!(c.alpha_vote_neuron_id, 2_947_465_672_511_369);
        assert_eq!(c.omega_reject_neuron_id, 18_422_777_432_977_120_264);
        assert_eq!(c.governance_canister_id, "rrkah-fqaaa-aaaaa-aaaaq-cai");
    }
    #[test]
    fn public_status_contains_only_operational_state() {
        assert_eq!(get_public_status().schema_version, 1);
    }
}
