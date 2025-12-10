import { build } from "esbuild";
import { resolve } from "path";


(async () => {
const entry = resolve("src/gas/gas.entry.ts");
await build({
entryPoints: [entry],
bundle: true,
platform: "node",
format: "iife",
globalName: "CodeBundle",
outfile: "build/Code.js",
target: ["es2019"],
minify: false,
sourcemap: false
});
console.log("Built build/Code.js");
})();