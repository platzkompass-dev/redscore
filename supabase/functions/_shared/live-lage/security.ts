const MAX_RESPONSE_BYTES = 2_000_000;

export function plainText(value: unknown, maxLength = 1200): string {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function assertAllowedHttpsUrl(rawUrl: string, allowedHosts: string[]): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
    throw new Error("Source endpoint is not on the HTTPS allowlist");
  }
  if (url.username || url.password || url.port) throw new Error("Credentials and custom ports are forbidden");
  return url;
}

export function safePublicUrl(rawUrl: string, allowedHosts: string[]): string {
  try { return assertAllowedHttpsUrl(rawUrl, allowedHosts).toString(); }
  catch { throw new Error("Invalid public source URL"); }
}

export async function fetchStructured(url: URL, accept: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { accept, "user-agent": "RedScore-LiveLage/0.1 (+https://www.redscore.de)" },
    });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
    const size = Number(response.headers.get("content-length") || 0);
    if (size > MAX_RESPONSE_BYTES) throw new Error("Source response is too large");
    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) throw new Error("Source response is too large");
    return body;
  } finally { clearTimeout(timeout); }
}

export function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
}
