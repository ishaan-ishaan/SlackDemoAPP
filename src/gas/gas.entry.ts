import { SPREADSHEET_ID, DEFAULT_SHEET_NAME } from '../shared/sheetConfig';
import { syncUsergroups } from '../sync/syncUsergroups';
import { regenerateSheetFromSlack } from '../sync/regenerateUsergroups';

export function runSyncUsergroups() {
  return syncUsergroups(SPREADSHEET_ID, DEFAULT_SHEET_NAME);
}

export function runTestSyncUsergroups() {
  const res = syncUsergroups(SPREADSHEET_ID, DEFAULT_SHEET_NAME);
  Logger.log(JSON.stringify(res, null, 2));
  return res;
}

export function regenerateUsergroups() {
  return regenerateSheetFromSlack(SPREADSHEET_ID, DEFAULT_SHEET_NAME);
}

// expose for Apps Script
(globalThis as any).runSyncUsergroups = runSyncUsergroups;
(globalThis as any).runTestSyncUsergroups = runTestSyncUsergroups;
(globalThis as any).regenerateUsergroups = regenerateUsergroups;
