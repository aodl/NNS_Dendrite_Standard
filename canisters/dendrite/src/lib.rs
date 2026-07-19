#![forbid(unsafe_code)]

use candid::{CandidType, Deserialize, Principal};
use dendrite_types::{
    ALPHA_VOTE_NEURON_ID, ComplianceSnapshot, ControllerEvidence, EvaluationEvidence, KnownNeuron,
    NeuronEvidence, OMEGA_REJECT_NEURON_ID, SOURCE_REVISION, evaluate,
};
use ic_clients::{
    CanisterInfoResponse, DissolveState, KnownNeuronData, ListNeuronsResponse, Neuron, SourceError,
    TopicToFollow,
};
use std::{cell::RefCell, collections::BTreeMap};

mod assets;
mod rate_limit;
use rate_limit::{CheckGuard, Rejection};

thread_local! { static CHECK_GUARD: RefCell<CheckGuard> = RefCell::new(CheckGuard::default()); }

fn mutate_check_guard<T>(mutate: impl FnOnce(&mut CheckGuard) -> T) -> T {
    CHECK_GUARD.with_borrow_mut(mutate)
}

#[ic_cdk::init]
fn init() {
    assets::certify_assets();
}
#[ic_cdk::post_upgrade]
fn post_upgrade() {
    CHECK_GUARD.with_borrow_mut(|guard| *guard = CheckGuard::default());
    assets::certify_assets();
}
#[ic_cdk::query]
fn http_request(request: assets::HttpRequest) -> assets::HttpResponse {
    assets::http_request(request)
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum DendriteError {
    InvalidNeuronId(String),
    TemporarilyUnavailable(String),
    Upstream(String),
    GlobalRateLimit { retry_after_seconds: u64 },
    ConcurrencyLimit,
    DuplicateInFlight,
    LowCycles,
}

#[ic_cdk::update]
async fn check_neuron(neuron_id: u64) -> Result<ComplianceSnapshot, DendriteError> {
    if neuron_id == 0 {
        return Err(DendriteError::InvalidNeuronId(
            "neuron ID must be non-zero".into(),
        ));
    }
    let now = ic_cdk::api::time() / 1_000_000_000;
    let cycles = ic_cdk::api::canister_liquid_cycle_balance();
    mutate_check_guard(|guard| guard.begin(neuron_id, now, cycles)).map_err(|rejection| {
        match rejection {
            Rejection::GlobalRate(retry_after_seconds) => DendriteError::GlobalRateLimit {
                retry_after_seconds,
            },
            Rejection::Concurrency => DendriteError::ConcurrencyLimit,
            Rejection::Duplicate => DendriteError::DuplicateInFlight,
            Rejection::LowCycles => DendriteError::LowCycles,
        }
    })?;
    let result = collect_live(neuron_id).await;
    mutate_check_guard(|guard| guard.finish(neuron_id));
    result
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
        description: data
            .description
            .as_ref()
            .map(|value| value.chars().take(2_048).collect()),
        links: data.links.clone().unwrap_or_default(),
    }
}

fn has_duplicate_topic_keys(neuron: &Neuron) -> bool {
    let mut topics = std::collections::BTreeSet::new();
    neuron
        .followees
        .iter()
        .any(|(topic, _)| !topics.insert(*topic))
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
    async fn list_neurons(&self, ids: Vec<u64>) -> Result<ListNeuronsResponse, SourceError>;
    async fn canister_info(
        &self,
        canister_id: Principal,
    ) -> Result<CanisterInfoResponse, SourceError>;
}

fn dependency_batches(ids: &[u64]) -> Result<Vec<Vec<u64>>, DendriteError> {
    if ids.len() > 257 {
        return Err(DendriteError::Upstream(
            "dependency graph exceeds the fixed 257-neuron bound".into(),
        ));
    }
    Ok(ids.chunks(50).map(<[u64]>::to_vec).collect())
}

