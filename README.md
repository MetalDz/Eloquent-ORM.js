# Eloquent ORM JS

Laravel-inspired ORM + CLI for Node.js + TypeScript with SQL and MongoDB runtime support.

Package: `eloquent-orm.js`

## What this package gives you

- SQL and MongoDB model persistence with a Laravel-like runtime API.
- CLI generators for models, services, controllers, migrations, factories, and scenarios.
- Migration and seed pipelines across test/CLI environments.
- Built-in cache manager and cache-clearing utilities.
- Relationship support (`belongsTo`, `hasMany`, `belongsToMany`, morph*).

## Install

```bash
npm i eloquent-orm.js
```

## Prerequisites

<!-- supported-prerequisites:start -->
The following versions are the current supported and CI-tested prerequisites.

| Component | Supported / tested version |
| --- | --- |
| Node.js | `20.x` |
| TypeScript | `^5.9.3` |
| MySQL | `8.0` |
| PostgreSQL | `16` |
| MongoDB | `7` |
| SQLite | `SQLite 3.x via better-sqlite3 12.2.0` |
| Memcached | `1.6+ server, client package ^2.2.2` |
<!-- supported-prerequisites:end -->

Run commands with:

```bash
npx eloquent
```

## Quick start (CLI + runtime)

### 1) Generate a model and migration

```bash
npx eloquent make:model User --with-migration
```

Note: command syntax is `eloquent make:model User`, not `eloquent: make: model`.

### 2) Register models in your app bootstrap

Express.js is the required runtime for HTTP-facing usage in this project and integrates without issues.

```ts
import { registerModels } from "eloquent-orm.js";
import { User } from "./app/models/User";
import { Post } from "./app/models/Post";

registerModels([User, Post]);
```

### 3) Run migrations

```bash
npx eloquent make:migration --all
npx eloquent migrate:run --test --all-migrations
```

### 4) Optional cache bootstrap

```ts
import { setupCache } from "eloquent-orm.js";
setupCache(); // Memory/Staging/Production cache selector from env
```

## Common generator commands (runtime-focused)

- `npx eloquent make:model User --with-migration`
- `npx eloquent make:service User`
- `npx eloquent make:controller User`
- `npx eloquent make:seed User --count 10`
- `npx eloquent make:migration --all`
- `npx eloquent migrate:run`
- `npx eloquent migrate:fresh --force --yes`
- `npx eloquent db:seed --class BlogScenarioSeeder --test`

## Runtime CRUD with generated models

Model methods are instance-based for persistence and class-based for read/query.

```ts
import { User } from "./app/models/User";

// List all
const users = await new User().all();

// Safe finder + query chain
const recentActiveUsers = await User.where("is_active", true)
  .orderBy("created_at", "desc")
  .limit(20)
  .get();

const oneByEmail = await User.findOneBy("email", "alice@example.com");
const byId = await new User().find(10);

// Create
const created = await new User().create({
  name: "Alice",
  email: "alice@example.com",
});

// Update via instance persistence
if (created) {
  created.fill({ name: "Alice Johnson" });
  await created.save();
}

// Patch directly if already persisted
const persisted = await User.findOneBy("email", "alice@example.com");
await persisted?.patch?.({ name: "Alice K." });

// Delete
await new User().delete(1);
```

### Soft delete + restore

Soft delete is supported by model mixins, and delete behavior is routed to `deleted_at` when that field is present in your schema/model state.

```ts
await new User().delete(1);   // marks deleted_at
await new User().restore(1);  // clears deleted_at
```

If your model does not currently use soft-delete columns, keep delete/restore aligned with your schema.

## Generating and using services

```bash
npx eloquent make:service User
```

Generated service (`app/services/UserService.ts`):

```ts
const service = new UserService();

await service.all();
await service.find(1);
await service.create({ name: "Alice", email: "alice@example.com" });
await service.update(1, { email: "new@example.com" });
await service.delete(1);
await service.restore(1);
```

This keeps controller code simple and centralizes persistence logic per domain entity.

## Caching inside read/get flows

`setupCache()` configures the active cache driver based on environment.
For read-heavy endpoints, cache at service/query boundary using `CacheManager` (public API).

```ts
import { CacheManager, setupCache } from "eloquent-orm.js";

setupCache();

export async function getActiveUsersFromCache() {
  const key = "users:active:v1";
  const cached = await CacheManager.get(key);
  if (cached) return cached;

  const users = await User.where("is_active", true).orderBy("created_at", "desc").get();
  await CacheManager.set(key, users, 60);
  return users;
}

export async function createUser(payload: Record<string, unknown>) {
  const user = await new User().create(payload);
  await CacheManager.delete("users:active:v1"); // invalidate read cache after write
  return user;
}
```

CLI cache helpers:

- `npx eloquent cache:stats` (inspect runtime cache stats)
- `npx eloquent cache:clear` (clear all cache entries)

## Documentation gap plan (immediate)

The usage docs still need targeted expansions for end-to-end scenarios. Planned work:

1. Expand quick-start with a complete `eloquent make:model` -> `make:migration` -> `migrate:run` -> service/controller flow.
2. Add explicit CRUD examples for:
   - `create` via instance, `find`/`first`/`where`, `orderBy("...", "asc|desc")`, `all`, `patch`, `save`
   - soft-delete flow (`delete`, `restore`, `forceDelete` boundaries)
3. Add service-level templates + full REST examples (`POST/PUT/DELETE` paths).
4. Add a concrete cache-by-get section (TTL, key naming, invalidation, and cache:clear integration).
5. Keep README and Mintlify docs (especially `docs/getting-started/*` and `docs/api/*`) aligned with the same command syntax and runtime examples.
