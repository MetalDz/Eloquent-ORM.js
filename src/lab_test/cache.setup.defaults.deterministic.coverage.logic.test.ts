describe("cache setup deterministic default coverage", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  test("setupCache covers default environment and driver fallback values without ambient env", () => {
    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;
    delete process.env.CACHE_DIR;
    delete process.env.MEMCACHED_HOST;
    delete process.env.MEMCACHED_PORT;

    const use = jest.fn();
    const useChain = jest.fn();
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const memoryInstances: Array<Record<string, unknown>> = [];
    const fileInstances: Array<{ dir: string }> = [];
    const memcachedInstances: Array<{ servers: string | string[]; ttl: number }> = [];

    jest.doMock("../core/cache/CacheManager", () => ({
      CacheManager: { use },
    }));
    jest.doMock("../core/cache/CacheFallbackManager", () => ({
      CacheFallbackManager: { useChain },
    }));
    jest.doMock("../core/cache/drivers/MemoryCacheDriver", () => ({
      MemoryCacheDriver: class MemoryCacheDriver {
        constructor() {
          memoryInstances.push({});
        }
      },
    }));
    jest.doMock("../core/cache/drivers/FileCacheDriver", () => ({
      FileCacheDriver: class FileCacheDriver {
        public dir: string;

        constructor(dir = ".cache") {
          this.dir = dir;
          fileInstances.push({ dir });
        }
      },
    }));
    jest.doMock("../core/cache/drivers/MemcachedCacheDriver", () => ({
      MemcachedCacheDriver: class MemcachedCacheDriver {
        public servers: string | string[];
        public ttl: number;

        constructor(servers: string | string[] = "127.0.0.1:11211", ttl = 60) {
          this.servers = servers;
          this.ttl = ttl;
          memcachedInstances.push({ servers, ttl });
        }
      },
    }));

    let setupCache!: () => void;
    jest.isolateModules(() => {
      ({ setupCache } = require("../core/cache/setupCache") as {
        setupCache: typeof setupCache;
      });
    });

    setupCache();
    expect(use).toHaveBeenCalledTimes(1);
    expect(memoryInstances).toHaveLength(1);
    expect(log).toHaveBeenCalledWith(
      "[CacheManager] Initializing cache for environment: development",
    );

    process.env.APP_ENV = "staging";
    setupCache();
    expect(fileInstances.at(-1)).toEqual({ dir: ".cache" });

    process.env.APP_ENV = "production";
    setupCache();
    expect(memcachedInstances.at(-1)).toEqual({
      servers: "127.0.0.1:11211",
      ttl: 120,
    });
    expect(fileInstances.at(-1)).toEqual({ dir: ".cache" });
    expect(useChain).toHaveBeenCalledTimes(1);
  });
});
