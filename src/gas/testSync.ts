// src/gas/testSync.ts
/// <reference types="google-apps-script" />
import { runPeopleSyncFromExampleObject } from "../jobs/peopleSyncJob";
import { parseNotionPerson } from "../core/notion/NotionParser";
import { mapPersonToRow } from "../core/sheets/SheetMapper";

/** Load example.json content (example.html in GAS project). */
function loadExample() {
  const html = HtmlService.createHtmlOutputFromFile("example").getContent();
  return JSON.parse(html);
}

/** testRun – simple smoke test */
globalThis.testRun = () => {
  const s = 2 + 3;
  Logger.log("testRun OK, 2+3=", s);
  return s;
};

/** Full ETL test using example.json */
globalThis.testSyncSampleData = () => {
  try {
    const example = loadExample();
    const res = runPeopleSyncFromExampleObject(example);
    Logger.log("testSyncSampleData result:", res);
    return res;
  } catch (err) {
    Logger.log("testSyncSampleData error:", String(err));
    return { ok: false, error: String(err) };
  }
};
