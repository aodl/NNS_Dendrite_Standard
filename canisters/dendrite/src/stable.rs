use candid::{decode_one, encode_one};
use dendrite_types::{ComplianceSnapshot, MAX_CACHED_SNAPSHOTS};
use ic_stable_structures::{
    DefaultMemoryImpl, Memory, StableBTreeMap, Storable,
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::Bound,
};
use std::{borrow::Cow, cell::RefCell};

const MAX_SNAPSHOT_BYTES: u32 = 1_048_576;
type CanisterMemory = VirtualMemory<DefaultMemoryImpl>;

#[derive(Clone)]
struct StableBytes(Vec<u8>);
impl Storable for StableBytes {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Borrowed(&self.0)
    }
    fn into_bytes(self) -> Vec<u8> {
        self.0
    }
    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(bytes.into_owned())
    }
    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_SNAPSHOT_BYTES,
        is_fixed_size: false,
    };
}

struct StableCache<M: Memory> {
    map: StableBTreeMap<u64, StableBytes, M>,
}
impl<M: Memory> StableCache<M> {
    fn init(memory: M) -> Self {
        Self {
            map: StableBTreeMap::init(memory),
        }
    }
    fn get(&self, neuron_id: u64) -> Option<ComplianceSnapshot> {
        self.map
            .get(&neuron_id)
            .and_then(|record| decode_one(&record.0).ok())
    }
    fn len(&self) -> u64 {
        self.map.len()
    }
    fn put(&mut self, snapshot: ComplianceSnapshot) -> bool {
        let neuron_id = snapshot.neuron_id;
        let Ok(encoded) = encode_one(&snapshot) else {
            return false;
        };
        if encoded.len() > MAX_SNAPSHOT_BYTES as usize {
            return false;
        }
        let mut evicted = false;
        if self.map.len() >= MAX_CACHED_SNAPSHOTS as u64
            && !self.map.contains_key(&neuron_id)
            && let Some(oldest) = self
                .map
                .iter()
                .map(|entry| {
                    let key = *entry.key();
                    let checked_at = decode_one::<ComplianceSnapshot>(&entry.value().0)
                        .map_or(0, |value| value.checked_at_timestamp_seconds);
                    (checked_at, key)
                })
                .min()
        {
            self.map.remove(&oldest.1);
            evicted = true;
        }
        self.map.insert(neuron_id, StableBytes(encoded));
        evicted
    }
}

thread_local! {
    static MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    static CACHE: RefCell<StableCache<CanisterMemory>> = RefCell::new(
        MANAGER.with(|manager| StableCache::init(manager.borrow().get(MemoryId::new(0))))
    );
}
pub fn get(neuron_id: u64) -> Option<ComplianceSnapshot> {
    CACHE.with_borrow(|cache| cache.get(neuron_id))
}
pub fn len() -> u64 {
    CACHE.with_borrow(StableCache::len)
}
pub fn put(snapshot: ComplianceSnapshot) -> bool {
    CACHE.with_borrow_mut(|cache| cache.put(snapshot))
}

#[cfg(test)]
mod tests {
    use super::*;
    use dendrite_types::ComplianceStatus;
    use ic_stable_structures::VectorMemory;
    fn snapshot(id: u64, checked_at: u64) -> ComplianceSnapshot {
        ComplianceSnapshot {
            schema_version: 1,
            standard_version: "v".into(),
            neuron_id: id,
            checked_at_timestamp_seconds: checked_at,
            overall_status: ComplianceStatus::Compliant,
            stale_after_timestamp_seconds: checked_at + 1,
            rules: vec![],
            manager_ids: vec![],
            committed_topics: vec![],
            quorum_threshold: None,
            source_revision: "r".into(),
            source_errors: vec![],
            evidence_digest: vec![0; 32],
        }
    }
    #[test]
    fn stable_record_bound_is_hard() {
        assert_eq!(
            StableBytes::BOUND,
            Bound::Bounded {
                max_size: MAX_SNAPSHOT_BYTES,
                is_fixed_size: false
            }
        );
    }
    #[test]
    fn malformed_record_decode_fails_safely() {
        assert!(decode_one::<ComplianceSnapshot>(&StableBytes(vec![1, 2, 3]).0).is_err());
    }
    #[test]
    fn cap_and_eviction_are_deterministic() {
        let mut cache = StableCache::init(VectorMemory::default());
        for id in 1..=MAX_CACHED_SNAPSHOTS as u64 {
            assert!(!cache.put(snapshot(id, id)));
        }
        assert!(cache.put(snapshot(999, 999)));
        assert_eq!(cache.len(), MAX_CACHED_SNAPSHOTS as u64);
        assert!(cache.get(1).is_none());
        assert_eq!(cache.get(999).unwrap().neuron_id, 999);
    }
    #[test]
    fn stable_map_reopens_over_the_same_memory() {
        let memory = VectorMemory::default();
        {
            let mut cache = StableCache::init(memory.clone());
            cache.put(snapshot(7, 11));
        }
        let reopened = StableCache::init(memory);
        assert_eq!(reopened.get(7).unwrap().checked_at_timestamp_seconds, 11);
    }
}
