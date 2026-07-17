export function authorityFor(principal, neuron) {
  const controller = neuron.controller?.[0]?.toText?.() ?? neuron.controller?.[0] ?? null;
  if (controller === principal) return "controller";
  const hotKeys = neuron.hot_keys ?? neuron.hotKeys ?? [];
  if (hotKeys.some((p) => (p.toText?.() ?? p) === principal)) return "hotkey";
  return null;
}
export function canAddHotKey(authority) { return authority === "controller"; }

