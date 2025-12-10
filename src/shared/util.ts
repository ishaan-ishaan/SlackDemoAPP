export const safeText = (arr: any) => {
if (!arr) return "";
if (Array.isArray(arr) && arr.length) return arr[0].plain_text ?? "";
return String(arr || "");
};