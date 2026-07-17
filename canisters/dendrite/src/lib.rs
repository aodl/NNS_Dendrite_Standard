#![forbid(unsafe_code)]

use candid::{CandidType, Deserialize, Principal};
use dendrite_types::{
    ALPHA_VOTE_NEURON_ID, ComplianceSnapshot, ControllerEvidence, EvaluationEvidence, KnownNeuron,
    MAX_CACHED_SNAPSHOTS, NeuronEvidence, OMEGA_REJECT_NEURON_ID, SOURCE_REVISION,
    STANDARD_VERSION, evaluate,
};
use ic_clients::{
    CanisterInfoResponse, DissolveState, KnownNeuronData, ListKnownNeuronsResponse,
    ListNeuronsResponse, NetworkEconomics, Neuron, TopicToFollow,
};
use std::{cell::RefCell, collections::BTreeMap};

mod assets;
mod rate_limit;
mod stable;
use rate_limit::{RefreshCounters, RefreshState, Rejection};

thread_local! { static REFRESH_STATE: RefCell<RefreshState> = RefCell::new(RefreshState::with_counters(stable::counters())); }

fn mutate_refresh_state<T>(mutate: impl FnOnce(&mut RefreshState) -> T) -> T {
    REFRESH_STATE.with_borrow_mut(|state| {
        let result = mutate(state);
        stable::set_counters(state.counters);
        result
    })
}

fn restore_refresh_state() {
    REFRESH_STATE.with_borrow_mut(|state| *state = RefreshState::with_counters(stable::counters()));
}

#[ic_cdk::init]
fn init() {
    stable::assert_compatible();
    restore_refresh_state();
    assets::certify_assets();
}
#[ic_cdk::post_upgrade]
fn post_upgrade() {
    stable::assert_compatible();
    restore_refresh_state();
    assets::certify_assets();
}
#[ic_cdk::query]
fn http_request(request: assets::HttpRequest) -> assets::HttpResponse {
    assets::http_request(request)
}

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
#[derive(Clone, Debug, CandidType, Deserialize)]
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
        schema_version: stable::metadata()
            .expect("stable metadata was validated during initialization")
            .schema_version,
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
            mutate_refresh_state(RefreshState::cache_hit);
            return Ok(snapshot);
        }
    }
    let now = ic_cdk::api::time() / 1_000_000_000;
    let cycles = ic_cdk::api::canister_liquid_cycle_balance();
    mutate_refresh_state(|state| state.begin(neuron_id, now, cycles)).map_err(|rejection| {
        match rejection {
            Rejection::Cooldown(retry_after_seconds) => DendriteError::Cooldown {
                retry_after_seconds,
            },
            Rejection::GlobalRate(retry_after_seconds) => DendriteError::GlobalRateLimit {
                retry_after_seconds,
            },
            Rejection::Concurrency => DendriteError::ConcurrencyLimit,
            Rejection::Duplicate => DendriteError::DuplicateInFlight,
            Rejection::LowCycles => DendriteError::LowCycles,
        }
    })?;
    let collected = collect_live(neuron_id).await;
    let snapshot = match collected {
        Ok(snapshot) => snapshot,
        Err(error) => {
            mutate_refresh_state(|state| state.finish(neuron_id, false, false));
            return Err(error);
        }
    };
    let mut evicted = false;
    if snapshot.overall_status != dendrite_types::ComplianceStatus::Indeterminate {
        evicted = stable::put(snapshot.clone());
    }
    mutate_refresh_state(|state| state.finish(neuron_id, true, evicted));
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

trait EvidenceClient {
    async fn known_neurons(&self) -> Result<ListKnownNeuronsResponse, String>;
    async fn full_neurons(&self, ids: Vec<u64>) -> Result<ListNeuronsResponse, String>;
    async fn economics(&self) -> Result<NetworkEconomics, String>;
    async fn canister_info(&self, canister_id: Principal) -> Result<CanisterInfoResponse, String>;
}

