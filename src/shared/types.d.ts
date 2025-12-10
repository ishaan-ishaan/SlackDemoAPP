// src/shared/types.d.ts
declare global {
  // allow adding functions to globalThis in GAS
  var testRun: (() => number) | undefined;
  var testSyncSampleData: (() => any) | undefined;
}

export {};
