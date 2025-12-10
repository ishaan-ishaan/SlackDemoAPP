import { listUsergroups, getUsergroupUsers } from '../slack/usergroups';
import { SPREADSHEET_ID, DEFAULT_SHEET_NAME } from '../shared/sheetConfig';

export function regenerateSheetFromSlack(spreadsheetId = SPREADSHEET_ID, sheetName = DEFAULT_SHEET_NAME) {
  const groups = listUsergroups();
  const rows: any[] = [];
  groups.forEach((g: any) => {
    const users = getUsergroupUsers(g.id) || [];
    rows.push([g.name || '', g.handle || '', g.description || '', users.join(',')]);
  });

  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  const headers = ['GroupName', 'Handle', 'Description', 'Members'];
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2,1,rows.length, headers.length).setValues(rows);
  return { ok: true, written: rows.length };
}
