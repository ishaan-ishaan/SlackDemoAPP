import esbuild from "esbuild";
import { globSync } from "glob";
import path from "path";
import fs from "fs";

console.log("Building GAS bundle...");

const gasFiles = globSync("src/gas/**/*.ts");

const toPosix = (p) => p.split(path.sep).join("/");

const entryPath = "src/gas/__gas-entry.ts";

// Compute correct relative paths from entry file
const entryContent = gasFiles
  .map((file) => {
    const rel = "./" + toPosix(path.relative("src/gas", file));
    return `import "${rel}";`;
  })
  .join("\n");

fs.writeFileSync(entryPath, entryContent);

esbuild
  .build({
    entryPoints: [entryPath],
    bundle: true,
    outfile: "build/Code.js",
    format: "iife",
   target: "es2017",
    charset: "utf8",
    platform: "browser",
  })
  .then(() => {
    console.log("✓ GAS build complete");
    fs.unlinkSync(entryPath);
  })
  .catch((err) => {
    console.error("❌ GAS build failed");
    console.error(err);
    fs.unlinkSync(entryPath);
    process.exit(1);
  });
