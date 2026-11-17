import type { NewsCategory } from "./types.ts";

// An evacuation is a response, not the cause of an incident. Preserve the cause
// so a pepper-spray attack does not become a natural disaster in the filters.
export function evacuationCause(value: string): NewsCategory | null {
  const text = value.toLowerCase();
  if (!/evaku|evacuat|räumung|raeumung/.test(text)) return null;
  if (/sprühattacke|spruehattacke|pfefferspray|reizgas|reizerspray|pepper spray|tear gas/.test(text)) return "hazmat";
  if (/chemieunfall|gefahrstoff|chemical|hazmat/.test(text)) return "chemical_incident";
  if (/radioaktiv|radiologisch|nuklear|nuclear/.test(text)) return "radiological";
  if (/großbrand|grossbrand|major fire/.test(text)) return "major_fire";
  if (/(?:bahnstrecke|flughafen|airport|verkehrsinfrastr).*(?:gesperrt|geschlossen|ausfall|eingestellt|unterbrochen|closed|closure|disruption)|(?:gesperrt|geschlossen|ausfall).*(?:bahnstrecke|flughafen|airport)/.test(text)) return "transport_outage";
  return null;
}
