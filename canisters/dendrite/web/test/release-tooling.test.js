import test from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync, cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync,
  rmSync, writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(".");
const productionId = "hp4av-oiaaa-aaaar-qcaha-cai";
const productionOrigin = `https://${productionId}.icp0.io`;
const productionEnvironment = {
  DENDRITE_CANISTER_ID: productionId,
  DENDRITE_DERIVATION_ORIGIN: productionOrigin,
  DENDRITE_ALTERNATIVE_ORIGINS_JSON: '{"alternativeOrigins":[]}',
  DENDRITE_API_HOST: "https://icp-api.io",
  DENDRITE_IDENTITY_PROVIDER: "https://id.ai/authorize",
  DENDRITE_FETCH_ROOT_KEY: "false",
  SOURCE_DATE_EPOCH: "0",
};

const run = (command, args = [], options = {}) =>
  spawnSync(command, args, { cwd: root, encoding: "utf8", ...options });

test("canonical release inputs are mandatory and exact", () => {
  for (const missing of Object.keys(productionEnvironment).filter((key) => key !== "DENDRITE_FETCH_ROOT_KEY")) {
    const environment = { ...process.env, ...productionEnvironment };
    delete environment[missing];
    const result = run("tools/scripts/docker-build-release.sh", [], { env: environment });
    assert.notEqual(result.status, 0, missing);
  }
  const wrong = run("tools/scripts/docker-build-release.sh", [], {
    env: { ...process.env, ...productionEnvironment, DENDRITE_CANISTER_ID: "aaaaa-aa" },
  });
  assert.notEqual(wrong.status, 0);
});

test("production mapping, cache exclusion, manifest, and release sums are strict", () => {
  assert.equal(JSON.parse(readFileSync(".icp/data/mappings/ic.ids.json")).dendrite, productionId);
  assert.match(readFileSync(".gitignore", "utf8"), /^\/\.icp\/cache\/$/m);
  const yaml = readFileSync("icp.yaml", "utf8");
  assert.match(yaml, /type: "@dfinity\/prebuilt@v2\.0\.0"/);
  assert.match(yaml, /path: dist\/release\/dendrite\.wasm/);
  assert.doesNotMatch(yaml, /\b(reinstall|build:|source:)\b/);
  assert.equal(run("tools/scripts/verify-release-artifacts.sh").status, 0);
  assert.doesNotMatch(readFileSync("dist/release/SHA256SUMS", "utf8"), /SHA256SUMS/);
});

test("release frontend manifest names existing generated assets", () => {
  const manifest = JSON.parse(readFileSync("dist/release/asset-manifest.json"));
  for (const path of Object.values(manifest)) {
    assert.ok(existsSync(join("dist/release/frontend", path)));
  }
});

test("guard rejects unsafe modes, confirmation, IDs, dirty state, and artifacts", () => {
  const base = {
    ...process.env,
    ...productionEnvironment,
    DENDRITE_CONFIRM_MAINNET: productionId,
  };
  for (const mode of ["reinstall", "unknown"]) {
    assert.notEqual(run("tools/scripts/mainnet-deploy.sh", [mode], { env: base }).status, 0);
  }
  assert.notEqual(run("tools/scripts/mainnet-deploy.sh", ["dry-run"], {
    env: { ...base, DENDRITE_CONFIRM_MAINNET: "aaaaa-aa" },
  }).status, 0);
  assert.notEqual(run("tools/scripts/mainnet-deploy.sh", ["dry-run"], {
    env: { ...base, DENDRITE_CANISTER_ID: "aaaaa-aa" },
  }).status, 0);
  const dirty = join(root, ".release-tooling-dirty");
  writeFileSync(dirty, "test");
  try {
    assert.match(run("tools/scripts/mainnet-deploy.sh", ["dry-run"], { env: base }).stderr, /dirty Git worktree/);
  } finally {
    rmSync(dirty);
  }
});

