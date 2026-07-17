import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("canisters/dendrite/public/generated", { recursive: true });
await build({ entryPoints: ["canisters/dendrite/web/src/main.js"], bundle: true, minify: true, sourcemap: false, outfile: "canisters/dendrite/public/generated/app.8f6d8f.js", target: "es2022", legalComments: "none" });
await copyFile("canisters/dendrite/web/src/styles.css", "canisters/dendrite/public/generated/styles.5a4e1d.css");

