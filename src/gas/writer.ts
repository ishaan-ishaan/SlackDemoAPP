import { SHEETS } from "../shared/sheetConfig";
import { getOrCreateSheet } from "./utils/init";

type Row = Record<string, any>;

export function appendRows(key: keyof typeof SHEETS, rows: Row[]) {
  if (!rows || rows.length === 0) return 0;
  const cfg = SHEETS[key];
  const sheet = getOrCreateSheet(key);
  const headerNames = Object.values(cfg.columns);
  const fields = Object.keys(cfg.columns);
  const actualHeaders = sheet.getRange(1, 1, 1, headerNames.length).getValues()[0].map((h: any) => String(h || "").trim());
  for (let i = 0; i < headerNames.length; i++) {
    if (actualHeaders[i] !== headerNames[i]) {
      throw new Error(`Header mismatch in sheet "${cfg.sheetName}". Expected "${headerNames[i]}", found "${actualHeaders[i]}"`);
    }
  }
  const matrix = rows.map(r => fields.map(f => r[f] ?? ""));
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, matrix.length, headerNames.length).setValues(matrix);
  return matrix.length;
}

export function writePeople(rows: Row[]) {
  return appendRows("people", rows);
}