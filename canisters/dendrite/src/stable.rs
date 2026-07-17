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

thread_local! {
    static MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    static CACHE: RefCell<StableBTreeMap<u64, StableBytes, Memory>> = RefCell::new(
        MANAGER.with(|manager| StableBTreeMap::init(manager.borrow().get(MemoryId::new(0))))
    );
}

pub fn get(neuron_id: u64) -> Option<ComplianceSnapshot> {
    CACHE.with_borrow(|cache| {
        cache
            .get(&neuron_id)
            .and_then(|record| decode_one(&record.0).ok())
    })
}
pub fn len() -> u64 {
    CACHE.with_borrow(StableBTreeMap::len)
}
pub fn put(snapshot: ComplianceSnapshot) -> bool {
    let neuron_id = snapshot.neuron_id;
    let Ok(encoded) = encode_one(&snapshot) else {
        return false;
    };
    if encoded.len() > MAX_SNAPSHOT_BYTES as usize {
        return false;
    }
    let mut evicted = false;
    CACHE.with_borrow_mut(|cache| {
        if cache.len() >= MAX_CACHED_SNAPSHOTS as u64
            && !cache.contains_key(&neuron_id)
            && let Some(oldest) = cache
                .iter()
                .map(|entry| {
                    let key = *entry.key();
                    let checked_at = decode_one::<ComplianceSnapshot>(&entry.value().0)
                        .map_or(0, |value| value.checked_at_timestamp_seconds);
                    (checked_at, key)
                })
                .min()
        {
            cache.remove(&oldest.1);
            evicted = true;
        }
        cache.insert(neuron_id, StableBytes(encoded));
    });
    evicted
}

#[cfg(test)]
mod tests {
    use super::*;
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
        let malformed = StableBytes(vec![1, 2, 3]);
        assert!(decode_one::<ComplianceSnapshot>(&malformed.0).is_err());
    }
}
