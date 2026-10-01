export function GET() {
  const accountConfigured = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY));
  return Response.json({ ok: accountConfigured, accountConfigured, liveLageConfigured: accountConfigured, checkedAt: new Date().toISOString() }, {
    status: accountConfigured ? 200 : 503,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}
