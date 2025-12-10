import { readMandates } from "./reader";
import { writeMandates } from "./writer";

declare const global: any;

global.doGet = (e: GoogleAppsScript.Events.DoGet) => {
  const params = e?.parameter || {};

  // Demo: add numbers
  if (params.a !== undefined && params.b !== undefined) {
    const a = Number(params.a);
    const b = Number(params.b);
    return json({ a, b, result: a + b });
  }

  // List mandates
  if (params.type === "mandates" && params.mode === "list") {
    return json({ ok: true, rows: readMandates() });
  }

  // Generic sample JSON
  if (params.mode === "json") {
    return json({
      status: "success",
      timestamp: new Date().toISOString()
    });
  }

  return text("Unknown GET request — try ?type=mandates&mode=list");
};

global.doPost = (e: GoogleAppsScript.Events.DoPost) => {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.type === "mandates" && Array.isArray(body.rows)) {
      const written = writeMandates(body.rows);
      return json({ ok: true, written });
    }

    return json({ ok: false, error: "Invalid POST body" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message });
  }
};

// Helpers
function json(obj: any) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function text(msg: string) {
  return ContentService.createTextOutput(msg);
}
