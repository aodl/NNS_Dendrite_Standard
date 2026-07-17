use candid::{decode_one, encode_one};
use dendrite_types::{ComplianceSnapshot, MAX_CACHED_SNAPSHOTS};
use ic_stable_structures::{
    DefaultMemoryImpl, StableBTreeMap, Storable,
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::Bound,
};
use std::{borrow::Cow, cell::RefCell};

const MAX_SNAPSHOT_BYTES: u32 = 1_048_576;
type Memory = VirtualMemory<DefaultMemoryImpl>;

#[derive(Clone)]
struct StableSnapshot(ComplianceSnapshot);
impl Storable for StableSnapshot {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(encode_one(&self.0).expect("bounded snapshot Candid encoding"))
    }
    fn into_bytes(self) -> Vec<u8> {
        encode_one(&self.0).expect("bounded snapshot Candid encoding")
    }
    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(decode_one(&bytes).expect("stable snapshot schema is valid"))
    }
    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_SNAPSHOT_BYTES,
        is_fixed_size: false,
    };
}

thread_local! {
    static MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    static CACHE: RefCell<StableBTreeMap<u64, StableSnapshot, Memory>> = RefCell::new(
        MANAGER.with(|manager| StableBTreeMap::init(manager.borrow().get(MemoryId::new(0))))
    );
}

pub fn get(neuron_id: u64) -> Option<ComplianceSnapshot> {
    CACHE.with_borrow(|cache| cache.get(&neuron_id).map(|record| record.0))
}
pub fn len() -> u64 {
    CACHE.with_borrow(StableBTreeMap::len)
}
pub fn put(snapshot: ComplianceSnapshot) -> bool {
    let neuron_id = snapshot.neuron_id;
    let mut evicted = false;
    CACHE.with_borrow_mut(|cache| {
        if cache.len() >= MAX_CACHED_SNAPSHOTS as u64
            && !cache.contains_key(&neuron_id)
            && let Some(oldest) = cache
                .iter()
                .map(|entry| entry.value().0)
                .min_by_key(|value| (value.checked_at_timestamp_seconds, value.neuron_id))
        {
            cache.remove(&oldest.neuron_id);
            evicted = true;
        }
        cache.insert(neuron_id, StableSnapshot(snapshot));
    });
    evicted
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn stable_record_bound_is_hard() {
        assert_eq!(
            StableSnapshot::BOUND,
            Bound::Bounded {
                max_size: MAX_SNAPSHOT_BYTES,
                is_fixed_size: false
            }
        );
    }
}
