import { createGateway, generateImage } from "ai";

const MAX_UPLOAD_BYTES = 8_000_000;
const MAX_OUTPUT_BYTES = 8_000_000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const rateLimitBuckets = globalThis.__redscoreImageRateLimits || new Map();
globalThis.__redscoreImageRateLimits = rateLimitBuckets;

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

function json(status, payload, extraHeaders = {}) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extraHeaders,
    },
  });
}

function configuration(request) {
  // Vercel exposes the short-lived OIDC identity as an environment variable in
  // builds/local development and as this protected header inside Functions.
  const runtimeOidcToken = request?.headers?.get("x-vercel-oidc-token") || "";
  const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || runtimeOidcToken;
  const directToken = process.env.OPENAI_API_KEY || "";
  const useGateway = Boolean(gatewayToken);
  const enabledSetting = process.env.PERSONALIZATION_ENABLED;
  const enabled = enabledSetting === "true" || (enabledSetting !== "false" && useGateway);
  return {
    token: useGateway ? gatewayToken : directToken,
    enabled,
    model: useGateway
      ? (process.env.AI_GATEWAY_IMAGE_MODEL || "openai/gpt-image-2")
      : (process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst"),
    endpoint: useGateway
      ? "https://ai-gateway.vercel.sh/v1/images/edits"
      : "https://api.openai.com/v1/images/edits",
    provider: useGateway ? "vercel-ai-gateway" : "openai-direct",
  };
}

function requestIdentity(request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "local";
  return forwarded.split(",")[0].trim().slice(0, 80) || "local";
}

function consumeRateLimit(request) {
  const now = Date.now();
  const key = requestIdentity(request);
  const existing = rateLimitBuckets.get(key);
  const bucket = !existing || now >= existing.resetAt
    ? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
    : existing;

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  if (rateLimitBuckets.size > 5_000) {
    for (const [bucketKey, value] of rateLimitBuckets) {
      if (now >= value.resetAt) rateLimitBuckets.delete(bucketKey);
    }
  }
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - bucket.count };
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

export async function GET(request) {
  const { token, enabled, provider } = configuration(request);
  const available = Boolean(token && enabled);
  return json(200, {
    available,
    scenarios: Object.keys(SCENARIOS),
    provider: available ? provider : null,
    message: available ? "Bildpersonalisierung ist verfügbar." : "Der persönliche Bilddienst ist noch nicht freigeschaltet.",
  });
}

export async function POST(request) {
  const { token, enabled, model, endpoint, provider } = configuration(request);
  if (!enabled || !token) return json(503, { error: "Die serverseitige Bildpersonalisierung ist noch nicht freigeschaltet." });
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

  const rateLimit = consumeRateLimit(request);
  if (!rateLimit.allowed) {
    return json(429, { error: "Das Bildlimit für diesen Anschluss ist erreicht. Bitte später erneut versuchen." }, { "retry-after": String(rateLimit.retryAfter) });
  }

  const prompt = `${scenario.prompt}\n${householdContext(form.get("household"))}\nPreserve natural skin texture, age, body proportions, and recognizable identity. Do not add text, logos, watermarks, uniforms, weapons, visible injuries, or disaster victims.`;
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";

  try {
    let output;
    let mediaType = "image/png";
    if (provider === "vercel-ai-gateway") {
      const gateway = createGateway({ apiKey: token });
      const generated = await generateImage({
        model: gateway.image(model),
        prompt: { text: prompt, images: [inputBytes] },
        size: "1536x1024",
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(280_000),
      });
      output = generated.image.uint8Array;
      mediaType = generated.image.mediaType || mediaType;
    } else {
      const upstreamForm = new FormData();
      upstreamForm.append("model", model);
      upstreamForm.append("image", new File([inputBytes], `reference-image.${extension}`, { type: image.type }));
      upstreamForm.append("prompt", prompt);
      upstreamForm.append("size", "1536x1024");
      upstreamForm.append("quality", "medium");
      upstreamForm.append("output_format", "webp");
      upstreamForm.append("output_compression", "82");
      if (!/^gpt-image-2(?:-|$)/.test(model)) upstreamForm.append("input_fidelity", "high");
      const result = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: upstreamForm,
        redirect: "error",
        signal: AbortSignal.timeout(280_000),
      });
      if (!result.ok) {
        const upstreamError = await result.json().catch(() => ({}));
        const upstreamCode = String(upstreamError?.error?.code || upstreamError?.code || "unknown").slice(0, 80);
        const upstreamType = String(upstreamError?.error?.type || upstreamError?.type || "unknown").slice(0, 80);
        console.error("RedScore personalization upstream failure", {
          status: result.status,
          requestId: result.headers.get("x-request-id") || "no-request-id",
          code: upstreamCode,
          type: upstreamType,
          provider,
          model,
        });
        if (result.status === 402) return json(503, { error: "Das Bildbudget ist momentan ausgeschöpft. Bitte später erneut versuchen." });
        if (result.status === 401 || result.status === 403) return json(503, { error: "Der Bilddienst ist serverseitig noch nicht korrekt verbunden. Bitte später erneut versuchen." });
        return json(result.status === 429 ? 429 : 502, { error: result.status === 429 ? "Die Bildgenerierung ist gerade ausgelastet. Bitte später erneut versuchen." : "Das personalisierte Motiv konnte nicht erzeugt werden." });
      }
      const payload = await result.json();
      const encoded = payload?.data?.[0]?.b64_json;
      if (typeof encoded !== "string") throw new Error("missing image output");
      output = Buffer.from(encoded, "base64");
      mediaType = "image/webp";
    }
    if (!output.length || output.length > MAX_OUTPUT_BYTES) throw new Error("invalid image output size");
    return new Response(output, {
      status: 200,
      headers: {
        "content-type": mediaType,
        "content-length": String(output.length),
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="redscore-${scenarioKey}.${mediaType === "image/webp" ? "webp" : "png"}"`,
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "x-redscore-scenario": scenarioKey,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("RedScore personalization failure", message.slice(0, 240));
    if (/free tier users|upgrade to paid credits|credits/i.test(message)) {
      return json(503, { error: "Für personalisierte Bilder sind AI-Gateway-Credits erforderlich. Bitte im Vercel-AI-Gateway Guthaben freischalten." });
    }
    if (/no providers available/i.test(message)) {
      return json(503, { error: "Für dieses Bildmodell ist aktuell kein Vercel-Anbieter verfügbar. Bitte später erneut versuchen." });
    }
    return json(503, { error: "Die Bildgenerierung ist vorübergehend nicht erreichbar." });
  }
}
