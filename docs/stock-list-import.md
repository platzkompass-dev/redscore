# Handwritten stock list import

Available for signed-in users on Supplies. A photo is resized locally (longest edge 2000px) and converted to JPEG before upload. The original must be at most 15MB. No shelf-photo recognition is offered.

POST `/api/stock-list-scan` requires a same-origin JSON request and a Supabase-validated non-anonymous user token. Image payloads, source URLs and arbitrary extra fields are rejected. The server calls Vercel AI Gateway with strict structured output, a 45-second provider timeout and a configurable vision model. Model instructions treat all text in the photo as untrusted data. No photo, draft or raw recognized line is written to the database or localStorage. A temporary preview is discarded when the dialog closes. Providers process the photo under their own data terms; the UI and privacy information disclose this before sending.

Every row starts unconfirmed. Users can correct name, amount, unit, category, note and stock mapping, or skip it. Editing a confirmed row resets its confirmation. All rows must be reviewed and actual ownership confirmed before applying. Quantities missing in the photo stay blank. Existing custom item matches suggest replacement, never silent addition. Multiple accepted water rows are summed and explicitly replace the total recorded water quantity. New food items do not automatically imply days of food coverage. Import planning is pure and completes validation before state changes; saving uses the existing local/cloud stock workflow.

Configuration: existing SUPABASE_URL and SUPABASE_ANON_KEY; AI_GATEWAY_API_KEY for local deployments, or Vercel request-scoped OIDC in production. Optional STOCK_SCAN_MODEL defaults to openai/gpt-4.1. No secret belongs in browser code.

Validation: 161 Node tests pass. Isolated browser checks use a synthetic list image and mocked model output: review at 320/390/768/1024px, correction resets, missing-quantity gating, water conversion and confirmed persistence. A real handwritten list has not yet been run against the production model; recognition quality needs that acceptance test. No accuracy percentage is claimed.

Before larger-scale use: move the current six-scans-per-user/30-minute in-memory limit to shared storage (it is per server instance), set Gateway spend limits, monitor latency/error codes without photo logging, and evaluate several real handwriting styles and decimal/container cases. Do not remove mandatory review even after evaluation.
