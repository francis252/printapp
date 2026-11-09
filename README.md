# 4R Shop Management — migration build

Fresh source baseline: `glossy-speed-sales-sync (5).zip`, supplied November 8, 2026.
This is a staged migration of that app, not a rewrite of its quote or mockup workflow.
The source is on GitHub draft PR #1. The two migrations and the `shop-integrations` and `presentation-share` Edge Functions are deployed to the existing 4R Business Hub Supabase project (`bawmhatfwcxztduovlfo`). The frontend is published privately at https://four-r-shop-management.francis-roge-7253.chatgpt.site. The selected existing account has owner membership. Email verification and the new auth return URL remain pending; actual business records/media have not been imported. See `migration/deployment.json` for verified deployment state.

## Run locally

1. `npm ci`
2. Copy `.env.example` to `.env.local`. Use a Supabase project URL and a publishable key (or legacy anon key). Never use a secret/service-role key in Vite.
3. For a new staging project, apply the two `supabase/migrations` files in order. They have already been applied to the selected 4R Business Hub project; do not run them again there. They create only `shop_*` tables/functions and a private `shop-files` bucket. Do not apply the earlier, incompatible normalized schema from the first Claude package.
4. Create the owner's Supabase Auth account through an approved administrator flow. Review `supabase/bootstrap/owner.REVIEW_ONLY.sql`, substitute the real user UUID, then run it as an administrator. Client login never grants shop membership automatically.
5. `npm run dev`

Use `npm test` for the adapter, protected-source, reporting and local database checks, and `npm run build` for a production build. `npm run typecheck` is the original export's broad JS checker, not the validation gate for this migration.

## What changed

- The Base44 SDK and Vite plugin are removed. A small Supabase facade preserves the `base44.entities.*` call shape so the quote and mockup source files do not change. That identifier is a compatibility alias; it never contacts Base44.
- `migration/protected-files.json` holds SHA-256 fingerprints of 23 original quote, pricing, product and mockup files. Tests verify their bytes against the supplied ZIP baseline. Sidebar and application routing are separate changes.
- Supabase sign-in, shop memberships, organization isolation, manager-only financial records, version-checked patching and private artwork uploads.
- Airy navy/tan/white navigation and presentation UI. Reuses the actual product picker and mockup builder. Product collections, metadata, saved revisions, selection, customer preview, browser Print/Save PDF, and transaction-safe conversion to a draft in the existing quote builder.
- Saved company and markup preferences live in Supabase, with a scoped local cache used by the unchanged quote code.
- Operational task tracking, manually recorded invoices and expenses, team roster, and nine operational/receivables reports with filters and CSV exports. Original sales/tax reports remain available.
- Secure customer sharing and product feedback are implemented behind an enable flag. Explicit share creation makes a restricted snapshot; internal notes, contact data, supplier costs and markup are excluded. Share tokens are hashed in the database and expire within 7 days, or sooner at the presentation expiration date. Staff can revoke links.

## Enable customer links after staging verification

The `presentation-share` function is deployed to 4R Business Hub. For a new staging project, deploy `supabase/functions/presentation-share` with the supplied `supabase/config.toml`. Anonymous access to this function is intentional: every read or feedback submission requires a live unguessable share token. It never grants anonymous access to shop records or artwork storage.

The function uses `SUPABASE_URL` and modern named keys from `SUPABASE_PUBLISHABLE_KEYS` and `SUPABASE_SECRET_KEYS`, with legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as compatibility fallbacks. Only this server function uses privileged storage signing; the supplier/email adapter uses the caller's user session. It signs only image references in a token-authorized database snapshot. Live negative checks passed for anonymous record access, unauthenticated supplier calls and invalid share tokens. Set `VITE_PRESENTATION_SHARING_ENABLED=true` only for a frontend targeting the migrated project. Owner-authenticated sharing and storage uploads still require end-to-end verification after the real owner signs in.

Revoking a link blocks fresh reads and feedback immediately. Already issued image URLs can remain valid for up to 10 minutes. Internal artwork URLs last one hour; reload a saved record to renew them. Existing external Base44 file URLs are not copied by this code export; original media must be migrated separately.

