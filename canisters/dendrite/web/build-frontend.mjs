import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolveBuildConfiguration } from "./build-config.mjs";

const root = "canisters/dendrite";
const configuration = resolveBuildConfiguration();
const generated = `${root}/public/generated`;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex").slice(0, 16);
await rm(generated, { recursive: true, force: true });
await mkdir(generated, { recursive: true });
const result = await build({ entryPoints: [`${root}/web/src/main.js`], bundle: true, minify: true, sourcemap: false, write: false, target: "es2022", legalComments: "none", format: "esm", define: {
  __DENDRITE_CANISTER_ID__: JSON.stringify(configuration.canisterId),
  __DENDRITE_API_HOST__: JSON.stringify(configuration.apiHost),
  __DENDRITE_FETCH_ROOT_KEY__: JSON.stringify(configuration.fetchRootKey),
} });
const js = result.outputFiles[0].contents;
const css = await readFile(`${root}/web/src/styles.css`);
const jsName = `app.${digest(js)}.js`, cssName = `styles.${digest(css)}.css`;
await writeFile(`${generated}/${jsName}`, js);
await writeFile(`${generated}/${cssName}`, css);
let html = await readFile(`${root}/web/index.template.html`, "utf8");
html = html.replace("__APP_JS__", `/generated/${jsName}`).replace("__APP_CSS__", `/generated/${cssName}`);
await writeFile(`${root}/public/index.html`, html);
const manifest = { "app.js": `/generated/${jsName}`, "styles.css": `/generated/${cssName}` };
await writeFile(`${root}/public/asset-manifest.json`, `${JSON.stringify(manifest, Object.keys(manifest).sort(), 2)}\n`);
