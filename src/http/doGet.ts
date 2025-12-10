// src/http/doGet.ts

export function doGetMain(e: GoogleAppsScript.Events.DoGet) {
  return ContentService
    .createTextOutput("Web App OK — doGet is working")
    .setMimeType(ContentService.MimeType.TEXT);
}
