import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (process.env.NODE_ENV === "production" && !dsn) {
  // Not a thrown error: the app must still run without monitoring, but a
  // production deploy without a DSN is a misconfiguration that should be
  // visible in the console/build logs.
  console.error(
    "[sentry] NEXT_PUBLIC_SENTRY_DSN is not set — client error monitoring is disabled."
  );
}

Sentry.init({
  dsn,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay: 10% of all sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Don't send Sentry events on localhost:8080 (Go backend)
  tracePropagationTargets: ["localhost:3000", /^\//],
});

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
