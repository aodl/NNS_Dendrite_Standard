#![forbid(unsafe_code)]

use candid::Principal;
use dendrite_types::{ALPHA_VOTE_NEURON_ID, MAX_DISSOLVE_DELAY_SECONDS, OMEGA_REJECT_NEURON_ID};
use ic_clients::{
    DissolveState, Followees, KnownNeuronData, ListNeurons, ListNeuronsResponse, Neuron, NeuronId,
    NeuronInfo, TopicToFollow,
};
use std::cell::Cell;

thread_local! { static CONTROLLER: Cell<Principal> = const { Cell::new(Principal::anonymous()) }; }

const RETRIEVED_AT_TIMESTAMP_SECONDS: u64 = 1_700_000_000;

#[ic_cdk::init]
fn init(controller: Principal) {
    CONTROLLER.with(|value| value.set(controller));
}

fn neuron(id: u64, followees: Vec<(i32, Vec<u64>)>) -> Neuron {
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
            MAX_DISSOLVE_DELAY_SECONDS,
        )),
        followees: followees
            .into_iter()
            .map(|(topic, ids)| {
                (
                    topic,
                    Followees {
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
        voting_power_refreshed_timestamp_seconds: Some(1_699_999_999),
        deciding_voting_power: Some(10),
        potential_voting_power: Some(10),
    }
}

fn fixtures() -> Vec<Neuron> {
    let managers = [100, 101, 102, 103, 104];
    let mut following = vec![(1, managers.to_vec()), (4, vec![100, 101, 102])];
    for topic in [0, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18] {
        following.push((topic, vec![ALPHA_VOTE_NEURON_ID]));
    }
    let mut target = neuron(42, following.clone());
    target.controller = Some(CONTROLLER.with(Cell::get));
    target.known_neuron_data.as_mut().unwrap().committed_topics =
        Some(vec![Some(TopicToFollow::Governance)]);
    let mut non_compliant = target.clone();
    non_compliant.id = Some(NeuronId { id: 43 });
    non_compliant.hot_keys.push(Principal::anonymous());
    let dependencies = managers.into_iter().map(|id| {
        neuron(
            id,
            if id <= 102 {
                vec![(4, vec![OMEGA_REJECT_NEURON_ID])]
            } else {
                vec![]
            },
        )
    });
    [target, non_compliant]
        .into_iter()
        .chain(dependencies)
        .chain([
            neuron(ALPHA_VOTE_NEURON_ID, vec![]),
            neuron(OMEGA_REJECT_NEURON_ID, vec![]),
        ])
        .collect()
}

#[ic_cdk::query]
fn list_neurons(request: ListNeurons) -> ListNeuronsResponse {
    let full_neurons: Vec<_> = fixtures()
        .into_iter()
        .filter(|neuron| {
            neuron
                .id
                .as_ref()
                .is_some_and(|id| request.neuron_ids.contains(&id.id))
        })
        .collect();
    ListNeuronsResponse {
        neuron_infos: full_neurons
            .iter()
            .filter_map(|neuron| {
                neuron.id.as_ref().map(|id| {
                    (
                        id.id,
                        NeuronInfo {
                            retrieved_at_timestamp_seconds: RETRIEVED_AT_TIMESTAMP_SECONDS,
                        },
                    )
                })
            })
            .collect(),
        full_neurons,
        total_pages_available: Some(1),
    }
}
