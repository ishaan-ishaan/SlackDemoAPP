import { getGroupRows } from "../sheets/groupsSheet";
import { parseNotionPerson } from "../core/notion/NotionParser";

/**
 * Return merged canonical rows.
 * Priority: Sheet rows first (allow manual override), then Notion rows for anything missing.
 */
export function loadGroupsMerged(): Array<{ GroupName: string; Handle?: string; Description?: string; Members?: string }> {
  const sheetRows = getGroupRows();
  // parse example.html Notion JSON (if available)
  let notionRows: any[] = [];
  try {
    const html = HtmlService.createHtmlOutputFromFile("example").getContent();
    const json = JSON.parse(html);
    const result = parseNotionPerson(json);
    notionRows = Array.isArray(result) ? result : [result];
  } catch (e) {
    // no example.html or parse error -> ignore
  }

  // map by group name (case-insensitive)
  const map: Record<string, any> = {};
  sheetRows.forEach((r) => {
    const key = (r.GroupName || "").trim().toLowerCase();
    if (!key) return;
    map[key] = { ...r };
  });
  notionRows.forEach((r) => {
    const key = (r.GroupName || "").trim().toLowerCase();
    if (!key) return;
    if (!map[key]) map[key] = r;
    // if sheet has empty Members but notion has members, fill only missing
    if (map[key].Members === "" && r.Members) map[key].Members = r.Members;
  });

  return Object.values(map).map((r) => ({
    GroupName: String(r.GroupName || "").trim(),
    Handle: (r.Handle || "").trim(),
    Description: (r.Description || "").trim(),
    Members: (r.Members || "").trim()
  }));
}
