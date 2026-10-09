// Isolated, loopback-only browser QA. Never deploy this server or use real credentials.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const timestamp = () => new Date().toISOString();
const user = { id: "development-qa-user", email: "qa@example.test", user_metadata: { display_name: "Development QA" } };
let profile = { display_name: "Development QA", adults: [{ gender: "woman" }, { gender: "man" }], children_count: 1, pets: [], postal_code: "10115", city: "Berlin", state: "Berlin", district: "", selected_scene: "family-woman-man", onboarding_completed: true };
let appState = {};
let failSaves = false;
let feedMode = "normal";
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
function json(response, status, payload) { response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify(payload)); }

http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:4181");
  try {
    if (url.pathname === "/__qa/save-failure") { failSaves = url.searchParams.get("enabled") === "1"; return json(response, 200, { failSaves }); }
    if (url.pathname === "/__qa/feed") { feedMode = ["normal", "slow", "stale", "error"].includes(url.searchParams.get("mode")) ? url.searchParams.get("mode") : "normal"; return json(response, 200, { feedMode }); }
    if (url.pathname === "/api/account") {
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      const input = JSON.parse(Buffer.concat(chunks).toString() || "{}");
      if (input.action === "sign_in") {
        if (input.email !== user.email) return json(response, 400, { error: "Development QA: use qa@example.test with a test-only password." });
        return json(response, 200, { user, session: { user, access_token: "development-access", refresh_token: "development-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600 } });
      }
      if (input.action === "load") return json(response, 200, { user, profile, appState });
      if (input.action === "save") { if (failSaves) return json(response, 503, { error: "Development: simulated save failure" }); profile = input.profile; appState = input.appState; return json(response, 200, { ok: true }); }
      if (input.action === "sign_out") return json(response, 200, { ok: true });
      return json(response, 400, { error: "Development action not supported" });
    }
    if (url.pathname === "/api/live-lage") {
      const mode = feedMode;
      if (mode === "slow") await new Promise(resolve => setTimeout(resolve, 5000));
      if (mode === "error") return json(response, 503, { error: "Development: simulated feed failure" });
      const synced = mode === "stale" ? new Date(Date.now() - 20 * 60_000).toISOString() : timestamp();
      const events = url.searchParams.get("filter") === "weather" || url.searchParams.get("filter") === "all" ? [{ id: "development-warning", title: "DEVELOPMENT: regionale Testwarnung", summary: "Nur lokale Testdaten. Keine echte Warnmeldung.", category: "storm", severity: "high", verification_status: "official", region: "Berlin", country: "Deutschland", published_at: timestamp(), first_seen_at: timestamp(), source_count: 1, sources: [], relevance: { level: "high", score: 90 } }] : [];
      return json(response, 200, { events, sources: [{ name: "Deutscher Wetterdienst", last_successful_fetch: synced, last_error: null }], generatedAt: timestamp(), lastSyncAt: synced });
    }
    if (url.pathname === "/api/places") return json(response, 200, { center: { lat: 52.52, lon: 13.4 }, places: [], generatedAt: timestamp() });
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    const filename = path.resolve(publicRoot, `.${pathname}`);
    if (!filename.startsWith(publicRoot + path.sep)) return json(response, 404, {});
    const content = await readFile(filename);
    response.writeHead(200, { "content-type": `${mime[path.extname(filename)] || "application/octet-stream"}; charset=utf-8`, "cache-control": "no-store" }); response.end(content);
  } catch { json(response, 404, { error: "Development QA resource not found" }); }
}).listen(4181, "127.0.0.1", () => console.log("Development QA only: http://127.0.0.1:4181 — qa@example.test / any test password (8+ characters)"));
