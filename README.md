# Eloquent ORM JS

[![npm version](https://img.shields.io/npm/v/@alpha.consultings/eloquent-orm.js?logo=npm&label=npm)](https://www.npmjs.com/package/@alpha.consultings/eloquent-orm.js)
[![downloads](https://img.shields.io/npm/dm/@alpha.consultings/eloquent-orm.js?label=downloads)](https://www.npmjs.com/package/@alpha.consultings/eloquent-orm.js)
[![node](https://img.shields.io/node/v/@alpha.consultings/eloquent-orm.js?label=node)](https://www.npmjs.com/package/@alpha.consultings/eloquent-orm.js)
[![ci](https://img.shields.io/github/actions/workflow/status/MetalDz/Eloquent-ORM.js/ci.yml?branch=ai_master&label=ci)](https://github.com/MetalDz/Eloquent-ORM.js/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/MetalDz/Eloquent-ORM.js)
[![license](https://img.shields.io/npm/l/@alpha.consultings/eloquent-orm.js?label=license)](https://github.com/MetalDz/Eloquent-ORM.js/blob/ai_master/LICENSE)
[![docs](https://img.shields.io/badge/docs-official-blue)](https://alphaconsultings.mintlify.app/)
[![Socket Badge](https://badge.socket.dev/npm/package/@alpha.consultings/eloquent-orm.js)](https://socket.dev/npm/package/@alpha.consultings/eloquent-orm.js)

Laravel-inspired ORM + CLI for Node.js + TypeScript with SQL and MongoDB runtime support.

Package: `@alpha.consultings/eloquent-orm.js`

## What this package gives you

<!-- package-quick-info:start -->
Quick info:
- Package: `@alpha.consultings/eloquent-orm.js`
- Version: `1.0.4`
- Latest update: ESM-safe `make:registry` imports for NodeNext apps, PostgreSQL-first Phase 02 scaffolding defaults, and synchronized package metadata guidance.
- Official docs: https://alphaconsultings.mintlify.app
- Quick start: https://alphaconsultings.mintlify.app/getting-started/quick-start
- Release history: https://alphaconsultings.mintlify.app/release/history
- Latest release notes: [PACKAGE-UPDATE-SUMMARY.md](./PACKAGE-UPDATE-SUMMARY.md)
<!-- package-quick-info:end -->

- SQL and MongoDB model persistence with a Laravel-like runtime API.
- CLI generators for models, services, controllers, migrations, factories, and scenarios.
- Migration and seed pipelines across test/CLI environments.
- Built-in cache manager and cache-clearing utilities.
- Relationship support (`belongsTo`, `hasMany`, `belongsToMany`, morph*).

## Install

```bash
npm install @alpha.consultings/eloquent-orm.js
```

## Prerequisites

<!-- supported-prerequisites:start -->
The following versions are the current supported and CI-tested prerequisites.

| Component | Supported / tested version |
| --- | --- |
| Node.js | `^20 || ^22 || ^24` |
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
import { registerModels } from "@alpha.consultings/eloquent-orm.js";
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
import { setupCache } from "@alpha.consultings/eloquent-orm.js";
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

Use static safe-finders for targeted reads and creation, and use loaded instances for persistence updates.

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
const byId = await User.find(10);

// Create
const created = await User.create({
  name: "Alice",
  email: "alice@example.com",
});

// Update via instance persistence
if (created) {
  created.update({ name: "Alice Johnson" });
  await created.save();
}

// Patch directly if already persisted
const persisted = await User.findOneBy("email", "alice@example.com");
await persisted?.patch?.({ name: "Alice K." });

// Delete
await User.deleteById(1);

// Bulk helpers
await User.createMany([
  { name: "Bob", email: "bob@example.com" },
  { name: "Carol", email: "carol@example.com" },
]);
await User.updateMany([1, 2], { is_active: false });
await User.deleteMany([1, 2]);
```

### Soft delete + restore

Soft delete is supported by model mixins, and delete behavior is routed to `deleted_at` when that field is present in your schema/model state.

```ts
await User.deleteById(1);     // marks deleted_at
await User.restoreById(1);    // clears deleted_at
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
import { CacheManager, setupCache } from "@alpha.consultings/eloquent-orm.js";

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
  const user = await User.create(payload);
  await CacheManager.delete("users:active:v1"); // invalidate read cache after write
  return user;
}
```

CLI cache helpers:

- `npx eloquent cache:stats` (inspect runtime cache stats)
- `npx eloquent cache:clear` (clear all cache entries)

## Documentation

The full consumer documentation is organized around the main usage paths:

- `Get Started`: installation, quick start, common scenarios, and cookbook guides
- `Runtime`: CRUD, querying, models, controllers, services, and cache
- `Test`: Jest/runtime testing, factories, seeds, scenarios, and pack smoke
- `ORM`: relations, mixins, soft deletes, migrations, multi-connection strategy, and Mongo guidance
- `CLI`: commands, generators, production-safety rules, and test matrix guidance

Official documentation:

- https://alphaconsultings.mintlify.app/

Start with:

- [Package docs index](https://alphaconsultings.mintlify.app/getting-started/package-docs)
- [Quick start](https://alphaconsultings.mintlify.app/getting-started/quick-start)
- [Runtime CRUD](https://alphaconsultings.mintlify.app/runtime/crud)
- [Runtime querying](https://alphaconsultings.mintlify.app/runtime/querying)

## Published npm Package Notes

- The published npm package intentionally excludes `.map` files to keep the install surface smaller.
- Runtime behavior is unchanged. This affects debug metadata only, not ORM logic, CLI behavior, or public API contracts.
- Reverse navigation from published JavaScript back to the original TypeScript source is therefore not included in the npm tarball.
- Full TypeScript source remains available in the GitHub repository for collaboration, source review, and deeper debugging.
- Official docs: https://alphaconsultings.mintlify.app/
- GitHub source: https://github.com/MetalDz/Eloquent-ORM.js

## Security / Runtime Behavior

Some package scanners flag this package for network access and eval-like behavior. Those signals are expected for this runtime shape and should be read in context:

- Outbound DB/cache connections are by design. This package opens runtime connections to MySQL, PostgreSQL, MongoDB, SQLite, and Memcached when those drivers are configured.
- Network destinations and ports are configuration-driven. Database/cache hosts, ports, URIs, and credentials come from your environment variables and connection config, for example `DB_HOST`, `DB_PORT`, `PG_HOST`, `PG_PORT`, `MONGO_URI`, `MONGO_TEST_URI`, `MEMCACHED_HOST`, and `MEMCACHED_PORT`.
- This package does not expose a public network service by itself. If you generate controllers and bind them into an Express or other REST API server, the HTTP port and external exposure are chosen by the consuming application, not by this package.
- REST API protection is also application-owned. Authentication, authorization, middleware, JWT/session handling, reverse-proxy policy, server hardening, firewall rules, and least-privilege access control must be configured by the developer integrating the generated controllers or services.
- Mongo SRV mode may use custom DNS resolvers when configured. If you use a `mongodb+srv://` URI and set `MONGO_DNS_SERVERS`, the runtime may call Node's in-process DNS resolver override for Mongo SRV lookups.
- Eval-like behavior is not part of this package's own runtime source. Scanner warnings usually come from the `mysql2` dependency, which generates row parsers dynamically for performance.
- The well-known `readCodeFor` arbitrary code injection issue affected `mysql2` versions earlier than `3.9.7`. This package currently depends on `mysql2` `^3.15.2`, which is above that fixed line and is not in the vulnerable range.
- I also verified that the `mysql2` project continued shipping security hardening after that fix. The official `3.19.1` release notes mention bounds checks, malformed payload handling, and config-injection hardening, and npm currently lists `3.20.0` as the latest stable release as of March 25, 2026.
- I am intentionally not claiming every third-party summary verbatim. The specific claim I verified directly is: `mysql2 < 3.9.7` was vulnerable, while this package's supported range is above that threshold.

For the current hosted docs and security guidance:

- Official Documentation website: https://alphaconsultings.mintlify.app/
- Security policy: https://github.com/MetalDz/Eloquent-ORM.js/blob/ai_master/SECURITY.md
