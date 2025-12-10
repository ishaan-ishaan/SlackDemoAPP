import { build } from 'esbuild';

await build({
  entryPoints: ['src/node/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: ['node18'],
  sourcemap: true,
  logLevel: 'info',
  tsconfig: 'tsconfig.node.json'
});

console.log('Node build complete.');
