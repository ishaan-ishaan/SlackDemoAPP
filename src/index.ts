// // src/index.ts
// import { syncUsergroups } from "./sync/syncUsergroups";

// // GAS entrypoints
// export function runSyncUsergroups() {
//   return syncUsergroups();
// }

// export function runTestSyncUsergroups() {
//   const res = syncUsergroups();
//   Logger.log(res);
//   return res;
// }

// // also attach to globalThis so the bundled IIFE has visible functions
// (globalThis as any).runSyncUsergroups = runSyncUsergroups;
// (globalThis as any).runTestSyncUsergroups = runTestSyncUsergroups;
