import { slackApi } from './api';

export function lookupSlackUserId(email: string): string | null {
  if (!email) return null;
  const res = slackApi(`users.lookupByEmail?email=${encodeURIComponent(email)}`);
  if (!res.ok) return null;
  return res.user?.id || null;
}
