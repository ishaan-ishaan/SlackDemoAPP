import { slackApi } from './api';

export function listUsergroups() {
  const res = slackApi('usergroups.list?include_users=false');
  return res.usergroups || [];
}

export function createUsergroup(name: string, handle?: string, description?: string) {
  const payload: any = { name };
  if (handle) payload.handle = handle;
  if (description) payload.description = description;
  return slackApi('usergroups.create', 'post', payload);
}

export function updateUsergroup(id: string, fields: Record<string, string>) {
  const payload: any = { usergroup: id, ...fields };
  return slackApi('usergroups.update', 'post', payload);
}

export function getUsergroupUsers(id: string): string[] {
  const res = slackApi(`usergroups.users.list?usergroup=${encodeURIComponent(id)}`);
  return res.ok ? res.users || [] : [];
}

export function setUsergroupUsers(id: string, userIds: string[]) {
  const payload = { usergroup: id, users: userIds.join(',') };
  return slackApi('usergroups.users.update', 'post', payload);
}
