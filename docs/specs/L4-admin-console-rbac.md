# L4 - Admin console & RBAC

## Problem
30+ admin pages under `src/app/admin/*`, role checks via `users.role` reads, uneven audit logging, some debug-era tools.

## Goals
One console, least-privilege roles via **Firebase custom claims**, every mutation audited, safe support tooling.

## Roles
`superadmin` (all + role management), `admin` (ops), `moderator` (queues, listings hold/approve, user restrictions), `authenticator` (L1 queue), `support` (read user/order, resend emails, no edits to money), `analyst` (read-only dashboards). Claims set only by a `setUserRole` action callable by superadmin; mirrored to `users.role` for display only.

## Information architecture
- Home: KPIs (new listings, GMV read-only, queue sizes, error rate from Sentry API).
- Queues: moderation, authentication, verification requests, reports.
- Catalogue: listings search (uses search adapter with admin filters), bulk tools (existing power-tools consolidated).
- People: user search, profile, restrictions, notes, activity timeline, "view as" (read-only impersonation that renders the user's view without their token).
- Content: journal/SEO pages, hero/CMS.
- System: feature flags (`config/flags` doc with typed accessor + cache), cron status (last run/result per job from `system_state`), audit log viewer.

## Audit log
`activity_logs/{id}`: actorUid, actorRole, action, target (path), before/after diff (redacted), ip, userAgent, at. Written by a `withAudit(action, fn)` wrapper used by every admin server action. Retention 2 years; export to BigQuery (L6).

## Security
Middleware gate on `/admin` checks claim via session cookie; every server action re-checks claim (`ensureActionAuth(token, ['admin'])` updated to read claims). Remove legacy pages after migration; add e2e that non-admin gets 403 on each admin route.

## Rollout
1. Claims + `withAudit` + role management. 2. Shell/navigation + migrate top 10 pages. 3. Delete/merge the rest. 4. Feature flags + cron status.

## Effort
L (4-6 wk). Open question: SSO for staff (Google Workspace) - recommended.
