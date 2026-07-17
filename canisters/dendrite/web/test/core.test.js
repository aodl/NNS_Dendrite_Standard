import test from "node:test";
import assert from "node:assert/strict";
import { parseNeuronId, formatNeuronId, OMEGA_REJECT_NEURON_ID } from "../src/ids.js";
import { authorityFor, canAddHotKey } from "../src/authority.js";
import { buildNeuronManagementProposal, commandAvailability, projectedFollowing, quorum, simulateThenSubmit } from "../src/proposals.js";
import { classifyReceiver } from "../src/rewards.js";

test("u64 IDs round trip without Number", () => { const id = parseNeuronId(OMEGA_REJECT_NEURON_ID); assert.equal(typeof id, "bigint"); assert.equal(formatNeuronId(id), OMEGA_REJECT_NEURON_ID); });
test("malformed IDs fail closed", () => { for (const id of ["", "0", "01", "+1", "-1", " 1", "1 ", "1.0", "1e2", "18446744073709551616"]) assert.throws(() => parseNeuronId(id)); });
test("authority is exact controller or hotkey only", () => { assert.equal(authorityFor("p1", { controller:["p1"], hot_keys:[] }), "controller"); assert.equal(authorityFor("p1", { controller:["p2"], hot_keys:["p1"] }), "hotkey"); assert.equal(authorityFor("p1", { controller:["p2"], hot_keys:[], visibility:"public" }), null); assert.equal(canAddHotKey("hotkey"), false); });
test("quorum uses equal manager ballots", () => { assert.equal(quorum(5), 3); assert.equal(quorum(15), 8); });
test("nested request preserves both neuron layers", () => { const r = buildNeuronManagementProposal({ proposerId:"11", targetId:"22", title:"Refresh", summary:"Refresh voting power", command:{kind:"RefreshVotingPower"} }); assert.equal(r.id[0].id, 11n); assert.equal(r.command[0].MakeProposal.action[0].ManageNeuron.id[0].id, 22n); });
test("current exclusions and future commands fail visibly", () => { assert.equal(commandAvailability("Disburse").enabled, false); assert.equal(commandAvailability("RefreshVotingPower").enabled, true); assert.equal(commandAvailability("Future").enabled, false); });
test("following validation keeps raw distinctness", () => { assert.throws(() => projectedFollowing({targetId:"9",topic:1,followees:["1","1","2","3","4"],managers:[],committed:false})); assert.deepEqual(projectedFollowing({targetId:"9",topic:1,followees:["1","2","3","4","5"],managers:[],committed:false}), [1n,2n,3n,4n,5n]); });
test("failed simulation never submits", async () => { let called=false; const actor={simulate_manage_neuron:async()=>({Err:"no"}),manage_neuron:async()=>{called=true}}; const result=await simulateThenSubmit({actor,request:{},confirmed:true}); assert.equal(result.submitted,false); assert.equal(called,false); });
test("explicit confirmation gates submission", async () => { let called=false; const actor={simulate_manage_neuron:async()=>({Ok:null}),manage_neuron:async()=>{called=true;return {Ok:1n}}}; assert.equal((await simulateThenSubmit({actor,request:{},confirmed:false})).submitted,false); assert.equal(called,false); assert.equal((await simulateThenSubmit({actor,request:{},confirmed:true})).submitted,true); });
test("reward receiver classification preserves ambiguity", () => { assert.deepEqual(classifyReceiver([]),{kind:"NoReceiver"}); assert.deepEqual(classifyReceiver(["9"]),{kind:"SingleReceiver",id:"9"}); assert.deepEqual(classifyReceiver(["9","9"]),{kind:"AmbiguousReceiver"}); });

