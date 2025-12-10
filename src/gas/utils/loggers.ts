export const logInfo = (msg: any) => {
  try { Logger.log(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2)); } catch (e) { /* noop */ }
};
export const logWarn = (msg: any) => {
  try { Logger.log("WARN: " + (typeof msg === "string" ? msg : JSON.stringify(msg))); } catch (e) {}
};
export const logError = (msg: any) => {
  try { Logger.log("ERROR: " + (typeof msg === "string" ? msg : JSON.stringify(msg))); } catch (e) {}
};
