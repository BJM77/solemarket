# L7 - Reliability, load testing & DR

## SLOs
| Journey | SLI | Target |
|---|---|---|
| Browse/search | % requests < 1 s server time, non-5xx | 99.9% / 30 d |
| Product page | LCP p75 (CrUX/RUM) | < 2.5 s |
| Listing create | success rate | 99.5% |
| Messaging send | success rate | 99.9% |
Error budgets drive release freezes.

## Load testing (k6)
Scripts in `load/`: browse scroll, search with filters, product view, listing create (emulator project), saved-search cron with 10k searches. Targets: 200 RPS browse at p95 < 800 ms with `maxInstances: 10`; find Firestore hotspots (monotonic ids, counters - move `views` counters to distributed counters/sharded docs).

## Caching
CDN rules for `/_next/static` (immutable), `/_next/image` (30 d), ISR pages; verify App Hosting CDN hit ratio (middleware currently limits caching - minimise middleware matcher to auth-gated paths).

## DR
- Backups: Phase A script (PITR + daily export). Quarterly restore drill into a scratch project with a checklist and timing (RTO target 4 h, RPO 1 min via PITR).
- Storage: object versioning + soft delete on product images bucket.
- Region: Firestore is single-region; document the failover posture (accept regional outage risk at this stage; revisit multi-region at > $X GMV).
- Runbooks: `docs/ops/runbooks/*.md` for: site down, Firestore quota exceeded, Sentry error spike, search provider down (auto-fallback), email provider down.

## Cost guardrails
Budget alerts at 50/90/100% in GCP Billing; per-service quotas for Gemini API; Firestore read anomaly alert.

## Effort
M (2-3 wk).
