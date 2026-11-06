# Szenario-Fotoreihe für die öffentliche Startseite

6. November 2026. Mit dem integrierten `image_gen` erzeugt, keine API-/CLI-
Generierung und keine Fotos tatsächlicher Ereignisse. Sechs getrennte Motive,
als optimierte WebP-Dateien (640 × 440) nach `dist/assets/scenarios/` übernommen.
Die unveränderten generierten Originale bleiben unter dem Codex-Bildverzeichnis.
Die Website kennzeichnet die Reihe als mögliche Szenarien und KI-Illustrationen.

## Vollständiges Prompt-Schema

Jeweils ein Aufruf pro Motiv, `transparent_background: false`:

> Create one high-resolution landscape photographic image for a German emergency preparedness website. Photorealistic-natural / editorial disaster preparedness scenario illustration. [SCENE] Professional documentary photography, crisp fine detail, cinematic yet believable natural colors, restrained dramatic atmosphere consistent with dark navy and teal website, readable subject at small card size. Wide landscape composition 3:2, no text, no labels, no logos, no watermarks, no collage, no borders. It is a hypothetical scenario, no actual identifiable current incident, no graphic injuries or victims. Save as a distinct image.

`[SCENE]` wurde jeweils durch den folgenden Wortlaut ersetzt:

- `blackout.webp`: A German residential street during a widespread power outage after dusk. All apartment windows and street lamps are dark, one warm battery lantern visible on a windowsill, dramatic indigo twilight, realistic buildings, no people.
- `flood.webp`: A Central European residential street during serious flooding. Muddy water at doorstep height, water covering the road, sandbags in foreground, cloudy daylight reflected on the water, no people.
- `storm.webp`: A Central European suburban street immediately after a severe windstorm. A large fallen tree across the wet road, broken branches, heavy dark storm clouds, realistic damage without collapsed houses, no people.
- `wildfire.webp`: A forest edge in central Europe during a wildfire, flames among pine trees in the middle distance, smoke drifting across a dry forest path, dramatic late afternoon, controlled documentary framing, no people.
- `heat.webp`: Extreme summer heat and drought in a Central European agricultural landscape. Deep cracked dry earth in foreground, wilted crops, distant hazy village and shimmering warm air, late afternoon sun, no fire, no people.
- `supplies.webp`: A realistic German grocery store aisle during a supply disruption. Mostly empty water and canned-food shelves, only a few unbranded water bottles and tins left, subdued cool light, photographic depth, no people.

Auslieferung: Lazy Loading, feste Bildabmessungen gegen Layoutsprünge, zusammen
unter 400 kB. Desktop: sechs nebeneinander. Tablet/Handy: horizontal scrollbar
mit Scroll-Snap, sichtbarem Wischhinweis und Tastaturfokus. Keine automatische
Bewegung. Bereits geladene Bilder nutzt der vorhandene Service-Worker-Cache.
