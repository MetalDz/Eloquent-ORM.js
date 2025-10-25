// src/core/cache/setupCache.ts
import { CacheFallbackManager } from "./CacheFallbackManager";
import { MemoryCacheDriver } from "./drivers/MemoryCacheDriver";
import { FileCacheDriver } from "./drivers/FileCacheDriver";
import { MemcachedCacheDriver } from "./drivers/MemcachedCacheDriver";
import { CacheManager } from "./CacheManager"; // still used for simple modes

export function setupCache() {
  const env = process.env.APP_ENV || process.env.NODE_ENV || "development";
  console.log(`[CacheManager] Initializing cache for environment: ${env}`);

  switch (env) {
    case "development":
      CacheManager.use(new MemoryCacheDriver());
      console.log("→ Using MemoryCacheDriver (Development)");
      break;

    case "staging":
      CacheManager.use(new FileCacheDriver(process.env.CACHE_DIR || ".cache"));
      console.log("→ Using FileCacheDriver (Staging)");
      break;

    case "production":
      const host = process.env.MEMCACHED_HOST || "127.0.0.1";
      const port = process.env.MEMCACHED_PORT || "11211";
      const memcachedUrl = `${host}:${port}`;

      const memDriver = new MemcachedCacheDriver(memcachedUrl, 120);
      const fileDriver = new FileCacheDriver(process.env.CACHE_DIR || ".cache");
      const memLocal = new MemoryCacheDriver();

      // 🧩 Setup fallback chain
      CacheFallbackManager.useChain([memDriver, fileDriver, memLocal]);
      console.log(`→ Using Fallback chain (Production): Memcached → File → Memory`);
      break;

    default:
      CacheManager.use(new MemoryCacheDriver());
      console.log("→ Using MemoryCacheDriver (Default fallback)");
  }
}
