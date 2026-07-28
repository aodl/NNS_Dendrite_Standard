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
    { name: "desktop-200-percent", width: 720, height: 500, deviceScaleFactor: 2 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({
      width: scenario.width,
      height: scenario.height,
      deviceScaleFactor: scenario.deviceScaleFactor ?? 1,
    });
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
    assert.match(text, /Requires verification/);
    assert.match(text, /Verify on-chain/);
    assert.doesNotMatch(text, /Consensus verified/);
    assert.doesNotMatch(text, /Controller blackhole\s+Confirmed/);
    const hierarchy = await page.evaluate(() => ({
      rules: document.querySelector("#rules")?.getBoundingClientRect().top,
      managers: document.querySelector("#managers")?.getBoundingClientRect().top,
      delegation: document.querySelector("#delegation")?.getBoundingClientRect().top,
      ruleCount: document.querySelectorAll(".rule-row").length,
    }));
    assert(hierarchy.ruleCount > 0, "complete rules view is missing");
    assert(hierarchy.rules < hierarchy.managers && hierarchy.managers < hierarchy.delegation,
      `unexpected section hierarchy: ${JSON.stringify(hierarchy)}`);
    const initialRequestCount = requests.length;
    const routeBeforeNavigation = page.url();
    await page.focus(".rule-toggle");
    await page.keyboard.press("Enter");
    assert.equal(await page.$eval(".rule-toggle", (node) => node.getAttribute("aria-expanded")), "true");
    await page.click(".rule-filter:nth-of-type(2)");
    assert.match(await page.$eval(".rule-count", (node) => node.textContent), /Needs attention filter/);
    assert(await page.$$eval(".rule-row:not([hidden])", (nodes) => nodes.length) > 0);
    const preliminaryControllers = await page.$$eval(".rule-row", (nodes) => nodes
      .filter((node) => /Controller canister/.test(node.textContent))
      .map((node) => node.textContent));
    assert(preliminaryControllers.length >= 3);
    for (const controllerText of preliminaryControllers) {
      assert.match(controllerText, /Requires verification/);
      assert.doesNotMatch(controllerText, /\bPass\b/);
    }
    await page.click('.section-navigation a[href="#rules"]');
    assert.equal(page.url(), routeBeforeNavigation, "section navigation changed the neuron route");
    assert(Math.abs(await page.$eval("#rules", (node) => node.getBoundingClientRect().top)) < 100);
    for (const id of ["characteristics", "managers", "delegation", "evidence"]) {
      const selector = `#${id} .section-toggle`;
      assert.equal(await page.$eval(selector, (node) => node.getAttribute("aria-expanded")), "false");
      await page.click(selector);
      assert.equal(await page.$eval(selector, (node) => node.getAttribute("aria-expanded")), "true");
    }
    assert.equal(requests.length, initialRequestCount,
      "rendering, filtering, expansion, or section navigation triggered a network request");
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
      hierarchy,
      interactionRequests: requests.length - initialRequestCount,
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
    rulesBeforeManagersAndDelegation: true,
    keyboardRuleExpansion: true,
    attentionFiltering: true,
    preliminaryControllerPasses: 0,
    sectionNavigationRouteChanges: 0,
    interactionNetworkRequests: 0,
  },
  scenarios: results,
};
writeFileSync(join(evidenceDirectory, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`browser qualification PASS: ${evidence.engine}; ${results.length} viewports; ${requests.length} anonymous Governance query requests; 0 Dendrite requests\n`);
