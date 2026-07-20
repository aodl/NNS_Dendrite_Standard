import { Principal } from "@icp-sdk/core/principal";

export const PRODUCTION_IC_API_HOST = "https://icp-api.io";
export const LOCAL_IC_API_HOSTS = new Set([
  "http://127.0.0.1:4943",
  "http://localhost:4943",
]);
export const ACCEPTED_CONNECTION_ORIGINS = new Set([
  PRODUCTION_IC_API_HOST,
  ...LOCAL_IC_API_HOSTS,
]);

function exactOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DENDRITE_API_HOST must be an absolute supported origin.");
  }
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("DENDRITE_API_HOST must contain only a supported origin.");
  }
  return parsed.origin;
}

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
  const apiHost = exactOrigin(environment.DENDRITE_API_HOST ?? PRODUCTION_IC_API_HOST);
  if (mode === "production" && apiHost !== PRODUCTION_IC_API_HOST) {
    throw new Error(`Production DENDRITE_API_HOST must be ${PRODUCTION_IC_API_HOST}.`);
  }
  if (mode === "local" && !LOCAL_IC_API_HOSTS.has(apiHost)) {
    throw new Error("Local DENDRITE_API_HOST must be an explicitly supported replica origin.");
  }

  const fetchRootKey = environment.DENDRITE_FETCH_ROOT_KEY === "true";
  if (environment.DENDRITE_FETCH_ROOT_KEY && !new Set(["true", "false"]).has(environment.DENDRITE_FETCH_ROOT_KEY)) {
    throw new Error("DENDRITE_FETCH_ROOT_KEY must be true or false.");
  }
  if (mode === "production" && fetchRootKey) {
    throw new Error("Production builds cannot fetch a root key.");
  }
  return { canisterId, apiHost, fetchRootKey, mode };
}
