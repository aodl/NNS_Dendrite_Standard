export function classifyReceiver(raw) { if (raw.length === 0) return { kind: "NoReceiver" }; if (raw.length === 1) return { kind: "SingleReceiver", id: BigInt(raw[0]).toString() }; return { kind: "AmbiguousReceiver" }; }

