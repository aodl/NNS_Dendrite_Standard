import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { idlFactory } from "../../../../src/declarations/dendrite/dendrite.did.js";

export function canisterIdFromHostname(hostname = location.hostname) {
  const label = hostname.split(".")[0];
  if (!label || label === "localhost" || label === "127") throw new Error("The Dendrite canister ID is not available from this hostname.");
  return label;
}
export async function createAnonymousActor(options = {}) {
  const createAgent = options.createAgent ?? ((agentOptions) => HttpAgent.create(agentOptions));
  const createActor = options.createActor ?? ((factory, config) => Actor.createActor(factory, config));
  const agent = await createAgent(options.agentOptions ?? {});
  return createActor(idlFactory, { agent, canisterId: options.canisterId ?? canisterIdFromHostname() });
}
