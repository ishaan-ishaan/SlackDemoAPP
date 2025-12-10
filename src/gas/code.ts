// src/gas/code.ts
import { runPeopleSyncFromObject } from "../jobs/peopleSyncJob";
import { testRunCore } from "../core/testCore";

/** Load example JSON (stored in example file) */
function loadExampleObject(): any {
  const html = HtmlService.createHtmlOutputFromFile("example").getContent();
  return JSON.parse(html);
}

/** Exposed functions */
(globalThis as any).testRun = () => testRunCore();

(globalThis as any).testSyncSampleData = () => {
  try {
    const obj = loadExampleObject();
    const res = runPeopleSyncFromObject(obj);
    Logger.log("testSyncSampleData result: %s", JSON.stringify(res));
    return res;
  } catch (err) {
    Logger.log("testSyncSampleData error: %s", String(err));
    return { ok: false, error: String(err) };
  }
};

(globalThis as any).doGet = (e?: GoogleAppsScript.Events.DoGet) => {
  const params = (e && e.parameter) || {};
  if (params.mode === "json") {
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutput("Apps Script deployed");
};
