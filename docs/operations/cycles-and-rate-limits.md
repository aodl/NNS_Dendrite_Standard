# Cycles and refresh limits

Fresh cache entries avoid outbound calls. Live refresh requires at least 2,000,000,000,000 liquid cycles, permits at most four concurrent refreshes, deduplicates the same neuron, applies a 30-second per-neuron cooldown, and accepts at most 20 starts per 60-second global window. Public counters expose accepted, cached, rejected, failed, successful, and eviction totals.

A stale cached snapshot remains queryable with its original timestamps. It must not be described as live or current.

`refresh_compliance` may return a still-fresh cache entry. `force_refresh_compliance` is the explicit user-refresh path: it bypasses only that cache shortcut and remains subject to every cooldown, global-rate, concurrency, in-flight, and cycle-reserve control.
