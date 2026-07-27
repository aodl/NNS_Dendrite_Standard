import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import puppeteer from "puppeteer-core";

const frontend = process.env.DENDRITE_BROWSER_FRONTEND;
const evidenceDirectory = process.env.DENDRITE_BROWSER_EVIDENCE;
const baseUrl = process.env.DENDRITE_BROWSER_BASE_URL ?? "http://127.0.0.1:4173";
const governanceCanister = "rrkah-fqaaa-aaaaa-aaaaq-cai";
const dendriteCanister = "k7w4r-zaaaa-aaaao-qkb2a-cai";
const neuronId = "2947465672511369";
assert(frontend && evidenceDirectory, "browser frontend and evidence directories are required");
mkdirSync(evidenceDirectory, { recursive: true });

const manifest = JSON.parse(readFileSync(join(frontend, "asset-manifest.json"), "utf8"));
for (const logical of ["app.js", "styles.css"]) {
  const relative = manifest[logical].replace(/^\//, "");
  assert.match(relative, new RegExp(`^generated/${logical.replace(".", "\\.") .replace("js", "[0-9a-f]{16}\\.js").replace("css", "[0-9a-f]{16}\\.css")}$`));
  const content = readFileSync(join(frontend, relative));
  const embedded = basename(relative).split(".")[1];
  assert.equal(createHash("sha256").update(content).digest("hex").slice(0, 16), embedded);
}

const browser = await puppeteer.launch({
  executablePath: process.env.DENDRITE_CHROMIUM_BIN ?? "/home/pptruser/.cache/puppeteer/chrome/linux-144.0.7559.96/chrome-linux64/chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-background-networking"],
});
const browserVersion = await browser.version();
const bounded = (values, maximum = 40) => values.slice(0, maximum).map((value) => String(value).slice(0, 500));
const results = [];
try {
  for (const scenario of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: scenario.width, height: scenario.height, deviceScaleFactor: 1 });
    const consoleErrors = [], pageErrors = [], requests = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = request.url();
      if (request.method() === "POST" || /\/api\/v[23]\/canister\//.test(url)) requests.push({
        url,
        method: request.method(),
        authorization: request.headers().authorization ?? null,
        cookie: request.headers().cookie ?? null,
        bodyBytes: request.postData()?.length ?? 0,
      });
    });
    await page.goto(`${baseUrl}/#/neuron/${neuronId}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForFunction(() => !document.body.textContent.includes("Loading public NNS evidence"), { timeout: 45_000 });
    await page.waitForSelector(".badge-preliminary", { timeout: 5_000 });
    const text = await page.$eval("main", (node) => node.innerText);
    assert.match(text, /Preliminary/);
    assert.match(text, /Requires on-chain verification/);
    assert.match(text, /Verify on-chain/);
    assert.doesNotMatch(text, /Consensus verified/);
    assert.doesNotMatch(text, /Controller blackhole\s+Confirmed/);
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    assert(overflow.document <= 1 && overflow.body <= 1, `material horizontal overflow: ${JSON.stringify(overflow)}`);
    const focusEvidence = [];
    const requiredFocus = new Set(["Copy neuron ID", "Refresh preliminary", "Verify on-chain"]);
    for (let index = 0; index < 200 && requiredFocus.size; index += 1) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        text: document.activeElement?.textContent?.trim().slice(0, 80),
        name: document.activeElement?.getAttribute("name"),
      }));
      focusEvidence.push(focused);
      requiredFocus.delete(focused.text);
    }
    assert.deepEqual([...requiredFocus], []);
    await page.screenshot({ path: join(evidenceDirectory, `${scenario.name}.png`), fullPage: true });
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    assert.equal(consoleErrors.length, 0, consoleErrors.join("\n"));
    results.push({
      ...scenario,
      consoleErrors: bounded(consoleErrors),
      pageErrors: bounded(pageErrors),
      overflow,
      focusEvidence: bounded(focusEvidence.map((entry) => JSON.stringify(entry)), 80),
      canisterRequests: requests,
      screenshot: `${scenario.name}.png`,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const capturedRequests = results.flatMap((result) => result.canisterRequests);
const requests = capturedRequests.filter((request) => request.method === "POST" && /\/query$/.test(request.url));
if (requests.length < 2) process.stderr.write(`${JSON.stringify(results, null, 2)}\n`);
assert(requests.length >= 2, "each viewport must perform an ordinary Governance read");
for (const request of capturedRequests) {
  assert.match(request.url, new RegExp(`/api/v3/canister/${governanceCanister}/(?:query|read_state)$`));
  assert(!request.url.includes(dendriteCanister));
}
for (const request of requests) {
  assert.equal(request.method, "POST");
  assert.equal(request.authorization, null);
  assert.equal(request.cookie, null);
  assert(request.bodyBytes > 0);
}
assert(!requests.some((request) => /\/call$/.test(request.url)), "ordinary navigation invoked an update endpoint");
assert(!requests.some((request) => request.url.includes(dendriteCanister)), "ordinary navigation contacted Dendrite");

const evidence = {
  result: "PASS",
  engine: browserVersion,
  containerImage: process.env.DENDRITE_BROWSER_IMAGE,
  frontend,
  neuronId,
  assertions: {
    fixedGovernanceDestination: governanceCanister,
    requestEndpoint: "query",
    anonymousTransportHeaders: true,
    dendriteCheckNeuronCalls: 0,
    unexpectedCanisterDestinations: 0,
    verifyActionAutomaticallyActivated: false,
    assetManifestContentAddressesVerified: true,
  },
  scenarios: results,
};
writeFileSync(join(evidenceDirectory, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`browser qualification PASS: ${evidence.engine}; ${results.length} viewports; ${requests.length} anonymous Governance query requests; 0 Dendrite requests\n`);
