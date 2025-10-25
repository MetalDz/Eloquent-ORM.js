// src/core/cache/CacheAnalytics.ts
/**
 * 🧠 CacheAnalytics
 * Tracks cache hit/miss counts and dynamically tunes TTLs per model.
 * Minimal overhead — O(1) map updates.
 */

type ModelStats = {
  hits: number;
  misses: number;
  currentTTL: number;
  lastAdjust: number;
};

export class CacheAnalytics {
  private static stats: Map<string, ModelStats> = new Map();
  private static adjustInterval = 100; // adjust every 100 cache ops
  private static minTTL = 30;          // seconds
  private static maxTTL = 3600;        // seconds
  private static counter = 0;

  /**
   * Record a cache hit.
   */
  static hit(model: string, currentTTL: number) {
    this.ensureModel(model, currentTTL);
    this.stats.get(model)!.hits++;
    this.checkAdjust(model);
  }

  /**
   * Record a cache miss.
   */
  static miss(model: string, currentTTL: number) {
    this.ensureModel(model, currentTTL);
    this.stats.get(model)!.misses++;
    this.checkAdjust(model);
  }

  /**
   * Initialize model stats if missing.
   */
  private static ensureModel(model: string, ttl: number) {
    if (!this.stats.has(model)) {
      this.stats.set(model, {
        hits: 0,
        misses: 0,
        currentTTL: ttl,
        lastAdjust: Date.now(),
      });
    }
  }

  /**
   * Check if it's time to adjust TTLs (every N operations).
   */
  private static checkAdjust(model: string) {
    this.counter++;
    if (this.counter % this.adjustInterval === 0) {
      this.adjustTTL(model);
    }
  }

  /**
   * Core logic: tune TTL based on hit/miss ratio.
   */
  private static adjustTTL(model: string) {
    const stat = this.stats.get(model);
    if (!stat) return;

    const total = stat.hits + stat.misses;
    if (total === 0) return;

    const hitRate = stat.hits / total;
    let newTTL = stat.currentTTL;

    // 🧮 Adjust TTL by hit rate thresholds
    if (hitRate > 0.8) newTTL *= 1.25;  // increase by 25%
    else if (hitRate < 0.4) newTTL *= 0.75; // decrease by 25%

    // Clamp to safe bounds
    newTTL = Math.min(this.maxTTL, Math.max(this.minTTL, Math.round(newTTL)));

    if (newTTL !== stat.currentTTL) {
      console.log(
        `[CacheAnalytics] ${model} hitRate=${(hitRate * 100).toFixed(
          1
        )}% → TTL ${stat.currentTTL}s → ${newTTL}s`
      );

      stat.currentTTL = newTTL;
      stat.lastAdjust = Date.now();

      // Try updating model’s default TTL (if class loaded)
      try {
        const ModelClass = (global as any).EloquentModels?.[model];
        if (ModelClass) {
          ModelClass.defaultCacheTTL = newTTL;
        }
      } catch {
        // ignore
      }
    }

    // Reset counters for next cycle
    stat.hits = 0;
    stat.misses = 0;
  }

  /**
   * Optional: expose stats for monitoring.
   */
  static getStats() {
    return Array.from(this.stats.entries()).map(([model, s]) => ({
      model,
      hits: s.hits,
      misses: s.misses,
      ttl: s.currentTTL,
      lastAdjust: new Date(s.lastAdjust).toISOString(),
    }));
  }
}
