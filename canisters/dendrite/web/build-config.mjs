import { Principal } from "@icp-sdk/core/principal";

export const PRODUCTION_IC_API_HOST = "https://icp-api.io";

export function resolveBuildConfiguration(environment = process.env) {
  const canisterId = environment.DENDRITE_CANISTER_ID ?? environment.CANISTER_ID_DENDRITE;
  if (!canisterId) throw new Error("DENDRITE_CANISTER_ID is required.");
  try {
    Principal.fromText(canisterId);
  } catch {
    throw new Error("DENDRITE_CANISTER_ID is not a valid textual principal.");
  }

  const mode = environment.DENDRITE_BUILD_MODE ?? "production";
  if (!new Set(["production", "local"]).has(mode)) {
    throw new Error("DENDRITE_BUILD_MODE must be production or local.");
  }
  const apiHost = environment.DENDRITE_API_HOST ?? PRODUCTION_IC_API_HOST;
  const parsedHost = new URL(apiHost);
  if (mode === "production" && parsedHost.protocol !== "https:") {
    throw new Error("Production DENDRITE_API_HOST must use HTTPS.");
  }
  if (mode === "local" && !new Set(["http:", "https:"]).has(parsedHost.protocol)) {
    throw new Error("Local DENDRITE_API_HOST must use HTTP or HTTPS.");
  }

  const fetchRootKey = environment.DENDRITE_FETCH_ROOT_KEY === "true";
  if (environment.DENDRITE_FETCH_ROOT_KEY && !new Set(["true", "false"]).has(environment.DENDRITE_FETCH_ROOT_KEY)) {
    throw new Error("DENDRITE_FETCH_ROOT_KEY must be true or false.");
  }
  if (mode === "production" && fetchRootKey) {
    throw new Error("Production builds cannot fetch a root key.");
  }
  return { canisterId, apiHost: parsedHost.href.replace(/\/$/, ""), fetchRootKey, mode };
}
