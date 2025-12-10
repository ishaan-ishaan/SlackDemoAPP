import { handleSlackEvent } from "./slack/events";

declare const global: any;

global.doPost = (e: GoogleAppsScript.Events.DoPost) => {
  try {
    const data = JSON.parse(e.postData.contents);

    // URL Verification (Slack challenge handshake)
    if (data.type === "url_verification") {
      return ContentService.createTextOutput(data.challenge);
    }

    if (data.event) {
      handleSlackEvent(data.event);
    }

  } catch (err) {
    Logger.log("Webhook error: " + err);
  }

  return ContentService.createTextOutput("OK");
};
