const MAX_BODY_BYTES = 64_000;
const ALLOWED_GENDERS = new Set(["woman", "man", "diverse", "unspecified"]);
const ALLOWED_PETS = new Set(["dog", "cat", "bird", "small_animal", "fish", "reptile", "other"]);

function json(status, payload) {
  return Response.json(payload, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" } });
}

function configuration() {
  const baseUrl = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
  const publicSiteUrl = process.env.PUBLIC_SITE_URL || "https://www.redscore.de";
  try {
    const url = new URL(baseUrl);
    const siteUrl = new URL(publicSiteUrl);
    const siteProtocolAllowed = siteUrl.protocol === "https:" || (siteUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(siteUrl.hostname));
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co") || !anonKey || !siteProtocolAllowed) return null;
    return { url, anonKey, confirmationUrl: new URL("/?auth=confirmed", siteUrl).toString() };
  } catch { return null; }
}

async function body(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("payload_too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new Error("payload_too_large");
  return text ? JSON.parse(text) : {};
}

function token(request) {
  const value = request.headers.get("authorization") || "";
  return /^Bearer [A-Za-z0-9._~-]+$/.test(value) ? value.slice(7) : "";
}

function cleanProfile(value = {}) {
  const adults = Array.isArray(value.adults) ? value.adults.slice(0, 8).map(item => ({
    gender: ALLOWED_GENDERS.has(item?.gender) ? item.gender : "unspecified",
  })) : [];
  const pets = Array.isArray(value.pets) ? value.pets.slice(0, 12).map(item => ({
    type: ALLOWED_PETS.has(item?.type) ? item.type : "other",
    label: String(item?.label || "").trim().slice(0, 40),
    count: Math.max(1, Math.min(20, Number(item?.count) || 1)),
  })) : [];
  return {
    display_name: String(value.display_name || "").trim().slice(0, 80),
    adults,
    children_count: Math.max(0, Math.min(12, Number(value.children_count) || 0)),
    pets,
    postal_code: String(value.postal_code || "").replace(/\D/g, "").slice(0, 5),
    city: String(value.city || "").trim().slice(0, 80),
    state: String(value.state || "").trim().slice(0, 80),
    district: String(value.district || "").trim().slice(0, 100),
    onboarding_completed: Boolean(value.onboarding_completed),
    selected_scene: String(value.selected_scene || "neutral-household").slice(0, 60),
  };
}

function cleanAppState(value = {}) {
  const safeObject = item => item && typeof item === "object" && !Array.isArray(item) ? item : {};
  return {
    assessment: safeObject(value.assessment), task_status: safeObject(value.task_status),
    supplies: safeObject(value.supplies), supply_details: safeObject(value.supply_details), settings: safeObject(value.settings),
  };
}

async function upstream(config, pathname, options = {}) {
  const result = await fetch(new URL(pathname, config.url), {
    ...options, redirect: "error", signal: AbortSignal.timeout(10_000),
    headers: { apikey: config.anonKey, "content-type": "application/json", accept: "application/json", ...(options.headers || {}) },
  });
  const payload = await result.json().catch(() => ({}));
  return { result, payload };
}

async function currentUser(config, accessToken) {
  if (!accessToken) return null;
  const { result, payload } = await upstream(config, "/auth/v1/user", { headers: { authorization: `Bearer ${accessToken}` } });
  return result.ok && payload?.id ? payload : null;
}

export async function POST(request) {
  const config = configuration();
  if (!config) return json(503, { error: "Kontodienst ist noch nicht konfiguriert." });
  let input;
  try { input = await body(request); }
  catch { return json(400, { error: "Ungültige Anfrage." }); }
  const action = String(input.action || "");

  try {
    if (action === "sign_up" || action === "sign_in") {
      const email = String(input.email || "").trim().toLowerCase().slice(0, 254);
      const password = String(input.password || "");
      if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) return json(400, { error: "Bitte gültige E-Mail und mindestens 8 Zeichen Passwort eingeben." });
      const pathname = action === "sign_up" ? `/auth/v1/signup?redirect_to=${encodeURIComponent(config.confirmationUrl)}` : "/auth/v1/token?grant_type=password";
      const authBody = action === "sign_up" ? { email, password, data: { display_name: String(input.displayName || "").trim().slice(0, 80) } } : { email, password };
      const { result, payload } = await upstream(config, pathname, { method: "POST", body: JSON.stringify(authBody) });
      if (!result.ok) return json(result.status === 429 ? 429 : 400, { error: payload.msg || payload.error_description || "Anmeldung nicht möglich." });
      return json(200, { user: payload.user || (payload.id ? payload : null), session: payload.access_token ? payload : null, confirmationRequired: action === "sign_up" && !payload.access_token });
    }

    if (action === "refresh") {
      const refreshToken = String(input.refreshToken || "").slice(0, 2048);
      const { result, payload } = await upstream(config, "/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
      return result.ok ? json(200, { session: payload }) : json(401, { error: "Sitzung abgelaufen." });
    }

    const accessToken = token(request);
    const user = await currentUser(config, accessToken);
    if (!user) return json(401, { error: "Bitte erneut anmelden." });
    const authHeaders = { authorization: `Bearer ${accessToken}` };

    if (action === "sign_out") {
      await upstream(config, "/auth/v1/logout", { method: "POST", headers: authHeaders, body: "{}" });
      return json(200, { ok: true });
    }
    if (action === "load") {
      const [profileResult, stateResult] = await Promise.all([
        upstream(config, `/rest/v1/user_profiles?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers: authHeaders }),
        upstream(config, `/rest/v1/user_app_state?select=*&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers: authHeaders }),
      ]);
      if (!profileResult.result.ok || !stateResult.result.ok) return json(502, { error: "Kontodaten konnten nicht geladen werden." });
      return json(200, { user: { id: user.id, email: user.email, user_metadata: user.user_metadata || {} }, profile: profileResult.payload[0] || null, appState: stateResult.payload[0] || null });
    }
    if (action === "save") {
      const profile = { user_id: user.id, ...cleanProfile(input.profile), updated_at: new Date().toISOString() };
      const appState = { user_id: user.id, ...cleanAppState(input.appState), updated_at: new Date().toISOString() };
      const headers = { ...authHeaders, prefer: "resolution=merge-duplicates,return=minimal" };
      const [profileResult, stateResult] = await Promise.all([
        upstream(config, "/rest/v1/user_profiles?on_conflict=user_id", { method: "POST", headers, body: JSON.stringify(profile) }),
        upstream(config, "/rest/v1/user_app_state?on_conflict=user_id", { method: "POST", headers, body: JSON.stringify(appState) }),
      ]);
      if (!profileResult.result.ok || !stateResult.result.ok) return json(502, { error: "Kontodaten konnten nicht gespeichert werden." });
      return json(200, { ok: true });
    }
    return json(400, { error: "Unbekannte Aktion." });
  } catch (error) {
    console.error("RedScore account proxy", error instanceof Error ? error.message : "unknown");
    return json(503, { error: "Kontodienst vorübergehend nicht erreichbar." });
  }
}
