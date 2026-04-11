export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  try {
    const { syncTokenHistoryOnStartup } = await import("./lib/sync-token-history");
    await syncTokenHistoryOnStartup();
  } catch (err) {
    console.error("[instrumentation] token history bootstrap failed:", err);
  }
}
