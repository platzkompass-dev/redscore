# RedRewards

RedRewards is an authenticated area, independent from the household RedScore.

## Initial rules

- Household onboarding: 50 points once, checked against the stored profile.
- RedScore of at least 50: a fixed 100 points once. Server recalculates the actual saved household score using the same 70/30 formula; a higher score never earns a larger or repeated milestone bonus.
- First preparedness assessment: 100 points once, checked against saved assessment.
- Water and food recorded: 50 points once, checked against saved stock.
- Two mini lessons: 30 points each, after a minimum 30 seconds and a correct server-checked answer; three wrong attempts per hour. Videos are optional additions to lessons, never evidence of an attended first-aid course.
- First-aid certificate: 300 points only after human approval, at most once in 24 months. A reviewer cannot approve their own certificate.
- One points ledger per account, no cash value or transfer. No points for repetitive page visits or logins.

## Management

Sign in as the existing confirmed `administration@redscore.de` account, open RedRewards and scroll to Administration. Admin membership is held in `reward_admins`; email changes and user metadata do not grant privileges.

The three initial rewards are clearly labelled proposals, inactive and with zero stock. Set the exact model/name, descriptions in both languages, actual stock and points before release. Check fulfilment capacity before enabling a reward. Current shipping form supports Germany. User redemptions reserve stock and debit points in one database transaction. Repeated requests with the same request UUID are idempotent. Cancellation restores stock and points once. Shipped and cancelled orders are terminal states. Admins handle shipping from the queue; no automatic email or courier integration is claimed.

The lesson form accepts direct HTTPS video-file URLs. Only enter files that may legally be embedded. A deliberate user click loads the video; no autoplay or provider connection happens earlier. Points are earned for the knowledge check, not an unverifiable assertion that playback was completed. No videos are configured by default.

## Technical flow

`dist/rewards.js` -> authenticated `POST /api/rewards` -> Supabase Auth validation -> authenticated PostgREST RPC `red_rewards` -> private tables. No new secrets: existing `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or publishable key) suffice. The service-role key is never sent to the browser or required by the endpoint. The local server uses the same route.

Tables: reward_admins, reward_ledger, reward_catalog, reward_redemptions, reward_lessons, reward_answers, reward_learning and reward_proofs. RLS is on; all direct authenticated/anonymous table grants are revoked. Only the constrained security-definer RPC may write. Answer keys and the admin allowlist cannot be read by users. RPC names, prices and points are fixed/validated on the server; arbitrary client `points` fields are ignored. User advisory locks, reward-row locks and uniqueness constraints enforce concurrency and one-time credits.

Uploads: PDF/JPEG/PNG up to 3 MB (below the hosting request limit, including multipart overhead), bounded request body, server signature check, SHA-256 hash, UUID path under user ID. Original filenames are discarded. The `reward-proofs` bucket is private. Existing file hashes and user/provider/course-date combinations cannot be submitted twice. At most three pending submissions and ten stored certificate objects per account. Failed submissions attempt to remove their unreferenced upload using owner-limited Storage deletion. Access uses owner/admin RLS and a 60-second signed download. Normal users never receive review queues or other members' delivery addresses. No rewards/profile payload is cached offline or included in visit tracking.

## Operations before broad promotion

- Finalise actual reward models, stock, conditions, shipping times, eligibility and programme terms. The UI intentionally keeps draft rewards unavailable until released.
- Assign additional trusted reviewers via a controlled database operation if the administrator also needs their own certificates reviewed.
- Treat uploads as untrusted documents. Review with an updated viewer; add malware scanning/quarantine before substantially scaling certificate intake. File signatures do not certify malware safety.
- Establish and execute documented certificate/address retention and deletion procedures. There is no automatic retention cleanup yet. If network cleanup fails after a failed submission, an orphaned private upload can remain; include these in cleanup. Remove binary objects through the Storage API, not by deleting storage metadata with SQL.
- Consider account-abuse controls and a manual identity/duplicate-course check as reward value and volume grow. Self-reported preparedness activities verify saved entries, not the physical contents of a home.
- Monitor failed requests, pending reviews, points liability, stock and fulfilment. No background notification service is configured; administrators must check the queue.

## Verification

`node --test` includes reward API validation, upload format checking and existing account regression tests. `test/rewards-integration.sql` runs against Supabase inside a rollback-only transaction with synthetic `example.test` accounts. It checks restricted ledger/answer privileges, timed learning, idempotent points, stock reservation, account isolation, admin authorization, refunds and terminal states. All synthetic data is rolled back.
