import { CacheRegistry } from "../../core/cache/CacheRegistry.js";
import { CacheAnalytics } from "../../core/cache/CacheAnalytics.js";
import { CacheFallbackManager } from "../../core/cache/CacheFallbackManager.js";
import { setupCache } from "../../core/cache/setupCache.js";

export async function cacheClear() {
  setupCache();
  const before = CacheRegistry.getStats();
  const errors: string[] = [];
  const fallbackDrivers = CacheFallbackManager.getDrivers();

  try {
    await CacheRegistry.clearAll();
  } catch (err) {
    errors.push(
      `CacheManager clear failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let fallbackClearResults: Array<{ driver: string; ok: boolean; error?: string }> = [];
  let fallbackShutdownResults: Array<{ driver: string; closed: boolean; error?: string }> = [];
  if (fallbackDrivers.length > 0) {
    try {
      fallbackClearResults = await CacheFallbackManager.clearAllDrivers();
    } catch (err) {
      errors.push(
        `Fallback clear failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    try {
      fallbackShutdownResults = await CacheFallbackManager.shutdownDrivers();
    } catch (err) {
      errors.push(
        `Fallback shutdown failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  CacheAnalytics.reset();
  const after = CacheRegistry.getStats();

  console.log("cache:clear");
  console.log(`  registry keys: ${before.keys} -> ${after.keys}`);
  console.log(`  registry groups: ${before.groups} -> ${after.groups}`);
  console.log("  analytics: reset");
  if (fallbackDrivers.length > 0) {
    const summary = fallbackClearResults
      .map((r) => `${r.driver}:${r.ok ? "ok" : "fail"}`)
      .join(", ");
    console.log(`  fallback chain clear: ${summary || "no-op"}`);
    const shutdownSummary = fallbackShutdownResults
      .map((r) => `${r.driver}:${r.closed ? "closed" : "open"}`)
      .join(", ");
    console.log(`  fallback chain shutdown: ${shutdownSummary || "no-op"}`);
  } else {
    console.log("  fallback driver: none");
  }

  const failedFallback = fallbackClearResults.filter((r) => !r.ok);
  for (const failure of failedFallback) {
    errors.push(`Fallback ${failure.driver} clear failed: ${failure.error ?? "unknown error"}`);
  }
  const failedShutdown = fallbackShutdownResults.filter((r) => !r.closed);
  for (const failure of failedShutdown) {
    errors.push(
      `Fallback ${failure.driver} shutdown failed: ${failure.error ?? "unknown error"}`
    );
  }

  if (errors.length > 0) {
    console.error("  warnings:");
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
  }
}
