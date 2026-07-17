use candid::{CandidType, Deserialize};
use std::collections::{BTreeMap, BTreeSet, VecDeque};

pub const COOLDOWN_SECONDS: u64 = 30;
pub const GLOBAL_WINDOW_SECONDS: u64 = 60;
pub const MAX_REFRESHES_PER_WINDOW: usize = 20;
pub const MAX_CONCURRENT_REFRESHES: usize = 4;
pub const MIN_CYCLE_RESERVE: u128 = 2_000_000_000_000;

#[derive(Clone, Copy, Debug, Default, CandidType, Deserialize, Eq, PartialEq)]
pub struct RefreshCounters {
    pub accepted_refreshes: u64,
    pub cache_hits: u64,
    pub cooldown_rejections: u64,
    pub global_rate_rejections: u64,
    pub concurrency_rejections: u64,
    pub duplicate_in_flight_requests: u64,
    pub low_cycle_rejections: u64,
    pub upstream_failures: u64,
    pub successful_refreshes: u64,
    pub cache_evictions: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Rejection {
    Cooldown(u64),
    GlobalRate(u64),
    Concurrency,
    Duplicate,
    LowCycles,
}

#[derive(Default)]
pub struct RefreshState {
    last_started: BTreeMap<u64, u64>,
    starts: VecDeque<u64>,
    in_flight: BTreeSet<u64>,
    pub counters: RefreshCounters,
}
impl RefreshState {
    pub fn with_counters(counters: RefreshCounters) -> Self {
        Self {
            counters,
            ..Self::default()
        }
    }
    pub fn cache_hit(&mut self) {
        self.counters.cache_hits = self.counters.cache_hits.saturating_add(1);
    }
    pub fn begin(&mut self, neuron_id: u64, now: u64, cycles: u128) -> Result<(), Rejection> {
        if cycles < MIN_CYCLE_RESERVE {
            self.counters.low_cycle_rejections += 1;
            return Err(Rejection::LowCycles);
        }
        if self.in_flight.contains(&neuron_id) {
            self.counters.duplicate_in_flight_requests += 1;
            return Err(Rejection::Duplicate);
        }
        if self.in_flight.len() >= MAX_CONCURRENT_REFRESHES {
            self.counters.concurrency_rejections += 1;
            return Err(Rejection::Concurrency);
        }
        if let Some(last) = self.last_started.get(&neuron_id)
            && now < last.saturating_add(COOLDOWN_SECONDS)
        {
            self.counters.cooldown_rejections += 1;
            return Err(Rejection::Cooldown(
                last.saturating_add(COOLDOWN_SECONDS) - now,
            ));
        }
        while self
            .starts
            .front()
            .is_some_and(|at| at.saturating_add(GLOBAL_WINDOW_SECONDS) <= now)
        {
            self.starts.pop_front();
        }
        if self.starts.len() >= MAX_REFRESHES_PER_WINDOW {
            self.counters.global_rate_rejections += 1;
            return Err(Rejection::GlobalRate(
                self.starts[0]
                    .saturating_add(GLOBAL_WINDOW_SECONDS)
                    .saturating_sub(now),
            ));
        }
        self.in_flight.insert(neuron_id);
        self.last_started.insert(neuron_id, now);
        self.starts.push_back(now);
        self.counters.accepted_refreshes += 1;
        Ok(())
    }
    pub fn finish(&mut self, neuron_id: u64, success: bool, evicted: bool) {
        self.in_flight.remove(&neuron_id);
        if success {
            self.counters.successful_refreshes += 1;
        } else {
            self.counters.upstream_failures += 1;
        }
        if evicted {
            self.counters.cache_evictions += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn all_refresh_rejection_paths_are_enforced() {
        let mut state = RefreshState::default();
        assert_eq!(
            state.begin(1, 100, MIN_CYCLE_RESERVE - 1),
            Err(Rejection::LowCycles)
        );
        assert_eq!(state.begin(1, 100, MIN_CYCLE_RESERVE), Ok(()));
        assert_eq!(
            state.begin(1, 100, MIN_CYCLE_RESERVE),
            Err(Rejection::Duplicate)
        );
        state.finish(1, true, false);
        assert_eq!(
            state.begin(1, 101, MIN_CYCLE_RESERVE),
            Err(Rejection::Cooldown(29))
        );
        for id in 2..=5 {
            assert_eq!(state.begin(id, 200, MIN_CYCLE_RESERVE), Ok(()));
        }
        assert_eq!(
            state.begin(6, 200, MIN_CYCLE_RESERVE),
            Err(Rejection::Concurrency)
        );
    }
    #[test]
    fn global_window_is_bounded_and_expires_deterministically() {
        let mut state = RefreshState::default();
        for id in 1..=MAX_REFRESHES_PER_WINDOW as u64 {
            state.begin(id, 100, MIN_CYCLE_RESERVE).unwrap();
            state.finish(id, true, false);
        }
        assert_eq!(
            state.begin(99, 100, MIN_CYCLE_RESERVE),
            Err(Rejection::GlobalRate(60))
        );
        assert_eq!(state.begin(99, 160, MIN_CYCLE_RESERVE), Ok(()));
    }
}
