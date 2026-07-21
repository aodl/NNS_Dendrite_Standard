import test from "node:test";
import assert from "node:assert/strict";
import { Principal } from "@icp-sdk/core/principal";
import { AUTHENTICATION_DELEGATION_TTL_NS, authenticationOrigin, createBrowserAuthSession } from "../src/auth.js";
import { classifyManagerAuthority, renderManagerAuthority } from "../src/authority.js";

const canonical = "https://dendrite.example";
const alternative = "https://www.dendrite.example";
const configuration = {
  derivationOrigin: canonical,
  alternativeOrigins: [alternative],
  identityProvider: "https://id.ai/authorize",
};
const user = Principal.fromText("aaaaa-aa");
const other = Principal.fromText("2vxsx-fae");
const identity = (principal = user) => ({ getPrincipal: () => principal });

class FakeAuthClient {
  static instances = [];
  constructor(options) { this.options = options; this.authenticated = false; FakeAuthClient.instances.push(this); }
  isAuthenticated() { return this.authenticated; }
  async getIdentity() { if (this.restoreError) throw this.restoreError; return this.identity; }
  async signIn(options) { this.signInOptions = options; if (this.signInError) throw this.signInError; return this.identity; }
  async signOut() { this.signedOut = true; }
}

const session = (origin = canonical) => createBrowserAuthSession({
  ...configuration,
  currentOrigin: origin,
  AuthClientClass: FakeAuthClient,
});

test("canonical alternative and unapproved origins are explicit", () => {
  assert.equal(authenticationOrigin(canonical, configuration), undefined);
  assert.equal(authenticationOrigin(alternative, configuration), canonical);
  assert.throws(() => authenticationOrigin("https://evil.example", configuration));
  const canonicalSession = session();
  canonicalSession.restore();
  assert.equal(FakeAuthClient.instances.at(-1).options.derivationOrigin, undefined);
  const alternativeSession = session(alternative);
  alternativeSession.restore();
  assert.equal(FakeAuthClient.instances.at(-1).options.derivationOrigin, canonical);
  assert.ok(session("https://evil.example").originError);
});

test("one client restores signs in for at most eight hours and signs out", async () => {
  FakeAuthClient.instances.length = 0;
  const auth = session();
  assert.equal(await auth.restore(), null);
  const client = FakeAuthClient.instances[0];
  client.identity = identity();
  client.authenticated = true;
  assert.equal((await auth.restore()).toText(), user.toText());
  assert.equal((await auth.signIn()).toText(), user.toText());
  assert.equal(client.signInOptions.maxTimeToLive, AUTHENTICATION_DELEGATION_TTL_NS);
  await auth.signOut();
  assert.equal(client.signedOut, true);
  assert.equal(FakeAuthClient.instances.length, 1);
});

test("cancel failure expiry malformed identity and storage errors fail closed", async () => {
  let auth = session();
  await auth.restore();
  let client = FakeAuthClient.instances.at(-1);
  client.identity = identity();
  client.signInError = new Error("popup closed");
  await assert.rejects(() => auth.signIn(), /popup closed/);
  client.signInError = new Error("authentication cancelled");
  await assert.rejects(() => auth.signIn(), /cancelled/);

  auth = session();
  assert.equal(await auth.restore(), null);
  client = FakeAuthClient.instances.at(-1);
  client.authenticated = true;
  client.identity = {};
  await assert.rejects(() => auth.restore(), /malformed/);
  client.restoreError = new Error("storage unavailable");
  await assert.rejects(() => auth.restore(), /storage unavailable/);
});

const manager = (status, controller = [], hotKeys = []) => ({
  neuron_id: 100n,
  evidence_status: { [status]: null },
  controller,
  hot_keys: hotKeys,
  known_neuron: [],
});

test("manager authority uses exact parsed principals and unavailable never authorizes", () => {
  assert.equal(classifyManagerAuthority(manager("Found", [user]), user).role, "Controller");
  assert.equal(classifyManagerAuthority(manager("Found", [], [user]), user).role, "Hotkey");
  assert.equal(classifyManagerAuthority(manager("Found", [user], [user]), user).role, "Controller and hotkey");
  assert.equal(classifyManagerAuthority(manager("Found", [other], [other]), user).role, "No authority");
  assert.equal(classifyManagerAuthority(manager("Unavailable", [user], [user]), user).role, "Evidence unavailable");
  assert.equal(classifyManagerAuthority(manager("ConfirmedMissing", [user], [user]), user).role, "Manager not returned");
});

class FakeNode {
  constructor(tag) { this.tag = tag; this.children = []; this.textContent = ""; }
  append(...children) { this.children.push(...children); }
}

test("raw duplicates and hostile names render inert while new reports recompute authority", () => {
  const prior = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeNode(tag) };
  try {
    const first = manager("Found", [user]);
    first.known_neuron = [{ name: "<img onerror=attack>" }];
    const root = new FakeNode("main");
    renderManagerAuthority(root, { managers: [first, first] }, user);
    const rendered = JSON.stringify(root);
    assert.equal((rendered.match(/<img onerror=attack>/g) ?? []).length, 2);
    assert.equal((rendered.match(/Controller/g) ?? []).length >= 2, true);
    assert.doesNotMatch(rendered, /AddHotKey|manage_neuron/);
    assert.equal(classifyManagerAuthority(first, user).eligible, true);
    assert.equal(classifyManagerAuthority(manager("Found", [other]), user).eligible, false);
  } finally {
    globalThis.document = prior;
  }
});
