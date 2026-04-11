export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.VERCEL === "1") {
    return;
  }

  try {
    const { syncTokenHistoryOnStartup } = await import("./lib/sync-token-history");
    await syncTokenHistoryOnStartup();
  } catch (err) {
    console.error("[instrumentation] token history bootstrap failed:", err);
  }
}
