# Monitoring & alerting

## What the code now does
- `src/instrumentation.ts` registers Sentry for the Node and Edge runtimes (previously the server config was never loaded, so **no server errors reached Sentry**) and exports `onRequestError` so errors in Server Components, route handlers, server actions and middleware are captured automatically.
- `src/instrumentation-client.ts` replaces `sentry.client.config.ts` (Sentry v10 convention), samples 10% of traces, filters ResizeObserver/ChunkLoad noise.
- `src/app/error.tsx` and `src/app/global-error.tsx` call `Sentry.captureException`.
- `src/lib/error-handling.ts#reportError` (used across the app) now also sends to Sentry with an `area` tag; `src/lib/monitoring.ts#reportError(error, area)` is the lightweight helper for new code (used in cron and Telegram webhook).
- Sentry is only enabled when `NODE_ENV=production`.

## Required config (Ben)
1. In Sentry (org `benched`, project `benched-au`) copy the DSN.
2. Add to `apphosting.yaml` env (public value, not a secret):
   ```yaml
   - variable: NEXT_PUBLIC_SENTRY_DSN
     value: "https://...ingest.sentry.io/..."
   ```
3. For readable stack traces, create a Sentry auth token (scope `project:releases`) and add it as a **build-time** secret:
   `firebase apphosting:secrets:set SENTRY_AUTH_TOKEN` and in `apphosting.yaml`:
   ```yaml
   - variable: SENTRY_AUTH_TOKEN
     secret: SENTRY_AUTH_TOKEN
     availability: [BUILD]
   ```

## Alert rules to create in Sentry (Alerts > Create)
| Name | Type | Condition | Action |
|---|---|---|---|
| New issue in production | Issue | A new issue is created, `environment:production` | Email + Slack/Telegram |
| Error spike | Metric | `count()` of errors > 50 in 5 min | Email |
| Cron/webhook failure | Issue | event tagged `area:cron` or `area:webhook` | Email immediately |
| Upload failures | Issue | tag `area:upload`, > 10 events in 1 h | Email |
| Rate limit storm | Issue | message contains `RateLimitError`, > 100 in 10 min | Email (possible attack) |
| Slow pages | Metric | p75 `transaction.duration` for `/`, `/browse`, `/product/*` > 2.5 s for 15 min | Email |

## Uptime (Google Cloud Monitoring - free tier)
Monitoring > Uptime checks > Create: `https://benched.au/` and `https://benched.au/api/health` every 1 min from 3 regions, alert after 2 failures to email/SMS.
