import { SHEETS } from "../shared/sheetConfig";
import { getOrCreateSheet } from "./utils/init";

declare const global: any;

global.initAllSheets = () => {
  Object.keys(SHEETS).forEach(key => {
    getOrCreateSheet(key as any);
  });

  return "All sheets initialized!";
};
