// Local visual preview only. Does not read credentials, call Auth or send mail.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function previewConfirmation(template) {
  return template.replaceAll("{{ .ConfirmationURL }}", "http://127.0.0.1:4182/preview-confirmation")
    .replace(/(<body\b[^>]*>)/i, '$1<p style="margin:0;padding:12px;text-align:center;background:#fff3c4;color:#3f3210;font:14px Arial,sans-serif;">VORSCHAU – keine E-Mail versendet, kein gültiger Bestätigungslink</p>');
}

export async function createPreviewServer({ templateName = "confirmation" } = {}) {
  if (!["confirmation", "recovery"].includes(templateName)) throw new Error("Unsupported preview template");
  const template = await readFile(new URL(`../supabase/templates/${templateName}.html`, import.meta.url), "utf8");
  const logo = await readFile(new URL("../dist/assets/redscore-logo.png", import.meta.url));
  const preview = previewConfirmation(template).replace("https://www.redscore.de/assets/redscore-logo.png", "/logo.png");
  return http.createServer((request, response) => {
    const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action 'none'" };
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { ...headers, allow: "GET, HEAD" });
      return response.end();
    }
    const pathname = new URL(request.url, "http://127.0.0.1:4182").pathname;
    if (pathname === "/") {
      response.writeHead(200, { ...headers, "content-type": "text/html; charset=utf-8" });
      return response.end(request.method === "HEAD" ? undefined : preview);
    }
    if (pathname === "/logo.png") {
      response.writeHead(200, { ...headers, "content-type": "image/png" });
      return response.end(request.method === "HEAD" ? undefined : logo);
    }
    response.writeHead(pathname === "/preview-confirmation" ? 200 : 404, { ...headers, "content-type": "text/plain; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : "Nur Vorschau. Es wurde kein Konto bestätigt und keine E-Mail versendet.");
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await createPreviewServer({templateName:process.argv.includes("--recovery") ? "recovery" : "confirmation"});
  server.listen(4182, "127.0.0.1", () => console.log("RedScore E-Mail-Vorschau (kein Mailversand): http://127.0.0.1:4182"));
}