## What is not connected or complete

- The ZIP includes entity definitions in `base44/entities/` and seven backend functions in `base44/functions/`. The earlier inspection incorrectly said those definitions and functions were missing. It does not include real customer, quote, product, order or artwork records. Import actual records and copy original media before cutover. No sample records are loaded by this application. Test fixtures exist only inside temporary test databases.
- The three S&S supplier functions have been ported to `supabase/functions/_shared/supplier.mjs` with their original response shapes, color deduplication and size ordering. The authenticated `shop-integrations` entry point checks actual membership in the selected shop and uses the caller's RLS context. Email delivery is ported to an optional Resend adapter restricted to saved shop recipients. Before enabling `VITE_SHOP_INTEGRATIONS_ENABLED`, deploy this function and securely configure `SS_ACCOUNT_NUMBER`, `SS_API_KEY`, `RESEND_API_KEY`, and `SHOP_EMAIL_FROM` as appropriate. No provider credentials or live API behavior were verified here.
- Stripe payment link creation, verified payment webhooks, public quote approvals and scheduled follow-up reminders remain disabled pending their secured migration. The original `markQuotePaid` backend trusted a caller-provided quote ID rather than a verified provider event; that behavior is intentionally not reproduced. Customer quote approval is not exposed through generic database writes. No payments or emails have been initiated by this migration work.
- Team invitations and role changes need a secured administrator endpoint; the team roster is read-only. Normal clients cannot edit membership permissions.
- No P&L, balance sheet, trial balance, general ledger, job gross-profit, QuickBooks export or commission calculation is claimed. Those need real cost/ledger mappings and commission rules. The reports screen explains this rather than inventing figures.
- Task due dates are stored but do not deliver notifications. Invoice/expense payments are manual records and do not move money or send invoices.
- The schema and both Edge Functions are deployed to hosted Supabase. Anonymous record access is denied, unsigned supplier requests return 401, and invalid presentation tokens return 404. End-to-end owner-authenticated browser workflows, PDF pagination and mobile mockup interactions still need staging verification. The setup screen was inspected in the browser; the production frontend build passes.

## Findings retained from the original application

The current Base44 pricing screen showed default 125%, no tiers, and rounding off. Those match the original defaults. Preserve any other browser-specific preferences during import.

The original mockup builder saves a rendered PNG and decoration colors. It does not save editable placement/recoloring source state. This migration does not invent that capability or change the builder.

Original `QuoteBuilder.computeTotals` omits per-line discount factors while `QuoteTotalsBar` includes them. Original saves also update a quote and replace lines through separate calls, not a transaction. Both behaviors are preserved because the quote files are protected; review these separately before production cutover. Browser-back navigation may still bypass the presentation's sidebar/close dirty warning, so save before using Back.

Legacy source records use text IDs. `shop_records` keeps these IDs and unknown fields in JSONB so original relationships and payloads survive import. This is a compatibility-first schema based on the supplied frontend payloads and entity definitions. It does not claim to implement a full accounting ledger.

## Hosted access review

The Supabase advisor flags the intentionally exposed sharing RPCs because they use `SECURITY DEFINER`. `shop_get_presentation_share` and feedback submission require an unexpired token; authenticated conversion and share-management RPCs check actual shop membership and ownership. These findings were reviewed alongside live deny-path checks and the local isolation tests; they are not an assertion that all project advisories are resolved. See [public RPC advisory guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated RPC guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Existing Hub advisories and project-wide Auth settings were not changed by this migration. The project reports [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Owner account selection, verified sign-in and final authenticated staging checks remain required before application cutover.


## Private frontend

The published site is owner-private and uses the existing Supabase backend. Customer share links are disabled on this private frontend; customer previews and Print/Save PDF remain available. The existing owner account must verify its email before sign-in. The login page includes a user-operated verification resend button. The exact `/dashboard` authentication return URL is prepared in Supabase but has not been saved pending approval. No verification email has been sent by the agent. Publishing is a separate step from pushing to the GitHub review branch; a GitHub push does not automatically redeploy this Site.
