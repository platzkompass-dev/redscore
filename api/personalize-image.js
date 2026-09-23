const MAX_UPLOAD_BYTES = 8_000_000;
const MAX_OUTPUT_BYTES = 8_000_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const SCENARIOS = Object.freeze({
  dashboard: {
    label: "Dashboard-Motiv",
    prompt: "Create a calm, photorealistic editorial scene in landscape format. Place only the person or people actually visible in the reference photo, with their identities and facial features faithfully preserved, safely overlooking a German town at dusk while a distant storm front approaches. They are prepared, warmly dressed, and unharmed. The mood is serious but reassuring, never apocalyptic.",
  },
  supplies: {
    label: "Vorrats-Motiv",
    prompt: "Create a calm, photorealistic editorial scene in landscape format. Show only the person or people actually visible in the reference photo, with their identities and facial features faithfully preserved, organizing drinking water, shelf-stable food, a flashlight, batteries, and a radio in a tidy home pantry. Practical German household preparedness, warm cinematic light, no panic.",
  },
  warning: {
    label: "Warnschutz-Motiv",
    prompt: "Create a calm, photorealistic editorial scene in landscape format. Show only the person or people actually visible in the reference photo, with their identities and facial features faithfully preserved, indoors and safe while checking an official warning on a phone and battery radio as severe weather is visible outside. Responsible preparation, no injuries, no sensationalism.",
  },
  knowledge: {
    label: "Wissens-Motiv",
    prompt: "Create a calm, photorealistic editorial scene in landscape format. Show only the person or people actually visible in the reference photo, with their identities and facial features faithfully preserved, learning and planning together at a table with a printed emergency checklist, flashlight, radio, and map. Citizen-friendly crisis preparedness, professional documentary photography.",
  },
});

function json(status, payload) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function configuration() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const enabled = process.env.PERSONALIZATION_ENABLED === "true";
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst";
  return { apiKey, enabled, model };
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

function hasSupportedSignature(bytes, type) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

function householdContext(raw) {
  try {
    const value = JSON.parse(String(raw || "{}"));
    const number = key => Math.max(0, Math.min(12, Number.parseInt(value[key], 10) || 0));
    return `${number("adults")} Erwachsene, ${number("children")} Kinder, ${number("dogs")} Hunde im Haushalt. Do not invent household members who are not visible in the reference.`;
  } catch {
    return "Do not invent additional people or animals who are not visible in the reference.";
  }
}

export async function GET() {
  const { apiKey, enabled } = configuration();
  const available = Boolean(apiKey && enabled);
  return json(200, {
    available,
    scenarios: Object.keys(SCENARIOS),
    message: available ? "Bildpersonalisierung ist verfügbar." : "Der persönliche Bilddienst ist noch nicht freigeschaltet.",
  });
}

export async function POST(request) {
  const { apiKey, enabled, model } = configuration();
  if (!enabled || !apiKey) return json(503, { error: "Die serverseitige Bildpersonalisierung ist noch nicht freigeschaltet." });
  if (!sameOrigin(request)) return json(403, { error: "Anfrage nicht zulässig." });

  let form;
  try { form = await request.formData(); }
  catch { return json(400, { error: "Ungültiger Upload." }); }

  const scenarioKey = String(form.get("scenario") || "");
  const scenario = SCENARIOS[scenarioKey];
  const image = form.get("image");
  if (!scenario) return json(400, { error: "Unbekanntes Motiv." });
  if (!(image instanceof File) || !ALLOWED_IMAGE_TYPES.has(image.type) || image.size < 1 || image.size > MAX_UPLOAD_BYTES) {
    return json(400, { error: "Bitte ein JPEG-, PNG- oder WebP-Bild bis 8 MB verwenden." });
  }

  const inputBytes = new Uint8Array(await image.arrayBuffer());
  if (!hasSupportedSignature(inputBytes, image.type)) return json(400, { error: "Der Dateiinhalt ist kein unterstütztes Bild." });

  const prompt = `${scenario.prompt}\n${householdContext(form.get("household"))}\nPreserve natural skin texture, age, body proportions, and recognizable identity. Do not add text, logos, watermarks, uniforms, weapons, visible injuries, or disaster victims.`;
  const upstreamForm = new FormData();
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  upstreamForm.append("model", model);
  upstreamForm.append("image", new File([inputBytes], `reference-image.${extension}`, { type: image.type }));
  upstreamForm.append("prompt", prompt);
  upstreamForm.append("size", "1536x1024");
  upstreamForm.append("quality", "medium");
  upstreamForm.append("output_format", "webp");
  upstreamForm.append("output_compression", "82");
  if (!/^gpt-image-2(?:-|$)/.test(model)) upstreamForm.append("input_fidelity", "high");

  try {
    const result = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
      redirect: "error",
      signal: AbortSignal.timeout(280_000),
    });
    if (!result.ok) {
      console.error("RedScore personalization upstream status", result.status, result.headers.get("x-request-id") || "no-request-id");
      return json(result.status === 429 ? 429 : 502, { error: result.status === 429 ? "Die Bildgenerierung ist gerade ausgelastet. Bitte später erneut versuchen." : "Das personalisierte Motiv konnte nicht erzeugt werden." });
    }

    const payload = await result.json();
    const encoded = payload?.data?.[0]?.b64_json;
    if (typeof encoded !== "string") throw new Error("missing image output");
    const output = Buffer.from(encoded, "base64");
    if (!output.length || output.length > MAX_OUTPUT_BYTES) throw new Error("invalid image output size");
    return new Response(output, {
      status: 200,
      headers: {
        "content-type": "image/webp",
        "content-length": String(output.length),
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="redscore-${scenarioKey}.webp"`,
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "x-redscore-scenario": scenarioKey,
      },
    });
  } catch (error) {
    console.error("RedScore personalization failure", error instanceof Error ? error.message : "unknown error");
    return json(503, { error: "Die Bildgenerierung ist vorübergehend nicht erreichbar." });
  }
}
