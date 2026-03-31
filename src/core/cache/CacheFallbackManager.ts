// src/core/cache/CacheFallbackManager.ts
import { CacheDriver } from "./CacheDriver.js";

export class CacheFallbackManager {
  private static drivers: CacheDriver[] = [];
  private static active: CacheDriver | null = null;
  private static readonly opTimeoutMs = 3000;

  /**
   * Register fallback chain: first = primary, last = backup
   */
  static useChain(drivers: CacheDriver[]) {
    this.drivers = drivers;
    this.active = drivers[0];
  }

  static getActiveDriver(): CacheDriver | null {
    return this.active;
  }

  static getDrivers(): CacheDriver[] {
    return [...this.drivers];
  }

  private static async runWithTimeout<T>(
    task: Promise<T>,
    timeoutMs = this.opTimeoutMs
  ): Promise<{ timedOut: boolean; error?: unknown }> {
    const timedTask = task
      .then(() => ({ timedOut: false as const }))
      .catch((error) => ({ timedOut: false as const, error }));

    const timeoutTask = new Promise<{ timedOut: true }>((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    });

    const result = await Promise.race([timedTask, timeoutTask]);
    return result;
  }

  /**
   * Try an operation on each driver in order until success.
   */
  private static async tryChain<T>(
    fn: (driver: CacheDriver) => Promise<T>,
    onFailure?: (err: any, driver: CacheDriver) => void
  ): Promise<T> {
    for (const driver of this.drivers) {
      try {
        const result = await fn(driver);
        this.active = driver;
        return result;
      } catch (err) {
        onFailure?.(err, driver);
        // try next
      }
    }
    throw new Error("All cache drivers failed in fallback chain.");
  }

  // ----------- Public unified API -----------

  static async get<T>(key: string): Promise<T | null> {
    return this.tryChain(async (d) => await d.get<T>(key));
  }

  static async set<T>(key: string, value: T, ttl = 60): Promise<void> {
    await this.tryChain(async (d) => await d.set<T>(key, value, ttl));
  }

  static async delete(key: string): Promise<void> {
    await this.tryChain(async (d) => await d.delete(key));
  }

  static async clear(): Promise<void> {
    await this.tryChain(async (d) => await d.clear());
  }

  /**
   * Clear every driver in the fallback chain (not only active/first-success).
   */
  static async clearAllDrivers(): Promise<
    Array<{ driver: string; ok: boolean; error?: string }>
  > {
    const results: Array<{ driver: string; ok: boolean; error?: string }> = [];

    for (const driver of this.drivers) {
      const outcome = await this.runWithTimeout(driver.clear());
      if (outcome.timedOut) {
        results.push({
          driver: driver.constructor.name,
          ok: false,
          error: `timeout after ${this.opTimeoutMs}ms`,
        });
        continue;
      }
      if (outcome.error) {
        results.push({
          driver: driver.constructor.name,
          ok: false,
          error:
            outcome.error instanceof Error
              ? outcome.error.message
              : String(outcome.error),
        });
        continue;
      }
      results.push({ driver: driver.constructor.name, ok: true });
    }

    return results;
  }

  static async shutdownDrivers(): Promise<
    Array<{ driver: string; closed: boolean; error?: string }>
  > {
    const results: Array<{ driver: string; closed: boolean; error?: string }> = [];

    for (const driver of this.drivers) {
      const closable = driver as CacheDriver & {
        close?: () => Promise<void> | void;
        disconnect?: () => Promise<void> | void;
        end?: () => void;
      };

      try {
        if (typeof closable.close === "function") {
          await closable.close();
        } else if (typeof closable.disconnect === "function") {
          await closable.disconnect();
        } else if (typeof closable.end === "function") {
          closable.end();
        }
        results.push({ driver: driver.constructor.name, closed: true });
      } catch (err) {
        results.push({
          driver: driver.constructor.name,
          closed: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }
}
