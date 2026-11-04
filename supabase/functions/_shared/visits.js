export const PUBLIC_VISIT_ROUTES = new Set([
  '/', '/angebote', '/ratgeber/index.html', '/ratgeber/notvorrat.html',
  '/ratgeber/notfallrucksack.html', '/ratgeber/stromausfall.html',
  '/en/guides/index.html', '/en/guides/emergency-supplies.html',
  '/en/guides/emergency-backpack.html', '/en/guides/power-outage.html',
]);
export function validVisit(value) {
  return value && typeof value==='object' && !Array.isArray(value)
    && Object.keys(value).length===3 && value.consent===2
    && PUBLIC_VISIT_ROUTES.has(value.route)
    && typeof value.session==='string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.session);
}
