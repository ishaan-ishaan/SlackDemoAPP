// src/gas/reader.ts
import { getOrCreateSheet } from "./utils/init";
import { SHEETS } from "../shared/sheetConfig";

export type PeopleRow = {
  greyboxId: string;
  mandateStatus: string;
  name: string;
  position: string;
  teamCurrent: string;
  teamPrevious: string;
  mandateDate: string;
  hoursInitial: number;
  hoursCurrent: number;
  availability: number;
  email: string;
  createdProfile: string;
  notionUrl: string;
  errorDetection: string;
  lastUpdate: string;
  startDate: string;
  hoursDecimal: number;
};

export function readPeople(): PeopleRow[] {
  const cfg = SHEETS.people;
  const sheet = getOrCreateSheet("people");

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headerRow = values[0].map(h => String(h || "").trim());
  const dataRows = values.slice(1);

  // Build map from fieldName → column index
  const fieldToIndex: Record<string, number> = {};
  for (const field in cfg.columns) {
    const headerName = cfg.columns[field as keyof typeof cfg.columns];
    const idx = headerRow.indexOf(headerName);
    if (idx === -1) throw new Error(`Missing header: ${headerName}`);
    fieldToIndex[field] = idx;
  }

  return dataRows.map(row => {
    const obj: any = {};
    for (const field in fieldToIndex) {
      obj[field] = row[fieldToIndex[field]];
    }
    return obj as PeopleRow;
  });
}
