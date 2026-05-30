// Next.js instrumentation entry point. Runs once on the Node runtime when the
// server boots. We use it to validate environment variables at startup so missing
// production config fails loud at boot, not at first request.
//
// Enabled via `experimental.instrumentationHook` in next.config.mjs (Next 14.x).
// Becomes a built-in hook in Next 15.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeEnvironment } = await import("@/lib/env-validation");
    initializeEnvironment();
  }
}
