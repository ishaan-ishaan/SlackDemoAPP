import { CleanPerson } from "../notion/NotionParser";

export function mapPersonToRow(p: CleanPerson) {
  return {
    greyboxId: p.greyboxId ?? "",
    mandateStatus: p.mandateStatus ?? "",
    name: p.name ?? "",
    position: p.position ?? "",
    teamCurrent: p.teamCurrent ?? "",
    teamPrevious: p.teamPrevious ?? "",
    mandateDate: p.mandateDate ?? "",
    hoursInitial: p.hoursInitial ?? "",
    hoursCurrent: p.hoursCurrent ?? "",
    availability: p.availability ?? "",
    email: p.email ?? "",
    createdProfile: p.createdProfile ?? "",
    notionUrl: p.notionUrl ?? "",
    errorDetection: p.errorDetection ?? "",
    lastUpdate: p.lastUpdate ?? "",
    startDate: p.startDate ?? "",
    hoursDecimal: p.hoursDecimal ?? ""
  };
}

export function mapPeopleToRows(people: CleanPerson[]) {
  return people.map(mapPersonToRow);
}
