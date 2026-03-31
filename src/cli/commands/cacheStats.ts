import { CacheManager } from "../../core/cache/CacheManager.js";
import { CacheRegistry } from "../../core/cache/CacheRegistry.js";
import { CacheAnalytics } from "../../core/cache/CacheAnalytics.js";
import { CacheFallbackManager } from "../../core/cache/CacheFallbackManager.js";
import { setupCache } from "../../core/cache/setupCache.js";

function ratioPercent(hits: number, misses: number): string {
  const total = hits + misses;
  if (total === 0) return "0.00%";
  return `${((hits / total) * 100).toFixed(2)}%`;
}

export async function cacheStats() {
  setupCache();
  const driver = CacheManager.getDriver();
  const fallbackActive = CacheFallbackManager.getActiveDriver();
  const fallbackDrivers = CacheFallbackManager.getDrivers();
  const registry = CacheRegistry.getStats();
  const analyticsRows = CacheAnalytics.getStats();

  const totalHits = analyticsRows.reduce((sum, row) => sum + row.hits, 0);
  const totalMisses = analyticsRows.reduce((sum, row) => sum + row.misses, 0);

  console.log("cache:stats");
  console.log(`  manager driver: ${driver.constructor.name}`);
  console.log(
    `  fallback driver: ${fallbackActive ? fallbackActive.constructor.name : "none"}`
  );
  if (fallbackDrivers.length > 0) {
    console.log(
      `  fallback chain: ${fallbackDrivers.map((d) => d.constructor.name).join(" -> ")}`
    );
  } else {
    console.log("  fallback chain: none");
  }
  console.log(
    `  registry: models=${registry.models}, groups=${registry.groups}, keys=${registry.keys}`
  );
  console.log(
    `  analytics: models=${analyticsRows.length}, hits=${totalHits}, misses=${totalMisses}, hit_rate=${ratioPercent(
      totalHits,
      totalMisses
    )}`
  );

  if (registry.groupsByModel.length > 0) {
    console.log("  registry by model:");
    for (const row of registry.groupsByModel) {
      console.log(`    - ${row.model}: groups=${row.groups}, keys=${row.keys}`);
    }
  }

  if (analyticsRows.length > 0) {
    console.log("  analytics by model:");
    for (const row of analyticsRows) {
      console.log(
        `    - ${row.model}: hits=${row.hits}, misses=${row.misses}, ttl=${row.ttl}, hit_rate=${ratioPercent(
          row.hits,
          row.misses
        )}`
      );
    }
  }

  if (fallbackDrivers.length > 0) {
    const shutdownResults = await CacheFallbackManager.shutdownDrivers();
    const shutdownSummary = shutdownResults
      .map((r) => `${r.driver}:${r.closed ? "closed" : "open"}`)
      .join(", ");
    console.log(`  fallback chain shutdown: ${shutdownSummary || "no-op"}`);
  }
}
