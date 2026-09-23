import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GET as personalizationStatus, POST as personalizeImage } from "./api/personalize-image.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(root, "dist");

async function loadLocalEnvironment() {
  try {
    const source = await readFile(path.join(root, ".env.local"), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const name = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(name in process.env)) process.env[name] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

await loadLocalEnvironment();

const port = Number(process.env.PORT || 4173);
const supabaseUrl = process.env.SUPABASE_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || "";
const allowedLiveParams = new Set(["scope", "filter", "limit", "country", "region", "district", "lat", "lon"]);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

async function proxyLiveLage(request, response, requestUrl) {
  if (request.method !== "GET") return sendJson(response, 405, { error: "GET required" });
  if (!supabaseUrl || !anonKey) return sendJson(response, 503, { error: "Live-Lage ist serverseitig noch nicht konfiguriert." });

  const upstream = new URL("/functions/v1/live-lage", supabaseUrl);
  for (const [name, value] of requestUrl.searchParams) {
    if (allowedLiveParams.has(name)) upstream.searchParams.append(name, value.slice(0, 120));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const result = await fetch(upstream, {
      signal: controller.signal,
      headers: { authorization: `Bearer ${anonKey}`, apikey: anonKey, accept: "application/json" },
      redirect: "error",
    });
    const declaredSize = Number(result.headers.get("content-length") || 0);
    if (declaredSize > 2_000_000) throw new Error("oversized response");
    const body = await result.text();
    if (Buffer.byteLength(body) > 2_000_000) throw new Error("oversized response");
    response.writeHead(result.ok ? 200 : 502, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(result.ok ? body : JSON.stringify({ error: "Der Lage-Dienst ist vorübergehend nicht erreichbar." }));
  } catch {
    sendJson(response, 503, { error: "Der Lage-Dienst ist vorübergehend nicht erreichbar." });
  } finally {
    clearTimeout(timeout);
  }
}

async function runPersonalizationHandler(request, response, requestUrl) {
  const handler = request.method === "GET" ? personalizationStatus : request.method === "POST" ? personalizeImage : null;
  if (!handler) return sendJson(response, 405, { error: "GET oder POST erforderlich" });
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const webRequest = new Request(requestUrl, {
    method: request.method,
    headers: request.headers,
    body,
  });
  const result = await handler(webRequest);
  const payload = Buffer.from(await result.arrayBuffer());
  response.writeHead(result.status, Object.fromEntries(result.headers.entries()));
  response.end(payload);
}

async function serveStatic(response, requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(requestUrl.pathname); }
  catch { return sendJson(response, 400, { error: "Ungültige URL" }); }
  if (pathname.includes("\0") || pathname.split("/").includes("..") || pathname.startsWith("/.")) {
    return sendJson(response, 404, { error: "Nicht gefunden" });
  }
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let target = path.resolve(publicRoot, requested);
  if (!target.startsWith(`${path.resolve(publicRoot)}${path.sep}`) && target !== path.resolve(publicRoot, "index.html")) {
    return sendJson(response, 404, { error: "Nicht gefunden" });
  }
  try {
    const body = await readFile(target);
    response.writeHead(200, {
      "content-type": mime[path.extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": target.endsWith("index.html") ? "no-cache" : "public, max-age=3600",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
  } catch (error) {
    if (error?.code !== "ENOENT" || path.extname(requested)) return sendJson(response, 404, { error: "Nicht gefunden" });
    target = path.join(publicRoot, "index.html");
    const body = await readFile(target);
    response.writeHead(200, { "content-type": mime[".html"], "cache-control": "no-cache", "x-content-type-options": "nosniff" });
    response.end(body);
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  if (requestUrl.pathname === "/api/health") return sendJson(response, 200, { ok: true, liveLageConfigured: Boolean(supabaseUrl && anonKey), personalizationConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.PERSONALIZATION_ENABLED === "true") });
  if (requestUrl.pathname === "/api/live-lage") return proxyLiveLage(request, response, requestUrl);
  if (requestUrl.pathname === "/api/personalize-image") return runPersonalizationHandler(request, response, requestUrl);
  return serveStatic(response, requestUrl);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`RedScore: http://127.0.0.1:${port}`);
});
