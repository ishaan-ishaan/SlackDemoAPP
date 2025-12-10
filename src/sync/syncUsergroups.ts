import { getGroupRowsFromSheet } from '../sheets/groupsSheet';
import { listUsergroups, createUsergroup, updateUsergroup, getUsergroupUsers, setUsergroupUsers } from '../slack/usergroups';
import { lookupSlackUserId } from '../slack/users';

function toLowerSafe(s: any) { return String(s || '').trim().toLowerCase(); }

export function syncUsergroups(spreadsheetId: string, sheetName: string) {
  const rows = getGroupRowsFromSheet(spreadsheetId, sheetName);
  const existing = listUsergroups();
  const handleMap: Record<string, any> = {};
  const nameMap: Record<string, any> = {};
  existing.forEach((g: any) => {
    if (g.handle) handleMap[toLowerSafe(g.handle)] = g;
    if (g.name) nameMap[toLowerSafe(g.name)] = g;
  });

  const report: any = { created: [], updated: [], members_updated: [], missing_emails: [], errors: [] };

  rows.forEach((row: any, i: number) => {
    const rowNum = i + 2;
    try {
      const name = String(row.GroupName || '').trim();
      const handle = String(row.Handle || '').trim();
      const description = String(row.Description || '').trim();
      const emails = (String(row.Members || '')).split(',').map((e: string) => e.trim()).filter(Boolean);
      if (!name) return;

      const keyHandle = handle ? toLowerSafe(handle) : '';
      const keyName = toLowerSafe(name);
      let group = (keyHandle && handleMap[keyHandle]) || nameMap[keyName] || null;

      // create
      if (!group) {
        const created = createUsergroup(name, handle, description);
        if (!created.ok) { report.errors.push({ row: rowNum, error: created }); return; }
        group = created.usergroup;
        if (group.handle) handleMap[toLowerSafe(group.handle)] = group;
        if (group.name) nameMap[toLowerSafe(group.name)] = group;
        report.created.push({ row: rowNum, id: group.id });
      } else {
        const fields: any = {};
        if (group.name !== name) fields.name = name;
        if (handle && group.handle !== handle) fields.handle = handle;
        if (description && group.description !== description) fields.description = description;
        if (Object.keys(fields).length > 0) {
          const updated = updateUsergroup(group.id, fields);
          if (!updated.ok) report.errors.push({ row: rowNum, error: updated }); else report.updated.push({ row: rowNum });
        }
      }

      // members
      const missing: string[] = [];
      const userIds = emails.map(em => {
        const uid = lookupSlackUserId(em);
        if (!uid) missing.push(em);
        return uid;
      }).filter(Boolean) as string[];

      if (missing.length) report.missing_emails.push({ row: rowNum, missing });

      const current = getUsergroupUsers(group.id) || [];
      const currentSet = new Set(current);
      const membershipChanged = userIds.length !== current.length || userIds.some(u => !currentSet.has(u));
      if (membershipChanged) {
        const res = setUsergroupUsers(group.id, userIds);
        if (!res.ok) report.errors.push({ row: rowNum, error: res }); else report.members_updated.push({ row: rowNum, added: userIds.length });
      }

    } catch (err: any) {
      report.errors.push({ row: rowNum, error: String(err) });
    }
  });

  Logger.log(JSON.stringify(report, null, 2));
  return report;
}
