export function getSlackToken(): string {
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_TOKEN');
  if (!token) throw new Error('Missing SLACK_TOKEN property. Set it in Script Properties.');
  return token;
}

export function slackApi(endpoint: string, method: 'get'|'post' = 'get', payload?: Record<string, any>) {
  const url = `https://slack.com/api/${endpoint}`;
  const token = getSlackToken();
  const options: any = {
    method,
    muteHttpExceptions: true,
    headers: { Authorization: `Bearer ${token}` }
  };
  if (method === 'post' && payload) options.payload = payload;
  const res = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(res.getContentText());
  if (!json.ok) console.warn('Slack API error', endpoint, json);
  return json;
}
