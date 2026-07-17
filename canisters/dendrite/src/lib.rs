#![forbid(unsafe_code)]

use candid::{CandidType, Deserialize};
use dendrite_types::{
    ALPHA_VOTE_NEURON_ID, ComplianceSnapshot, MAX_CACHED_SNAPSHOTS, OMEGA_REJECT_NEURON_ID,
    STANDARD_VERSION,
};
use std::{cell::RefCell, collections::BTreeMap};

const NNS_GOVERNANCE_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai";
const SOURCE_REVISION: &str = "a8d582a62b8aa5b958786f7f595e0572f888f1f8";

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
    proposal_history_stored: bool,
}
#[derive(Clone, CandidType, Deserialize)]
pub enum DendriteError {
    InvalidNeuronId(String),
    TemporarilyUnavailable(String),
    Upstream(String),
}

thread_local! { static CACHE: RefCell<BTreeMap<u64, ComplianceSnapshot>> = const { RefCell::new(BTreeMap::new()) }; }

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
    CACHE.with_borrow(|cache| cache.get(&neuron_id).cloned())
}

#[ic_cdk::query]
fn get_public_status() -> PublicStatus {
    PublicStatus {
        schema_version: 1,
        cached_snapshots: CACHE.with_borrow(|c| c.len() as u16),
        proposal_history_stored: false,
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
    if let Some(snapshot) = CACHE.with_borrow(|c| c.get(&neuron_id).cloned()) {
        let now = ic_cdk::api::time() / 1_000_000_000;
        if now <= snapshot.stale_after_timestamp_seconds {
            return Ok(snapshot);
        }
    }
    Err(DendriteError::TemporarilyUnavailable(
        "live NNS evidence adapter is not configured in this build".into(),
    ))
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
    fn no_history_state() {
        assert!(!get_public_status().proposal_history_stored);
    }
}
