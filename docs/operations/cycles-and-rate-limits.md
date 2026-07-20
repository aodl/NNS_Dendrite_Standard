# Cycles and live-check limits

Each accepted `check_neuron` performs live consensus-backed outbound calls. Admission
requires a fixed liquid-cycle reserve, permits at most two concurrent checks, rejects a
second simultaneous check for the same neuron, and caps global starts in a short fixed
window. Anonymous callers share this global guard; there is no per-user policy.

The guard is small heap-only transient state. It resets on upgrade, exposes no public
counters, and never stores reports. Each admission prunes in-flight entries at least 300
seconds old, so an abandoned post-await entry cannot consume a slot indefinitely.
Temporary rejection includes only a bounded suggested delay. There is no cache, cooldown
record, persistent counter, mutable limit, timer, or background refill task.
