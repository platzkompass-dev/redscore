import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPreviewServer, previewConfirmation } from "../scripts/preview-auth-email.mjs";

const template = await readFile(new URL("../supabase/templates/confirmation.html", import.meta.url), "utf8");

test("confirmation mail visibly identifies RedScore even when external images are blocked", async () => {
  const subject = await readFile(new URL("../supabase/templates/confirmation-subject.txt", import.meta.url), "utf8");
  assert.equal(subject.trim(), "RedScore – Bitte bestätige deine E-Mail-Adresse");
  assert.match(template, /<html lang="de">/);
  assert.match(template, /<span[^>]*>Red<\/span><span[^>]*>Score<\/span>/);
  assert.match(template, /Du hast dich bei <strong>RedScore<\/strong> registriert/);
  assert.match(template, /mailto:administration@redscore\.de/);
  assert.match(template, /max-width:580px/);
  assert.match(template, /role="presentation"/);
});

test("confirmation mail preserves the real Supabase verification link without tracking or user-controlled HTML", () => {
  assert.equal((template.match(/href="{{ \.ConfirmationURL }}"/g) || []).length, 2);
  assert.equal((template.match(/{{ \.ConfirmationURL }}/g) || []).length, 3);
  assert.doesNotMatch(template, /{{[^}]*(?:Data|TokenHash|Email|RedirectTo|SiteURL)/);
  assert.doesNotMatch(template, /<script|<iframe|<form|on(?:click|load|error)=|pixel|utm_|google-analytics|localhost|127\.0\.0\.1/i);
  const images = [...template.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
  assert.equal(images.length, 1);
  assert.match(images[0], /src="https:\/\/www\.redscore\.de\/assets\/redscore-logo\.png"/);
  assert.match(template, /Ohne deine Bestätigung wird das Konto nicht aktiviert/);
  assert.match(template, /niemals nach deinem Passwort/);
});

test("preview cannot confirm a real account or reuse a real verification token", () => {
  const html = previewConfirmation(template);
  assert.doesNotMatch(html, /{{|supabase\.co|token_hash|access_token/);
  assert.match(html, /VORSCHAU – keine E-Mail versendet/);
  assert.equal((html.match(/http:\/\/127\.0\.0\.1:4182\/preview-confirmation/g) || []).length, 3);
});

test("isolated preview serves only the template, logo and inert example; never forwards POST requests", async () => {
  const server = await createPreviewServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const page = await fetch(origin);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-security-policy"), /default-src 'none'/);
    const html = await page.text();
    assert.match(html, /src="\/logo.png"/);
    assert.match(html, /VORSCHAU/);
    assert.equal((await fetch(`${origin}/logo.png`)).headers.get("content-type"), "image/png");
    assert.equal((await fetch(`${origin}/preview-confirmation`)).status, 200);
    assert.equal((await fetch(`${origin}/api/account`, { method: "POST", body: "{}" })).status, 405);
    assert.equal((await fetch(`${origin}/.env.local`)).status, 404);
    assert.equal((await fetch(`${origin}/confirmation.html`)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
