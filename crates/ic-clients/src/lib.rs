#![forbid(unsafe_code)]

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::call::Call;
use std::fmt;

pub const NNS_GOVERNANCE: Principal = Principal::from_slice(&[0, 0, 0, 0, 0, 0, 0, 1, 1, 1]);
pub const MANAGEMENT_CANISTER: Principal = Principal::management_canister();
pub const MAX_REQUESTED_NEURONS: usize = 50;
pub const MAX_FULL_NEURONS: usize = 50;
pub const MAX_FOLLOWEES: usize = 15;
pub const MAX_TEXT_BYTES: usize = 2_048;
pub const MAX_LINKS: usize = 16;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SourceError {
    pub destination: Principal,
    pub method: &'static str,
    pub kind: SourceErrorKind,
    pub message: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SourceErrorKind {
    Rejected,
    DecodeFailed,
    InvalidResponse,
    ResponseTooLarge,
}

impl fmt::Display for SourceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} {}: {}", self.destination, self.method, self.message)
    }
}

fn bounded_message(value: impl fmt::Display) -> String {
    value.to_string().chars().take(512).collect()
}
fn call_error(
    destination: Principal,
    method: &'static str,
    error: impl fmt::Display,
) -> SourceError {
    SourceError {
        destination,
        method,
        kind: SourceErrorKind::Rejected,
        message: bounded_message(error),
    }
}
fn decode_error(
    destination: Principal,
    method: &'static str,
    error: impl fmt::Display,
) -> SourceError {
    SourceError {
        destination,
        method,
        kind: SourceErrorKind::DecodeFailed,
        message: bounded_message(error),
    }
}
fn invalid_response(destination: Principal, method: &'static str, message: &str) -> SourceError {
    SourceError {
        destination,
        method,
        kind: SourceErrorKind::InvalidResponse,
        message: message.into(),
    }
}

fn response_too_large(destination: Principal, method: &'static str, message: &str) -> SourceError {
    SourceError {
        destination,
        method,
        kind: SourceErrorKind::ResponseTooLarge,
        message: message.into(),
    }
}

#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub struct NeuronId {
    pub id: u64,
}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub struct Followees {
    pub followees: Vec<NeuronId>,
}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub enum TopicToFollow {
    CatchAll,
    NeuronManagement,
    ExchangeRate,
    NetworkEconomics,
    Governance,
    NodeAdmin,
    ParticipantManagement,
    SubnetManagement,
    Kyc,
    NodeProviderRewards,
    IcOsVersionDeployment,
    IcOsVersionElection,
    SnsAndCommunityFund,
    ApiBoundaryNodeManagement,
    SubnetRental,
    ApplicationCanisterManagement,
    ProtocolCanisterManagement,
    ServiceNervousSystemManagement,
}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub struct KnownNeuronData {
    pub name: String,
    pub description: Option<String>,
    pub links: Option<Vec<String>>,
    pub committed_topics: Option<Vec<Option<TopicToFollow>>>,
}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub enum DissolveState {
    DissolveDelaySeconds(u64),
    WhenDissolvedTimestampSeconds(u64),
}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub struct Neuron {
    pub id: Option<NeuronId>,
    pub staked_maturity_e8s_equivalent: Option<u64>,
    pub controller: Option<Principal>,
    pub not_for_profit: bool,
    pub maturity_e8s_equivalent: u64,
    pub cached_neuron_stake_e8s: u64,
    pub created_timestamp_seconds: u64,
    pub auto_stake_maturity: Option<bool>,
    pub aging_since_timestamp_seconds: u64,
    pub hot_keys: Vec<Principal>,
    pub dissolve_state: Option<DissolveState>,
    pub followees: Vec<(i32, Followees)>,
    pub neuron_fees_e8s: u64,
    pub visibility: Option<i32>,
    pub known_neuron_data: Option<KnownNeuronData>,
    pub voting_power_refreshed_timestamp_seconds: Option<u64>,
    pub deciding_voting_power: Option<u64>,
    pub potential_voting_power: Option<u64>,
}
#[derive(Clone, Debug, CandidType, Eq, PartialEq)]
pub struct ListNeurons {
    pub neuron_ids: Vec<u64>,
    pub include_neurons_readable_by_caller: bool,
    pub include_empty_neurons_readable_by_caller: Option<bool>,
    pub include_public_neurons_in_full_neurons: Option<bool>,
    pub page_number: Option<u64>,
    pub page_size: Option<u64>,
    pub neuron_subaccounts: Option<Vec<NeuronSubaccount>>,
}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub struct NeuronSubaccount {
    pub subaccount: Vec<u8>,
}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub struct NeuronInfo {
    pub dissolve_delay_seconds: u64,
    pub recent_ballots: Vec<Reserved>,
    pub neuron_type: Option<i32>,
    pub created_timestamp_seconds: u64,
    pub state: i32,
    pub stake_e8s: u64,
    pub joined_community_fund_timestamp_seconds: Option<u64>,
    pub retrieved_at_timestamp_seconds: u64,
    pub known_neuron_data: Option<KnownNeuronData>,
    pub voting_power_refreshed_timestamp_seconds: Option<u64>,
    pub voting_power: u64,
    pub visibility: Option<i32>,
    pub deciding_voting_power: Option<u64>,
    pub potential_voting_power: Option<u64>,
}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub struct Reserved {}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub struct ListNeuronsResponse {
    pub neuron_infos: Vec<(u64, NeuronInfo)>,
    pub full_neurons: Vec<Neuron>,
    pub total_pages_available: Option<u64>,
}
#[derive(Clone, Debug, CandidType, Eq, PartialEq)]
pub struct CanisterInfoRequest {
    pub canister_id: Principal,
    pub num_requested_changes: Option<u64>,
}
#[derive(Clone, Debug, CandidType, Deserialize, Eq, PartialEq)]
pub struct CanisterInfoResponse {
    pub total_num_changes: u64,
    pub recent_changes: Vec<Reserved>,
    pub module_hash: Option<Vec<u8>>,
    pub controllers: Vec<Principal>,
}

