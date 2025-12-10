import { build } from 'esbuild';
import { resolve } from 'path';
import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const entry = resolve('src/gas/gas.entry.ts');
(async () => {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'iife',
    globalName: 'CodeBundle',
    outfile: 'build/Code.js',
    target: ['es2019'],
    minify: false,
  });
  // copy example.html
  copyFileSync('example.html', 'build/example.html');
  copyFileSync('appsscript.json', 'build/appsscript.json');
  console.log('Built: build/Code.js + example.html');
})();
