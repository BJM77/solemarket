import * as Sentry from "@sentry/nextjs";

// Next.js loads this once per server runtime. Without it the sentry.*.config
// files are never executed and server-side errors are not reported.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Reports errors thrown in Server Components, route handlers, server actions and middleware.
export const onRequestError = Sentry.captureRequestError;
