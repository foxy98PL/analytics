export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Enable startup sync on all runtimes by default.
  // Use DISABLE_STARTUP_TOKEN_SYNC=1 only if you need to reduce cold-start work.
  if (process.env.DISABLE_STARTUP_TOKEN_SYNC === "1") {
    return;
  }

  try {
    const { syncTokenHistoryOnStartup } = await import("./lib/sync-token-history");
    await syncTokenHistoryOnStartup();
  } catch (err) {
    console.error("[instrumentation] token history bootstrap failed:", err);
  }
}
