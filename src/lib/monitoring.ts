import * as Sentry from "@sentry/nextjs";

/**
 * Report a handled error to Sentry with a stable area tag so alert rules can
 * target it (e.g. area:webhook, area:upload, area:cron). Never throws.
 */
export function reportError(error: unknown, area: string, extra?: Record<string, unknown>): void {
  try {
    Sentry.withScope((scope) => {
      scope.setTag("area", area);
      if (extra) scope.setExtras(extra);
      Sentry.captureException(error);
    });
  } catch {
    /* monitoring must never break the request */
  }
  if (process.env.NODE_ENV !== "production") console.error(`[${area}]`, error);
}
