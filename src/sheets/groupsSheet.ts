export function normalizeHeader(h: any) {
  return String(h || '').trim().toLowerCase();
}

export function getGroupRowsFromSheet(spreadsheetId: string, sheetName: string) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName) || ss.getSheets()[0];
  if (!sheet) throw new Error('Sheet not found');
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];
  const headerRow = values[0].map(h => String(h || '').trim());
  const keys = headerRow.map((h: string) => {
    const n = normalizeHeader(h);
    if (['group', 'groupname', 'name'].includes(n)) return 'GroupName';
    if (n === 'handle') return 'Handle';
    if (n === 'description') return 'Description';
    if (n === 'members') return 'Members';
    return h || '';
  });
  const rows = values.slice(1);
  return rows.map(row => {
    const o: any = {};
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i] || headerRow[i] || `col${i}`;
      o[k] = row[i] ?? '';
    }
    return o;
  });
}
