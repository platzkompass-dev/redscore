// A country name, a death, or the German past tense "war" is not evidence of war.
// Shared by RSS ingestion and reads so previously misclassified rows stay hidden.
export function isConflictIncident(value: string): boolean {
  const text = value.normalize("NFC").toLowerCase();
  if (/^(?:analysis|opinion|analyse|kommentar|meinung|podcast|dokumentation|interview|rückblick)\b|jahrestag|anniversary|years on from|wahlkampf|ratgeber/.test(text)) return false;
  const military = /militär|\bmilitary\b|\barmee\b|\barmy\b|armed forces|streitkräfte|truppen|soldaten?|soldiers?|kriegs(?:gebiet|verbrechen|handlung)|bewaffnete[nr]?\s+(?:konflikt|gruppen?)|armed conflict|hamas|hezbollah|hisbollah|huthi|houthis|\brebels?\b|miliz/;
  const explicit = /luftangriff|raketenangriff|drohnenangriff|militärschlag|bombardement|beschuss|gefechte?|kampfhandlungen|waffenruhe|waffenstillstand|invasion|militäroffensive|air\s?strikes?|missile attacks?|drone (?:attacks?|strikes?)|military strikes?|bombardment|shelling|armed clashes?|ceasefires?/;
  const unrelated = /mordfall|beziehungstat|femizid|familientragödie|häusliche gewalt|domestic violence|murder case|bärenattacke|bärenangriff|bear attack|tierattacke|tierangriff|animal attack|angriff auf (?:die )?(?:pressefreiheit|meinungsfreiheit)|attack on (?:press freedom|free speech)|handelskrieg|trade war|preiskrieg|price war/;
  if (unrelated.test(text) && !military.test(text) && !explicit.test(text)) return false;
  if (explicit.test(text)) return true;
  const action = /angriff|attacks?|greif\w*\b.{0,100}\ban\b|griff\w*\b.{0,100}\ban\b|offensive|fighting|strikes?|eskalation|escalat|vorrück|advance|raketen|missiles?|töte|getötet|killed|verwundet|wounded|kampf|kämpfe|combat/;
  // Use explicit conflict phrases, never an isolated "war". English and German
  // country pairs retain reports such as "Russland greift die Ukraine an".
  const warContext = /\bkrieg\b|krieg[s-]|bürgerkrieg|\bwar[- ]torn\b|\bwar (?:in|between|against|continues|spreads)\b|\b(?:ongoing|full-scale|civil|ukraine|yemen|sudan|iran) war\b/;
  const pair = (/ukrain/.test(text) && /russland|russia|russian/.test(text)) || (/iran/.test(text) && /\busa?\b|u\.s\.|united states|amerikan/.test(text));
  if (action.test(text) && (military.test(text) || warContext.test(text) || pair)) return true;
  if ((military.test(text) || warContext.test(text) || pair) && /(?:end to|end of|halt|stop|ende|beenden|beendigung).{0,80}(?:conflict|war|krieg|konflikt)/.test(text)) return true;
  return /liveblog|liveticker|live updates|security council live/.test(text) && (warContext.test(text) || military.test(text)) && /krieg|\bwar\b|konflikt|conflict|fighting|attacks?/.test(text);
}
