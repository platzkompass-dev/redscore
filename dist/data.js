export const navItems = [
  { id: "home", icon: "home", label: "Start" },
  { id: "plan", icon: "plan", label: "Mein Plan" },
  { id: "supplies", icon: "supplies", label: "Vorräte" },
  { id: "map", icon: "map", label: "Schutz in deiner Nähe" },
  { id: "warnschutz", icon: "radio", label: "Warnschutz" },
  { id: "knowledge", icon: "knowledge", label: "Wissen" },
];

export const assessmentQuestions = [
  ["water", "Trinkwasser für mindestens drei Tage vorhanden", "BBK: möglichst zehn Tage; schon drei Tage helfen."],
  ["food", "Haltbare Lebensmittel für mindestens drei Tage vorhanden", "Bedarf, Unverträglichkeiten und Zubereitung ohne Strom berücksichtigen."],
  ["pet", "Futter, Wasser und notwendige Mittel für den Hund eingeplant", "Tierbedarf gehört ausdrücklich in die persönliche Vorsorge."],
  ["radio", "Batterie-, Solar- oder Kurbelradio ist einsatzbereit", "Damit amtliche Informationen auch ohne Mobilfunk ankommen."],
  ["light", "Taschenlampen und passende Ersatzbatterien sind vorhanden", "Offenes Feuer möglichst vermeiden."],
  ["power", "Geladene Powerbanks oder eine alternative Stromquelle sind vorhanden", "Ladezustand regelmäßig prüfen."],
  ["medicine", "Persönliche Medikamente und Erste-Hilfe-Material sind vorhanden", "Verfallsdaten und individuellen Bedarf prüfen."],
  ["documents", "Wichtige Dokumente sind griffbereit und gesichert", "Dokumentenmappe und digitale Sicherung aktuell halten."],
  ["backpack", "Ein Notgepäck für alle Haushaltsmitglieder ist vorbereitet", "Nur so viel einpacken, wie selbst getragen werden kann."],
  ["warnings", "NINA oder ein anderer amtlicher Warnweg ist eingerichtet", "Standortfreigabe und Push-Mitteilungen prüfen."],
  ["contacts", "Notfallkontakte und wichtige Nummern liegen auch auf Papier vor", "Falls das Smartphone nicht verfügbar ist."],
  ["meeting", "Die Familie kennt einen Treffpunkt und Kommunikationsplan", "Plan gemeinsam besprechen und regelmäßig aktualisieren."],
];

export const tasks = [
  { id: "water", title: "Trinkwasservorrat erfassen", priority: "Hoch", category: "Vorräte", icon: "water", description: "Erfasse den tatsächlichen Bestand. Das BBK empfiehlt zwei Liter pro Person und Tag und möglichst zehn Tage Vorsorge.", checklist: ["Vorhandene Liter zählen", "Haltbarkeit prüfen", "Fehlmenge ergänzen"] },
  { id: "food", title: "Lebensmittelvorrat prüfen", priority: "Hoch", category: "Vorräte", icon: "food", description: "Plane haltbare, alltagstaugliche Lebensmittel, die zu euch passen und notfalls ohne Strom zubereitet werden können.", checklist: ["Vorratstage erfassen", "Unverträglichkeiten beachten", "Alternative Kochmöglichkeit prüfen"] },
  { id: "pet", title: "Vorrat für den Hund einplanen", priority: "Hoch", category: "Familie", icon: "special", description: "Plane Futter, Wasser, Medikamente, Leine und Transportmöglichkeit für den Hund ein.", checklist: ["Futtertage erfassen", "Wasserbedarf einplanen", "Leine und Unterlagen bereitlegen"] },
  { id: "backpack", title: "Notgepäck zusammenstellen", priority: "Mittel", category: "Unterwegs", icon: "backpack", description: "Stelle tragbares Notgepäck für zwei Erwachsene und ein Kind zusammen.", checklist: ["Persönliche Medikamente", "Erste-Hilfe-Material", "Radio und Batterien", "Taschenlampe", "Wasserflasche und Verpflegung", "Kleidung und Decke", "Dokumentenkopien"] },
  { id: "radio", title: "Notfallradio prüfen", priority: "Mittel", category: "Zuhause", icon: "radio", description: "Ein Batterie-, Solar- oder Kurbelradio kann auch bei Strom- und Internetausfall informieren.", checklist: ["Gerät vorhanden", "Empfang testen", "Energieversorgung prüfen"] },
  { id: "documents", title: "Dokumentenmappe anlegen", priority: "Mittel", category: "Zuhause", icon: "plan", description: "Sichere wichtige Dokumente geschützt und halte Kopien griffbereit.", checklist: ["Identitätsnachweise", "Versicherungen", "Medizinische Unterlagen", "Digitale Sicherung"] },
  { id: "contacts", title: "Notfallkontakte notieren", priority: "Mittel", category: "Familie", icon: "profile", description: "Halte wichtige Nummern zusätzlich auf Papier fest.", checklist: ["Familie", "Nachbarschaft", "Ärztliche Kontakte", "Versicherung"] },
  { id: "meeting", title: "Treffpunkt festlegen", priority: "Niedrig", category: "Familie", icon: "map", description: "Bestimmt einen erreichbaren Treffpunkt, falls Telefonnetze ausfallen.", checklist: ["Ort bestimmen", "Route besprechen", "Adresse verteilen"] },
];

