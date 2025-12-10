import { build } from "esbuild";
import { resolve } from "path";
import fs from "fs";

const outdir = "dist";
const outfile = resolve(outdir, "Code.js");

// ensure dist
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

const entry = resolve("src/index.ts"); // change if your entry file is different

const opts = {
  entryPoints: [entry],
  bundle: true,
  platform: "browser",        // browser-style globals; prevents Node wrapper
  format: "iife",            // Immediately-invoked function expression
  globalName: "GASBundle",   // optional — keeps bundle self-contained
  outfile,
  target: ["es2019"],        // GAS V8 supports modern JS; set to es2019
  minify: false,
  sourcemap: false,
  legalComments: "none"
};

(async () => {
  try {
    const args = process.argv.slice(2);
    if (args.includes("--watch")) {
      const ctx = await build({ ...opts, watch: { onRebuild(err) { if (err) console.error("rebuild failed:", err); else console.log("rebuilt"); } } });
      console.log("Watching... press CTRL-C to exit");
    } else {
      await build(opts);
      console.log("Built", outfile);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