struct ProductionEvidenceClient;
impl EvidenceClient for ProductionEvidenceClient {
    async fn list_neurons(&self, ids: Vec<u64>) -> Result<ListNeuronsResponse, SourceError> {
        ic_clients::fetch_public_full_neurons(ids).await
    }

    async fn canister_info(
        &self,
        canister_id: Principal,
    ) -> Result<CanisterInfoResponse, SourceError> {
        ic_clients::inspect_controller_canister(canister_id).await
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
    let target_response = match client.list_neurons(vec![neuron_id]).await {
        Ok(value) => Some(value),
        Err(error) => {
            source_errors.push(error.to_string());
            None
        }
    };
    let mut target_matches = Vec::new();
    for neuron in target_response
        .into_iter()
        .flat_map(|response| response.full_neurons)
    {
        if has_duplicate_topic_keys(&neuron) {
            source_errors.push("list_neurons target contains duplicate topic-map keys".into());
            continue;
        }
        if neuron.id.as_ref().is_some_and(|id| id.id == neuron_id) {
            target_matches.push(neuron);
        } else {
            source_errors.push("list_neurons returned an unexpected target record".into());
        }
    }
    if target_matches.len() > 1 {
        source_errors.push(format!(
            "list_neurons returned duplicate target neuron ID {neuron_id}"
        ));
    }
    let Some(target_raw) = target_matches.pop() else {
        let evidence = EvaluationEvidence {
            now_seconds: now,
            target: None,
            dependencies: BTreeMap::new(),
            known_neurons: BTreeMap::new(),
            controller: None,
            start_reducing_voting_power_after_seconds: Some(
                dendrite_types::SIX_NOMINAL_MONTHS_SECONDS,
            ),
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
    let mut dependencies = BTreeMap::new();
    for batch in dependency_batches(&requested)? {
        match client.list_neurons(batch.clone()).await {
            Ok(response) => {
                for raw in response.full_neurons {
                    if has_duplicate_topic_keys(&raw) {
                        source_errors.push(
                            "list_neurons dependency contains duplicate topic-map keys".into(),
                        );
                        continue;
                    }
                    let (neuron, unknown) = normalize_neuron(raw);
                    if neuron.id == 0 || !batch.contains(&neuron.id) {
                        source_errors.push(
                            "list_neurons returned an invalid or unexpected dependency record"
                                .into(),
                        );
                        continue;
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
            }
            Err(error) => source_errors.push(error.to_string()),
        }
    }
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
    let known_neurons = std::iter::once((&target.id, &target))
        .chain(dependencies.iter())
        .filter_map(|(id, neuron)| neuron.known_data.clone().map(|known| (*id, known)))
        .collect();
    let evidence = EvaluationEvidence {
        now_seconds: now,
        target: Some(target),
        dependencies,
        known_neurons,
        controller,
        start_reducing_voting_power_after_seconds: Some(dendrite_types::SIX_NOMINAL_MONTHS_SECONDS),
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
    use ic_clients::{NeuronId, SourceErrorKind};
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
        neurons: TestRefCell<VecDeque<Result<ListNeuronsResponse, SourceError>>>,
        calls: TestRefCell<Vec<Vec<u64>>>,
    }
    impl EvidenceClient for FakeClient {
        async fn list_neurons(&self, ids: Vec<u64>) -> Result<ListNeuronsResponse, SourceError> {
            self.calls.borrow_mut().push(ids);
            self.neurons
                .borrow_mut()
                .pop_front()
                .expect("unexpected list_neurons call")
        }
        async fn canister_info(
            &self,
            _canister_id: Principal,
        ) -> Result<CanisterInfoResponse, SourceError> {
            Ok(CanisterInfoResponse {
                total_num_changes: 0,
                recent_changes: vec![],
                module_hash: None,
                controllers: vec![],
            })
        }
    }
    fn source_error(message: &str) -> SourceError {
        SourceError {
            destination: ic_clients::NNS_GOVERNANCE,
            method: "list_neurons",
            kind: SourceErrorKind::Rejected,
            message: message.into(),
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
        FakeClient {
            neurons: TestRefCell::new(VecDeque::from([
                Ok(response(vec![target])),
                Ok(response(dependencies)),
            ])),
            calls: TestRefCell::new(vec![]),
        }
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
    fn dependency_batches_are_never_larger_than_fifty() {
        for (count, expected) in [(50, vec![50]), (51, vec![50, 1]), (101, vec![50, 50, 1])] {
            let ids: Vec<_> = (0..count).collect();
            let batches = dependency_batches(&ids).unwrap();
            assert_eq!(batches.iter().map(Vec::len).collect::<Vec<_>>(), expected);
        }
        assert!(dependency_batches(&(0..258).collect::<Vec<_>>()).is_err());
    }
    #[test]
    fn collector_transport_rejection_is_indeterminate() {
        let client = FakeClient {
            neurons: TestRefCell::new(VecDeque::from([Err(source_error("neurons rejected"))])),
            calls: TestRefCell::new(vec![]),
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
                .any(|e| e.contains("neurons rejected"))
        );
    }
    #[test]
    fn collector_records_missing_target_from_successful_response() {
        let client = FakeClient {
            neurons: TestRefCell::new(VecDeque::from([Ok(empty_neurons())])),
            calls: TestRefCell::new(vec![]),
        };
        let snapshot = block_on(collect_with(&client, 7, 1_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::NonCompliant
        );
        assert!(snapshot.source_errors.is_empty());
        assert_eq!(client.calls.borrow().as_slice(), &[vec![7]]);
    }
    #[test]
    fn collector_compliant_graph_uses_the_production_pipeline() {
        let client = compliant_client();
        let snapshot = block_on(collect_with(&client, 42, 1_000_000)).unwrap();
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
        assert_eq!(client.calls.borrow()[0], vec![42]);
        assert_eq!(client.calls.borrow()[1].len(), 7);
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
    fn collector_dependency_omission_is_factual_non_compliance() {
        let client = compliant_client();
        client.neurons.borrow_mut()[1]
            .as_mut()
            .unwrap()
            .full_neurons
            .retain(|neuron| neuron.id.as_ref().is_none_or(|id| id.id != 100));
        let snapshot = block_on(collect_with(&client, 42, 1_000_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::NonCompliant
        );
        assert!(snapshot.source_errors.is_empty());
        assert!(snapshot.rules.iter().any(|rule| {
            rule.rule_id == "DENDRITE-NM-004" && rule.status == dendrite_types::RuleStatus::Fail
        }));
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
            neurons: TestRefCell::new(VecDeque::from([Err(source_error(
                "list_neurons response exceeds bound",
            ))])),
            calls: TestRefCell::new(vec![]),
        };
        let snapshot = block_on(collect_with(&client, 42, 1_000_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::Indeterminate
        );
        assert!(snapshot.source_errors[0].contains("exceeds bound"));
    }
    #[test]
    fn collector_uses_dependencies_even_when_target_has_no_known_data() {
        let mut target = raw_neuron(42, vec![]);
        target.known_neuron_data = None;
        let client = FakeClient {
            neurons: TestRefCell::new(VecDeque::from([
                Ok(response(vec![target])),
                Ok(response(vec![
                    raw_neuron(ALPHA_VOTE_NEURON_ID, vec![]),
                    raw_neuron(OMEGA_REJECT_NEURON_ID, vec![]),
                ])),
            ])),
            calls: TestRefCell::new(vec![]),
        };
        let snapshot = block_on(collect_with(&client, 42, 1_000_000)).unwrap();
        assert_eq!(
            snapshot.overall_status,
            dendrite_types::ComplianceStatus::NonCompliant
        );
        assert!(snapshot.rules.iter().any(|rule| {
            rule.rule_id == "DENDRITE-KNOWN-002" && rule.status == dendrite_types::RuleStatus::Fail
        }));
        assert_eq!(client.calls.borrow().len(), 2);
    }
}
