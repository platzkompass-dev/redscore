# Children's details and household motifs

The household form offers **Weiblich / Female** and **Männlich / Male** for each child. The initial disabled placeholder is not a third choice. Active selectors are required; selectors outside the current child count are disabled and excluded from submission. Adult identity options are unchanged.

## Storage and compatibility

- Browser state: `household.children` and `household.childDetails: [{ gender: "girl" | "boy" | "unspecified" }]`.
- Account API / Supabase: `user_profiles.children_count` and `children_details` JSONB, maximum 12 entries. Only the gender property is retained. No names, dates of birth or photos are collected for this feature.
- `unspecified` is internal legacy/missing-data handling, never a selectable child option. Existing accounts are not assigned a guessed gender.
- The existing authenticated owner-only RLS policies remain unchanged. No new secrets or environment variables are required.
- Apply `supabase/migrations/20261024135213_add_child_details_to_user_profiles.sql` before deploying the account API. This additive migration was applied to the RedScore Supabase project and the column, constraint and existing RLS policies were checked afterwards.
- The normal local-state cache, pending-save queue and account sync include child details. The displayed scene is derived from current household data rather than blindly trusting a legacy `selected_scene`.
- If an older client omits `children_details`, the API leaves that column out of its write rather than overwriting a newer client's saved selection. Missing entries are normalized to internal `unspecified` when read.

## Image selection

One child is supported for a single woman, single man, woman/man couple, two women or two men, with separate boy/girl variants. A woman/man household with one boy and one girl uses the existing four-person image. Other compositions or missing details use the person-free `assets/dashboard-storm.png`; they must not show a mismatched family. This is a finite stock-image portfolio, not individualized image generation or identification of a real child's appearance. Child details do not affect quantities or the score.

## Generated assets and prompt set

Created with the **built-in image generation tool**, not the API/CLI fallback. Existing assets were preserved. The six new files are in `dist/assets/households/`:

| Output | Edit target | Requested change |
| --- | --- | --- |
| `family-woman-man-girl.png` | `family-woman-man.png` | Keep both adults; replace the child with one girl with a low ponytail. |
| `single-woman-girl.png` | `single-parent.png` | Keep the woman; replace the child with one girl with a low ponytail. |
| `family-two-women-boy.png` | `family-two-women.png` | Keep both women; replace the child with one boy with short hair. |
| `family-two-men-girl.png` | `family-two-men.png` | Keep both men; replace the child with one girl with a low ponytail. |
| `single-man-girl.png` | `single-parent.png` | Replace the woman with one adult man; replace the child with one girl with a low ponytail. |
| `single-man-boy.png` | `single-parent.png` | Replace the woman with one adult man; retain the boy. |

Shared prompt specification: `Use case: precise-object-edit. Edit target: supplied synthetic RedScore household landscape. Create a photorealistic 16:9 matching portfolio variant with exactly the adults and one child specified above, about 7 years old, seen from behind, with practical hiking clothing and backpacks. Preserve the existing landscape, river, town, dramatic navy clouds, warm orange sunset, lens perspective and realistic detail. Exactly the specified people, no extra people, no pets, no text, no logos or watermarks. Subjects are fictional stock illustration, not real users. Keep people on the right with all heads and feet visible and generous top margin suitable for responsive hero cropping. No distress or injuries. Preserve the calm preparedness mood.` Each output was generated separately and visually inspected.

## Verification

- `node --test`: API sanitization, bounded counts, legacy handling, all supported scene mappings, no child diverse/non-binary option, dynamic required controls, offline/account payload, unchanged score, PNG files and English labels.
- `node scripts/qa-server.mjs`, then `node scripts/qa-household.mjs` with a local Playwright installation (`PLAYWRIGHT_PACKAGE` if not in normal module resolution): isolated synthetic test account only; 390/768/1440px layout, required empty selection, save/reload, girl/boy image change and offline local save. This does not create a real account or change any real household.
- Verified on 24 October 2026: all 91 Node tests passed; headless Edge browser flow passed at all three widths, including English labels, with no page JavaScript errors. The guide build completed successfully. This browser flow uses an isolated mock account API; hosted database schema and owner-only RLS were checked separately, without modifying a real household.
- The Supabase advisor has pre-existing notices for public news RPCs, `pg_net` in public, and disabled leaked-password checks. This feature does not alter those services or their permissions. See [Supabase advisor guidance](https://supabase.com/docs/guides/database/database-linter) and [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
