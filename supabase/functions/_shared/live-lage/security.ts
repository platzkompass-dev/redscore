const MAX_RESPONSE_BYTES = 2_000_000;

const namedEntities: Record<string, string> = {
  amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"',
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß",
  ndash: "–", mdash: "—", hellip: "…", bdquo: "„", ldquo: "“", rdquo: "”", rsquo: "’",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return namedEntities[entity] ?? namedEntities[entity.toLowerCase()] ?? match;
  });
}

function repairCommonMojibake(value: string): string {
  const replacements: Record<string, string> = {
    "Ã¤": "ä", "Ã¶": "ö", "Ã¼": "ü", "Ã„": "Ä", "Ã–": "Ö", "Ãœ": "Ü", "ÃŸ": "ß",
    "â€“": "–", "â€”": "—", "â€ž": "„", "â€œ": "“", "â€": "”", "â€™": "’", "â€¦": "…",
    "Â·": "·", "Â": "",
  };
  return Object.entries(replacements).reduce((text, [broken, fixed]) => text.replaceAll(broken, fixed), value);
}

export function plainText(value: unknown, maxLength = 1200): string {
  return repairCommonMojibake(decodeHtmlEntities(String(value ?? "")))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
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
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_RESPONSE_BYTES) throw new Error("Source response is too large");
    const headerCharset = response.headers.get("content-type")?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1];
    const prefix = new TextDecoder("ascii").decode(bytes.slice(0, 240));
    const xmlCharset = prefix.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i)?.[1];
    const declared = (headerCharset || xmlCharset || "utf-8").toLowerCase();
    const encoding = /^(?:iso-8859-1|latin1|windows-1252|cp1252)$/.test(declared) ? "windows-1252" : "utf-8";
    return repairCommonMojibake(new TextDecoder(encoding).decode(bytes));
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
