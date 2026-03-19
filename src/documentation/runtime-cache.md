# Runtime Cache

Last updated: 2026-03-19

Keep cache logic in services, not controllers.

## Runtime setup

```ts
import { CacheManager, setupCache } from "eloquent-orm.js";

setupCache();
```

## Environment behavior

```env
APP_ENV=production
MEMCACHED_HOST=127.0.0.1
MEMCACHED_PORT=11211
CACHE_DIR=.cache
```

- `APP_ENV=development`: memory cache
- `APP_ENV=staging`: file cache using `CACHE_DIR`
- `APP_ENV=production`: Memcached, then file cache, then memory cache

## Read-through pattern

```ts
async function activeUsers() {
  const key = "users:active:v1";
  const cached = await CacheManager.get(key);
  if (cached) return cached;

  const users = await User.where("is_active", true)
    .orderBy("created_at", "desc")
    .limit(20)
    .get();

  await CacheManager.set(key, users, 60);
  return users;
}
```
