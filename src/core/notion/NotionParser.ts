export type RawNotionPage = any;

export type CleanPerson = {
  greyboxId: string;
  mandateStatus: string;
  name: string;
  position?: string;
  teamCurrent?: string;
  teamPrevious?: string;
  mandateDate?: string;
  hoursInitial?: number | string;
  hoursCurrent?: number | string;
  availability?: string;
  email?: string;
  createdProfile?: string;
  notionUrl?: string;
  errorDetection?: string;
  lastUpdate?: string;
  startDate?: string;
  hoursDecimal?: number | string;
  _raw?: any;
};

function getTitle(field: any) {
  if (!field) return "";
  if (field.title && field.title.length) return field.title[0].plain_text ?? "";
  if (field.rich_text && field.rich_text.length) return field.rich_text[0].plain_text ?? "";
  return "";
}

function getEmail(field: any) {
  return field?.email ?? "";
}

function getStatus(field: any) {
  return field?.status?.name ?? "";
}

function getRollupFirstScalar(field: any) {
  const arr = field?.rollup?.array ?? [];
  if (!arr.length) return "";
  const first = arr[0];
  if (first.type === "date") return first.date?.start ?? "";
  if (first.type === "multi_select") return (first.multi_select || []).map((m: any) => m.name).join(", ");
  if (first.type === "number") return first.number ?? "";
  return "";
}

export function parseNotionPerson(page: RawNotionPage): CleanPerson {
  const p = page.properties ?? {};
  const firstName = getTitle(p["First Name"]);
  const lastName = getTitle(p["Last Name"]);
  const name = firstName || lastName || getTitle(p["Name"]);
  return {
    greyboxId: page.id ?? "",
    mandateStatus: getStatus(p["Mandate (Status)"]) || getStatus(p["(L) Mandate (Status)"]) || "",
    name: name || "",
    position: getTitle(p["Position (Current)"]) || getTitle(p["Position (OLD)"]) || "",
    teamCurrent: getRollupFirstScalar(p["(L) Team (Current)"]) || getRollupFirstScalar(p["Team (Current)"]) || "",
    teamPrevious: getRollupFirstScalar(p["Team (Previous) (New)"]) || getRollupFirstScalar(p["Team (Previous)(Old)"]) || "",
    mandateDate: (getRollupFirstScalar(p["(L) Mandate (Date)"]) || p["Mandate (Date)"]?.date?.start) ?? "",
    hoursInitial: (getRollupFirstScalar(p["(L) Hours (Initial)"]) || p["Hours (Initial)"]?.number) ?? "",
    hoursCurrent: p["Hours (Current)"]?.number ?? "",
    availability: getTitle(p["Availability (avg h/w)"]) || "",
    email: getEmail(p["Email (Org)"]) || getEmail(p["Email"]),
    createdProfile: p["Created (Profile)"]?.created_time ?? "",
    notionUrl: page.url ?? "",
    errorDetection: "",
    lastUpdate: page["last_edited_time"] ?? p["Last edited time"]?.last_edited_time ?? "",
    startDate: "",
    hoursDecimal: ""
  };
}