test("release verifier rejects missing, corrupted, and manifest-mismatched Wasm", () => {
  const fixture = mkdtempSync(join(tmpdir(), "dendrite-artifact-"));
  try {
    mkdirSync(join(fixture, "tools/scripts"), { recursive: true });
    mkdirSync(join(fixture, "dist/release"), { recursive: true });
    cpSync(join(root, "tools/scripts/verify-release-artifacts.sh"), join(fixture, "tools/scripts/verify-release-artifacts.sh"));
    writeFileSync(join(fixture, "Cargo.lock"), "");
    const writeValid = () => {
      const wasm = Buffer.from("release-artifact");
      const hash = createHash("sha256").update(wasm).digest("hex");
      writeFileSync(join(fixture, "dist/release/dendrite.wasm"), wasm);
      writeFileSync(join(fixture, "dist/release/SHA256SUMS"), `${hash}  dendrite.wasm\n`);
      writeFileSync(join(fixture, "icp.yaml"), `canisters:\n  - name: dendrite\n    recipe:\n      type: "@dfinity/prebuilt@v2.0.0"\n      configuration:\n        path: dist/release/dendrite.wasm\n        sha256: ${hash}\n`);
    };
    const verify = () => spawnSync("tools/scripts/verify-release-artifacts.sh", [], { cwd: fixture });
    writeValid();
    assert.equal(verify().status, 0);
    rmSync(join(fixture, "dist/release/dendrite.wasm"));
    assert.notEqual(verify().status, 0);
    writeValid();
    writeFileSync(join(fixture, "dist/release/dendrite.wasm"), "corrupt");
    assert.notEqual(verify().status, 0);
    writeValid();
    writeFileSync(join(fixture, "icp.yaml"), readFileSync(join(fixture, "icp.yaml"), "utf8").replace(/[0-9a-f]{64}\n$/, `${"0".repeat(64)}\n`));
    assert.notEqual(verify().status, 0);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("guarded dry-run reaches no lifecycle write", () => {
  const fixture = mkdtempSync(join(tmpdir(), "dendrite-release-"));
  try {
    mkdirSync(join(fixture, "tools/scripts"), { recursive: true });
    mkdirSync(join(fixture, ".icp/data/mappings"), { recursive: true });
    mkdirSync(join(fixture, "dist/release"), { recursive: true });
    mkdirSync(join(fixture, "bin"), { recursive: true });
    for (const script of ["mainnet-deploy.sh", "verify-release-artifacts.sh"]) {
      cpSync(join(root, "tools/scripts", script), join(fixture, "tools/scripts", script));
    }
    writeFileSync(join(fixture, "Cargo.lock"), "");
    writeFileSync(join(fixture, ".icp/data/mappings/ic.ids.json"), `{"dendrite":"${productionId}"}\n`);
    const wasm = Buffer.from("canonical-test-wasm");
    const hash = createHash("sha256").update(wasm).digest("hex");
    writeFileSync(join(fixture, "dist/release/dendrite.wasm"), wasm);
    writeFileSync(join(fixture, "dist/release/SHA256SUMS"), `${hash}  dendrite.wasm\n`);
    writeFileSync(join(fixture, "icp.yaml"), `canisters:\n  - name: dendrite\n    recipe:\n      type: "@dfinity/prebuilt@v2.0.0"\n      configuration:\n        path: dist/release/dendrite.wasm\n        sha256: ${hash}\n`);
    const log = join(fixture, "icp.log");
    writeFileSync(join(fixture, "bin/icp"), `#!/bin/sh
printf '%s\\n' "$*" >> "$ICP_TEST_LOG"
case "$*" in
  "--version") echo "icp 0.2.6" ;;
  "identity default") echo "release-operator" ;;
  "identity principal") echo "aaaaa-aa" ;;
  "canister status dendrite -e ic --id-only") echo "${productionId}" ;;
  "canister status dendrite -e ic --json") echo '{"module_hash":null}' ;;
  "canister settings show dendrite -e ic") echo 'controllers: [aaaaa-aa]' ;;
  *) exit 91 ;;
esac
`);
    chmodSync(join(fixture, "bin/icp"), 0o755);
    run("git", ["init", "-q"], { cwd: fixture });
    run("git", ["config", "user.email", "test@example.invalid"], { cwd: fixture });
    run("git", ["config", "user.name", "Release Test"], { cwd: fixture });
    run("git", ["add", "."], { cwd: fixture });
    run("git", ["commit", "-qm", "fixture"], { cwd: fixture });
    const result = spawnSync("tools/scripts/mainnet-deploy.sh", ["dry-run"], {
      cwd: fixture,
      encoding: "utf8",
      env: {
        ...process.env,
        ...productionEnvironment,
        DENDRITE_CONFIRM_MAINNET: productionId,
        ICP_TEST_LOG: log,
        PATH: `${join(fixture, "bin")}:${process.env.PATH}`,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /dry-run complete; no write performed/);
    assert.doesNotMatch(readFileSync(log, "utf8"), /canister install/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("documentation links resolve and production identifiers are consistent", () => {
  const required = [
    "README.md", "docs/operations/deployment.md", "docs/operations/reproducible-builds.md",
    "docs/operations/release-checklist.md", "docs/operations/operator-gates.md",
    "docs/operations/production-record.md",
  ];
  for (const file of required) {
    const text = readFileSync(file, "utf8");
    assert.match(text, new RegExp(productionId), file);
    assert.match(text, new RegExp(productionOrigin.replaceAll(".", "\\.")), file);
  }
  const markdown = (directory) => readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(entry.parentPath, entry.name));
  for (const file of ["README.md", ...markdown("docs")]) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0];
      if (!target || /^[a-z]+:\/\//i.test(target)) continue;
      assert.ok(existsSync(resolve(dirname(file), target)), `${file}: ${target}`);
    }
  }
});

test("committed release material contains no secret-like content", () => {
  const files = [
    "README.md", "icp.yaml", ".icp/data/mappings/ic.ids.json",
    ...readdirSync("docs", { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name)),
    ...readdirSync("tools/scripts", { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name !== "security-scan.sh")
      .map((entry) => join("tools/scripts", entry.name)),
  ];
  const forbidden = new RegExp([
    "BEGIN (?:RSA |EC |OPENSSH )?PRIVATE" + " KEY",
    "seed" + " phrase",
    "authentication" + " cookie",
    "recovery" + " phrase",
  ].join("|"), "i");
  for (const file of files) assert.doesNotMatch(readFileSync(file, "utf8"), forbidden, file);
});