struct ProductionEvidenceClient;
impl EvidenceClient for ProductionEvidenceClient {
    async fn known_neurons(&self) -> Result<ListKnownNeuronsResponse, String> {
        ic_clients::fetch_known_neuron_catalogue()
            .await
            .map_err(|error| error.to_string())
    }
    async fn full_neurons(&self, ids: Vec<u64>) -> Result<ListNeuronsResponse, String> {
        ic_clients::fetch_public_full_neurons(ids)
            .await
            .map_err(|error| error.to_string())
    }
    async fn economics(&self) -> Result<NetworkEconomics, String> {
        ic_clients::fetch_network_economics()
            .await
            .map_err(|error| error.to_string())
    }
    async fn canister_info(&self, canister_id: Principal) -> Result<CanisterInfoResponse, String> {
        ic_clients::inspect_controller_canister(canister_id)
            .await
            .map_err(|error| error.to_string())
    }
}

async fn collect_live(neuron_id: u64) -> Result<ComplianceSnapshot, DendriteError> {
    collect_with(
        &ProductionEvidenceClient,
        neuron_id,
        ic_cdk::api::time() / 1_000_000_000,
    )
    .await
}

async fn collect_with(
    client: &impl EvidenceClient,
    neuron_id: u64,
    now: u64,
) -> Result<ComplianceSnapshot, DendriteError> {
    let mut source_errors = Vec::new();
    let catalogue = match client.known_neurons().await {
        Ok(value) => Some(value),
        Err(error) => {
            source_errors.push(error.to_string());
            None
        }
    };
    let mut known_neurons = BTreeMap::new();
    for known in catalogue.into_iter().flat_map(|value| value.known_neurons) {
        let (Some(id), Some(data)) = (known.id, known.known_neuron_data) else {
            source_errors.push("list_known_neurons returned an incomplete catalogue entry".into());
            continue;
        };
        if known_neurons
            .insert(id.id, known_data(&data, id.id))
            .is_some()
        {
            source_errors.push(format!(
                "list_known_neurons returned duplicate neuron ID {}",
                id.id
            ));
        }
    }
    let target_response = match client.full_neurons(vec![neuron_id]).await {
        Ok(value) => Some(value),
        Err(error) => {
            source_errors.push(error.to_string());
            None
        }
    };
    let target_call_succeeded = target_response.is_some();
    let mut target_matches: Vec<_> = target_response
        .into_iter()
        .flat_map(|value| value.full_neurons)
        .filter(|neuron| neuron.id.as_ref().is_some_and(|id| id.id == neuron_id))
        .collect();
    if target_matches.len() > 1 {
        source_errors.push(format!(
            "list_neurons returned duplicate target neuron ID {neuron_id}"
        ));
    }
    let target_raw = target_matches.pop();
    let Some(target_raw) = target_raw else {
        if target_call_succeeded {
            source_errors.push(format!(
                "list_neurons omitted requested target neuron ID {neuron_id}"
            ));
        }
        let evidence = EvaluationEvidence {
            now_seconds: now,
            target: None,
            dependencies: BTreeMap::new(),
            known_neurons,
            controller: None,
            start_reducing_voting_power_after_seconds: None,
            source_errors,
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
    let dependency_response = match client.full_neurons(requested.clone()).await {
        Ok(value) => Some(value),
        Err(error) => {
            source_errors.push(error.to_string());
            None
        }
    };
    let mut dependencies = BTreeMap::new();
    for raw in dependency_response
        .into_iter()
        .flat_map(|value| value.full_neurons)
    {
        let (neuron, unknown) = normalize_neuron(raw);
        if neuron.id == 0 {
            source_errors.push("list_neurons returned dependency without an ID".into());
            continue;
        }
        if !requested.contains(&neuron.id) {
            source_errors.push(format!(
                "list_neurons returned unrequested neuron ID {}",
                neuron.id
            ));
        }
        if unknown > 0 {
            source_errors.push(format!(
                "dependency neuron {} contained an unknown committed-topic variant",
                neuron.id
            ));
        }
        let id = neuron.id;
        if dependencies.insert(id, neuron).is_some() {
            source_errors.push(format!(
                "list_neurons returned duplicate dependency neuron ID {id}"
            ));
        }
    }
    for id in &requested {
        if !dependencies.contains_key(id) {
            source_errors.push(format!(
                "list_neurons omitted requested dependency neuron ID {id}"
            ));
        }
    }
    let economics = match client.economics().await {
        Ok(value) => Some(value),
        Err(error) => {
            source_errors.push(error.to_string());
            None
        }
    };
    let controller = match target.controller {
        Some(principal) => match client.canister_info(principal).await {
            Ok(info) => Some(ControllerEvidence {
                call_succeeded: true,
                module_hash: info.module_hash,
                controllers: info.controllers,
            }),
            Err(error) => {
                source_errors.push(error.to_string());
                Some(ControllerEvidence {
                    call_succeeded: false,
                    module_hash: None,
                    controllers: vec![],
                })
            }
        },
        None => None,
    };
    let evidence = EvaluationEvidence {
        now_seconds: now,
        target: Some(target),
        dependencies,
        known_neurons,
        controller,
        start_reducing_voting_power_after_seconds: economics
            .and_then(|value| value.voting_power_economics)
            .and_then(|v| v.start_reducing_voting_power_after_seconds),
        source_errors,
        unknown_committed_topics,
        requested_neuron_ids: requested,
    };
    Ok(evaluate(neuron_id, &evidence, SOURCE_REVISION))
}

ic_cdk::export_candid!();

#[cfg(test)]
mod tests {
    use super::*;
    use ic_clients::{KnownNeuron as UpstreamKnownNeuron, NeuronId, VotingPowerEconomics};
    use std::{
        cell::RefCell as TestRefCell,
        collections::VecDeque,
        future::Future,
        pin::pin,
        sync::Arc,
        task::{Context, Poll, Wake, Waker},
    };

    struct NoopWake;
    impl Wake for NoopWake {
        fn wake(self: Arc<Self>) {}
    }
    fn block_on<T>(future: impl Future<Output = T>) -> T {
        let waker = Waker::from(Arc::new(NoopWake));
        let mut context = Context::from_waker(&waker);
        let mut future = pin!(future);
        loop {
            match future.as_mut().poll(&mut context) {
                Poll::Ready(value) => return value,
                Poll::Pending => std::thread::yield_now(),
            }
        }
    }

    struct FakeClient {
        known: Result<ListKnownNeuronsResponse, String>,
        neurons: TestRefCell<VecDeque<Result<ListNeuronsResponse, String>>>,
    }
    impl EvidenceClient for FakeClient {
        async fn known_neurons(&self) -> Result<ListKnownNeuronsResponse, String> {
            self.known.clone()
        }
        async fn full_neurons(&self, _ids: Vec<u64>) -> Result<ListNeuronsResponse, String> {
            self.neurons
                .borrow_mut()
                .pop_front()
                .unwrap_or_else(|| Err("unexpected list_neurons call".into()))
        }
        async fn economics(&self) -> Result<NetworkEconomics, String> {
            Ok(NetworkEconomics {
                neuron_minimum_stake_e8s: 0,
                max_proposals_to_keep_per_topic: 0,
                neuron_management_fee_per_proposal_e8s: 0,
                reject_cost_e8s: 0,
                transaction_fee_e8s: 0,
                neuron_spawn_dissolve_delay_seconds: 0,
                minimum_icp_xdr_rate: 0,
                maximum_node_provider_rewards_e8s: 0,
                voting_power_economics: Some(VotingPowerEconomics {
                    start_reducing_voting_power_after_seconds: Some(100),
                    clear_following_after_seconds: None,
                    neuron_minimum_dissolve_delay_to_vote_seconds: None,
                }),
            })
        }
        async fn canister_info(
            &self,
            _canister_id: Principal,
        ) -> Result<CanisterInfoResponse, String> {
            Ok(CanisterInfoResponse {
                total_num_changes: 0,
                recent_changes: vec![],
                module_hash: None,
                controllers: vec![],
            })
        }
    }
    fn empty_neurons() -> ListNeuronsResponse {
        ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: vec![],
            total_pages_available: Some(0),
        }
    }
    fn response(neurons: Vec<Neuron>) -> ListNeuronsResponse {
        ListNeuronsResponse {
            neuron_infos: vec![],
            full_neurons: neurons,
            total_pages_available: Some(1),
        }
    }
    fn raw_neuron(id: u64, followees: Vec<(i32, Vec<u64>)>) -> Neuron {
        Neuron {
            id: Some(NeuronId { id }),
            staked_maturity_e8s_equivalent: Some(0),
            controller: None,
            not_for_profit: false,
            maturity_e8s_equivalent: 0,
            cached_neuron_stake_e8s: 100_000_000,
            created_timestamp_seconds: 1,
            auto_stake_maturity: Some(false),
            aging_since_timestamp_seconds: 1,
            hot_keys: vec![],
            dissolve_state: Some(DissolveState::DissolveDelaySeconds(
                dendrite_types::MAX_DISSOLVE_DELAY_SECONDS,
            )),
            followees: followees
                .into_iter()
                .map(|(topic, ids)| {
                    (
                        topic,
                        ic_clients::Followees {
                            followees: ids.into_iter().map(|id| NeuronId { id }).collect(),
                        },
                    )
                })
                .collect(),
            neuron_fees_e8s: 0,
            visibility: Some(2),
            known_neuron_data: Some(KnownNeuronData {
                name: format!("known-{id}"),
                description: None,
                links: None,
                committed_topics: Some(vec![]),
            }),
            voting_power_refreshed_timestamp_seconds: Some(999_999),
            deciding_voting_power: Some(10),
            potential_voting_power: Some(10),
        }
    }
    fn compliant_client() -> FakeClient {
        let managers = [100, 101, 102, 103, 104];
        let mut target_followees = vec![(1, managers.to_vec()), (4, vec![100, 101, 102])];
        for topic in [0, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18] {
            target_followees.push((topic, vec![ALPHA_VOTE_NEURON_ID]));
        }
        let mut target = raw_neuron(42, target_followees);
        target.controller = Some(Principal::from_slice(&[1]));
        target.known_neuron_data.as_mut().unwrap().committed_topics =
            Some(vec![Some(TopicToFollow::Governance)]);
        let dependencies = managers
            .into_iter()
            .map(|id| {
                raw_neuron(
                    id,
                    if id <= 102 {
                        vec![(4, vec![OMEGA_REJECT_NEURON_ID])]
                    } else {
                        vec![]
                    },
                )
            })
            .chain([
                raw_neuron(ALPHA_VOTE_NEURON_ID, vec![]),
                raw_neuron(OMEGA_REJECT_NEURON_ID, vec![]),
            ])
            .collect::<Vec<_>>();
        let known_neurons = std::iter::once(42)
            .chain(managers)
            .chain([ALPHA_VOTE_NEURON_ID, OMEGA_REJECT_NEURON_ID])
            .map(|id| UpstreamKnownNeuron {
                id: Some(NeuronId { id }),
                known_neuron_data: Some(KnownNeuronData {
                    name: format!("known-{id}"),
                    description: None,
                    links: None,
                    committed_topics: if id == 42 {
                        Some(vec![Some(TopicToFollow::Governance)])
                    } else {
                        Some(vec![])
                    },
                }),
            })
            .collect();
        FakeClient {
            known: Ok(ListKnownNeuronsResponse { known_neurons }),
            neurons: TestRefCell::new(VecDeque::from([
                Ok(response(vec![target])),
                Ok(response(dependencies)),
            ])),
        }
    }
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
    #[test]
    fn checked_in_candid_is_structurally_equal_to_rust_export() {
        let path = std::env::temp_dir().join(format!("dendrite-export-{}.did", std::process::id()));
        let exported = __export_service();
        std::fs::write(&path, &exported).expect("write temporary Candid export");
        let checked = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("dendrite.did");
        let status = std::process::Command::new("didc")
            .args(["check", "--strict"])
            .arg(&path)
            .arg(checked)
            .status()
            .expect("run didc");
        let _ = std::fs::remove_file(path);
        assert!(
            status.success(),
            "Rust Candid export drifted from dendrite.did:\n{exported}"
        );
    }
    #[test]
    fn collector_transport_rejection_is_indeterminate() {
        let client = FakeClient {
            known: Err("catalogue rejected".into()),
            neurons: TestRefCell::new(VecDeque::from([Err("neurons rejected".into())])),
        };
        let snapshot = block_on(collect_with(&client, 7, 1_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::Indeterminate
        );
        assert!(
            snapshot
                .source_errors
                .iter()
                .any(|e| e.contains("catalogue rejected"))
        );
        assert!(
            snapshot
                .source_errors
                .iter()
                .any(|e| e.contains("neurons rejected"))
        );
    }
    #[test]
    fn collector_records_missing_target_from_successful_response() {
        let client = FakeClient {
            known: Ok(ListKnownNeuronsResponse {
                known_neurons: vec![UpstreamKnownNeuron {
                    id: Some(NeuronId { id: 7 }),
                    known_neuron_data: Some(KnownNeuronData {
                        name: "target".into(),
                        description: None,
                        links: None,
                        committed_topics: None,
                    }),
                }],
            }),
            neurons: TestRefCell::new(VecDeque::from([Ok(empty_neurons())])),
        };
        let snapshot = block_on(collect_with(&client, 7, 1_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::Indeterminate
        );
        assert!(
            snapshot
                .source_errors
                .iter()
                .any(|e| { e == "list_neurons omitted requested target neuron ID 7" })
        );
    }
    #[test]
    fn collector_compliant_graph_uses_the_production_pipeline() {
        let snapshot = block_on(collect_with(&compliant_client(), 42, 1_000_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::Compliant
        );
        assert!(snapshot.source_errors.is_empty());
        assert!(
            snapshot
                .rules
                .iter()
                .all(|rule| rule.status == dendrite_types::RuleStatus::Pass)
        );
        assert_eq!(snapshot.quorum_threshold, Some(3));
    }
    #[test]
    fn collector_defective_graph_is_non_compliant() {
        let client = compliant_client();
        client.neurons.borrow_mut()[0]
            .as_mut()
            .unwrap()
            .full_neurons[0]
            .hot_keys
            .push(Principal::anonymous());
        let snapshot = block_on(collect_with(&client, 42, 1_000_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::NonCompliant
        );
        assert!(snapshot.rules.iter().any(|rule| {
            rule.rule_id == "DENDRITE-CONTROL-004"
                && rule.status == dendrite_types::RuleStatus::Fail
        }));
    }
    #[test]
    fn collector_incomplete_dependency_graph_is_indeterminate() {
        let client = compliant_client();
        client.neurons.borrow_mut()[1]
            .as_mut()
            .unwrap()
            .full_neurons
            .retain(|neuron| neuron.id.as_ref().is_none_or(|id| id.id != 100));
        let snapshot = block_on(collect_with(&client, 42, 1_000_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::Indeterminate
        );
        assert!(
            snapshot
                .source_errors
                .iter()
                .any(|error| error.contains("100"))
        );
    }
    #[test]
    fn collector_unknown_committed_variant_requires_update() {
        let client = compliant_client();
        client.neurons.borrow_mut()[0]
            .as_mut()
            .unwrap()
            .full_neurons[0]
            .known_neuron_data
            .as_mut()
            .unwrap()
            .committed_topics = Some(vec![Some(TopicToFollow::Governance), None]);
        let snapshot = block_on(collect_with(&client, 42, 1_000_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::StandardUpdateRequired
        );
    }
    #[test]
    fn collector_over_limit_client_error_is_indeterminate() {
        let client = FakeClient {
            known: Ok(ListKnownNeuronsResponse {
                known_neurons: vec![],
            }),
            neurons: TestRefCell::new(VecDeque::from([Err(
                "list_neurons response exceeds bound".into()
            )])),
        };
        let snapshot = block_on(collect_with(&client, 42, 1_000_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::Indeterminate
        );
        assert!(snapshot.source_errors[0].contains("exceeds bound"));
    }
}