fn validate_neurons(response: ListNeuronsResponse) -> Result<ListNeuronsResponse, SourceError> {
    if response.full_neurons.len() > MAX_FULL_NEURONS
        || response.neuron_infos.len() > MAX_FULL_NEURONS
    {
        return Err(response_too_large(
            NNS_GOVERNANCE,
            "list_neurons",
            "neuron response exceeds bound",
        ));
    }
    if response.full_neurons.iter().any(|n| {
        n.hot_keys.len() > MAX_FOLLOWEES
            || n.followees.len() > 32
            || n.followees
                .iter()
                .any(|(_, f)| f.followees.len() > MAX_FOLLOWEES)
            || n.known_neuron_data.as_ref().is_some_and(|data| {
                data.name.len() > MAX_TEXT_BYTES
                    || data
                        .description
                        .as_ref()
                        .is_some_and(|value| value.len() > MAX_TEXT_BYTES)
                    || data.links.as_ref().is_some_and(|links| {
                        links.len() > MAX_LINKS
                            || links.iter().any(|value| value.len() > MAX_TEXT_BYTES)
                    })
            })
    }) {
        return Err(response_too_large(
            NNS_GOVERNANCE,
            "list_neurons",
            "neuron nested vector exceeds bound",
        ));
    }
    for neuron in &response.full_neurons {
        let mut topics = std::collections::BTreeSet::new();
        if neuron
            .followees
            .iter()
            .any(|(topic, _)| !topics.insert(*topic))
        {
            return Err(invalid_response(
                NNS_GOVERNANCE,
                "list_neurons",
                "neuron response contains duplicate topic-map keys",
            ));
        }
    }
    Ok(response)
}
pub async fn fetch_public_full_neurons(ids: Vec<u64>) -> Result<ListNeuronsResponse, SourceError> {
    if ids.is_empty() || ids.len() > MAX_REQUESTED_NEURONS {
        return Err(invalid_response(
            NNS_GOVERNANCE,
            "list_neurons",
            "requested neuron count is outside bounds",
        ));
    }
    let request = ListNeurons {
        neuron_ids: ids,
        include_neurons_readable_by_caller: false,
        include_empty_neurons_readable_by_caller: Some(false),
        include_public_neurons_in_full_neurons: Some(true),
        page_number: Some(0),
        page_size: Some(MAX_REQUESTED_NEURONS as u64),
        neuron_subaccounts: None,
    };
    let response = Call::bounded_wait(NNS_GOVERNANCE, "list_neurons")
        .with_arg(request)
        .await
        .map_err(|e| call_error(NNS_GOVERNANCE, "list_neurons", e))?
        .candid::<ListNeuronsResponse>()
        .map_err(|e| decode_error(NNS_GOVERNANCE, "list_neurons", e))?;
    validate_neurons(response)
}
pub async fn inspect_controller_canister(
    canister_id: Principal,
) -> Result<CanisterInfoResponse, SourceError> {
    let request = CanisterInfoRequest {
        canister_id,
        num_requested_changes: Some(0),
    };
    let response = Call::bounded_wait(MANAGEMENT_CANISTER, "canister_info")
        .with_arg(request)
        .await
        .map_err(|e| call_error(MANAGEMENT_CANISTER, "canister_info", e))?
        .candid::<CanisterInfoResponse>()
        .map_err(|e| decode_error(MANAGEMENT_CANISTER, "canister_info", e))?;
    if !response.recent_changes.is_empty()
        || response.module_hash.as_ref().is_some_and(|v| v.len() > 64)
        || response.controllers.len() > 10
    {
        return Err(response_too_large(
            MANAGEMENT_CANISTER,
            "canister_info",
            "canister_info response exceeds bound",
        ));
    }
    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::{decode_one, encode_one};
    use std::{
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
    #[test]
    fn official_shapes_decode() {
        let info = CanisterInfoResponse {
            total_num_changes: 0,
            recent_changes: vec![],
            module_hash: None,
            controllers: vec![],
        };
        assert_eq!(
            decode_one::<CanisterInfoResponse>(&encode_one(info.clone()).unwrap()).unwrap(),
            info
        );
    }
    #[test]
    fn fixed_destinations_are_exact() {
        assert_eq!(NNS_GOVERNANCE.to_text(), "rrkah-fqaaa-aaaaa-aaaaq-cai");
        assert_eq!(MANAGEMENT_CANISTER, Principal::management_canister());
    }
    #[test]
    fn source_errors_are_typed_and_bounded() {
        let rejected = call_error(NNS_GOVERNANCE, "method", "x".repeat(600));
        assert_eq!(rejected.kind, SourceErrorKind::Rejected);
        assert_eq!(rejected.message.chars().count(), 512);
        assert!(rejected.to_string().contains("method"));
        let decoded = decode_error(MANAGEMENT_CANISTER, "canister_info", "bad wire");
        assert_eq!(decoded.kind, SourceErrorKind::DecodeFailed);
        assert_eq!(decoded.message, "bad wire");
    }
    #[test]
    fn invalid_request_count_never_reaches_an_outbound_call() {
        for ids in [vec![], vec![1; MAX_REQUESTED_NEURONS + 1]] {
            let error = block_on(fetch_public_full_neurons(ids)).unwrap_err();
            assert_eq!(error.kind, SourceErrorKind::InvalidResponse);
            assert_eq!(error.method, "list_neurons");
        }
    }
}