export const supplyGroups = [
  { id: "water", label: "Trinkwasser", icon: "water", unit: "Liter", target: 60, note: "3 Personen × 2 Liter × 10 Tage", source: "BBK", step: 1 },
  { id: "food", label: "Haltbare Lebensmittel", icon: "food", unit: "Tage", target: 10, note: "Abwechslungsreich und zum Haushalt passend", source: "BBK", step: 1 },
  { id: "pet", label: "Hundebedarf", icon: "special", unit: "Tage", target: 10, note: "Futter, Wasser und notwendige Medikamente", source: "BBK", step: 1 },
  { id: "medicine", label: "Medikamente", icon: "medical", unit: "Tage", target: 10, note: "Individuell mit Arzt oder Apotheke abstimmen", source: "BBK", step: 1 },
  { id: "power", label: "Licht & Energie", icon: "household", unit: "bereit", target: 1, note: "Taschenlampe, Batterien und Powerbank", source: "BBK", step: 1 },
  { id: "hygiene", label: "Hygiene", icon: "health", unit: "bereit", target: 1, note: "Persönlichen Bedarf für zehn Tage prüfen", source: "BBK", step: 1 },
];

export const verifiedPlaces = [
  { id: "police", category: "Behörden", name: "Polizeistation Freiburg/Elbe", address: "Bi de Hütten 3, 21729 Freiburg (Elbe)", icon: "profile", source: "Polizei Niedersachsen" },
  { id: "fire", category: "Behörden", name: "Ortsfeuerwehr Freiburg/Elbe", address: "Am Hafen 4, 21729 Freiburg (Elbe)", icon: "weather-warning", source: "Samtgemeinde Nordkehdingen" },
  { id: "market", category: "Versorgung", name: "EDEKA Eggert", address: "Hauptstraße 48–52, 21729 Freiburg/Elbe", icon: "supplies", source: "EDEKA" },
  { id: "pharmacy", category: "Gesundheit", name: "Arnika-Apotheke", address: "Ziegelstraße, 21737 Wischhafen", icon: "medical", source: "Samtgemeinde Nordkehdingen" },
  { id: "hospital", category: "Gesundheit", name: "Elbe Klinikum Stade", address: "Bremervörder Straße 111, 21682 Stade", icon: "hospital", source: "Elbe Kliniken" },
];

export const knowledgeArticles = [
  { id: "blackout", title: "Stromausfall – vorbereitet bleiben", summary: "Licht, Wärme, Information und sichere Lebensmittel.", category: "Krisen & Gefahrenlagen", icon: "weather-warning", minutes: 8, bullets: ["Taschenlampen statt offener Flammen verwenden.", "Kühl- und Gefriergeräte geschlossen halten.", "Radio und amtliche Warnkanäle verfolgen.", "Empfindliche Geräte vom Netz trennen."] },
  { id: "stock", title: "Lebensmittel richtig bevorraten", summary: "Vorräte, die ihr ohnehin esst, sinnvoll rotieren.", category: "Notfallvorsorge", icon: "food", minutes: 6, bullets: ["Mit drei Tagen beginnen und auf zehn Tage ausbauen.", "Haltbarkeit und Zubereitung ohne Strom berücksichtigen.", "Verbrauchtes regelmäßig ersetzen."] },
  { id: "bag", title: "Notgepäck – die BBK-Checkliste", summary: "Tragbar, persönlich und griffbereit.", category: "Notfallvorsorge", icon: "backpack", minutes: 10, bullets: ["Persönliche Medikamente und Erste Hilfe einpacken.", "Radio, Batterien, Taschenlampe und Powerbank bereithalten.", "Dokumentenkopien, Kleidung, Wasser und Verpflegung ergänzen."] },
  { id: "children", title: "Kinder in Krisenzeiten begleiten", summary: "Routinen, Nähe und altersgerechte Information.", category: "Zuhause & Alltag", icon: "profile", minutes: 7, bullets: ["Ruhig und ehrlich erklären, was passiert.", "Vertraute Gegenstände und Routinen einplanen.", "Kontakt- und Treffpunktplan gemeinsam üben."] },
  { id: "water", title: "Wasser ist Leben", summary: "Zwei Liter pro Person und Tag als BBK-Richtwert.", category: "Infrastruktur", icon: "water", minutes: 5, bullets: ["Trinkwasser kühl und dunkel lagern.", "Gebinde beschriften und regelmäßig prüfen.", "Brauchwasser getrennt halten."] },
];

export const defaultState = {
  authenticated: false,
  profile: { name: "Nicole Mrozinski", initials: "NM" },
  household: { adults: 2, children: 1, dogs: 1, location: "21729 Freiburg (Elbe)", municipality: "Freiburg (Elbe), Flecken", state: "Niedersachsen", district: "Landkreis Stade" },
  assessment: { answers: {}, completedAt: null },
  taskStatus: {},
  supplies: Object.fromEntries(supplyGroups.map(group => [group.id, null])),
  media: { familyPhoto: null },
  settings: { notifications: null, offlinePlacesSaved: false },
  ui: { planFilter: "Alle", supplyFilter: "Alle", mapFilter: "Alle", knowledgeSearch: "", knowledgeCategory: "Alle", modal: null, selectedTask: null },
};

export const sources = {
  bbkGuide: "https://www.bbk.bund.de/SharedDocs/Downloads/DE/Mediathek/Publikationen/Buergerinformationen/Ratgeber/BBK-Vorsorgen-fuer-Krisen-und-Katastrophen.pdf?__blob=publicationFile&v=42",
  bbkChecklist: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/Ratgeber-Checkliste/ratgeber-checkliste_node.html",
  bbkBag: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Notgepaeck/notgepaeck_node.html",
  bbkDocuments: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Dokumente-sichern/dokumente-sichern_node.html",
  nina: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Warn-App-NINA/warn-app-nina_node.html",
  dwd: "https://www.dwd.de/DE/wetter/warnungen_gemeinden/warnWetter_node.html",
};
