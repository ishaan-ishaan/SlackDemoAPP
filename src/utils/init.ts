import { SHEETS, SheetKey } from "../shared/sheetConfig";

// @ts-ignore: Google Apps Script global
declare const SpreadsheetApp: GoogleAppsScript.Spreadsheet.SpreadsheetApp;

export function getOrCreateSheet(key: SheetKey): GoogleAppsScript.Spreadsheet.Sheet {
  const cfg = SHEETS[key];
  const ss = SpreadsheetApp.openById(cfg.spreadsheetId);
  let sheet = ss.getSheetByName(cfg.sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.sheetName);
  }
  const headers = Object.values(cfg.columns);
  const range = sheet.getRange(1, 1, 1, headers.length);
  const existing = range.getValues()[0].map((v: any) => String(v || "").trim());
  const needUpdate = existing.length < headers.length || headers.some((h, i) => existing[i] !== h);
  if (needUpdate) {
    range.setValues([headers]);
    sheet.setFrozenRows(1);
    range.setFontWeight("bold");
  }
  return sheet;
}
