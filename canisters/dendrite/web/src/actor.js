import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { Principal } from "@icp-sdk/core/principal";
import { idlFactory } from "../../../../src/declarations/dendrite/dendrite.did.js";

export const DENDRITE_CANISTER_ID = typeof __DENDRITE_CANISTER_ID__ === "string" ? __DENDRITE_CANISTER_ID__ : "aaaaa-aa";

export function validatedCanisterId(value = DENDRITE_CANISTER_ID) {
  if (typeof value !== "string") throw new TypeError("Dendrite canister ID is not configured.");
  Principal.fromText(value);
  return value;
}

export async function createAnonymousActor(options = {}) {
  const createAgent = options.createAgent ?? ((agentOptions) => HttpAgent.create(agentOptions));
  const createActor = options.createActor ?? ((factory, config) => Actor.createActor(factory, config));
  const agent = await createAgent(options.agentOptions ?? {});
  return createActor(idlFactory, {
    agent,
    canisterId: validatedCanisterId(options.canisterId),
  });
}
