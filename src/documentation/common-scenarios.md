# Common Scenarios Guide

Last updated: 2026-03-17

## Purpose

This page is the practical entry point for consumers.
Use it when you want a direct answer to "how do I build X with this ORM?" without reading every API page first.

## How to Use This Page

Pick the scenario closest to your app goal:

1. run the listed CLI commands
2. copy the runtime pattern
3. follow the linked detailed guide only if you need deeper behavior

## Scenario 1: Build a First SQL CRUD API

Use this when you want a standard Express + SQL model/service/controller flow.

Generate artifacts:

```bash
eloquent make:model User --with-migration
eloquent make:service User
eloquent make:controller User
eloquent make:migration --all
eloquent migrate:run --all-migrations
```

Register the model at app startup:

```ts
import { registerModels } from "eloquent-orm.js";
import { User } from "./app/models/User";

registerModels([User]);
```

Wire the controller in Express:

```ts
import express from "express";
import { UserController } from "./app/controllers/UserController";

const app = express();
app.use(express.json());

const controller = new UserController();
app.get("/users", controller.index.bind(controller));
app.get("/users/:id", controller.show.bind(controller));
app.post("/users", controller.store.bind(controller));
app.put("/users/:id", controller.update.bind(controller));
app.delete("/users/:id", controller.destroy.bind(controller));
```

Use next:

- `src/documentation/usage-guides-controller.md`
- `src/documentation/usage-guides-services.md`

## Scenario 2: Build a Mongo Document App

Use this when your app is Mongo-first and should avoid SQL-only assumptions.

Generate a Mongo model:

```bash
eloquent make:model GeoLocation --mongo
eloquent make:service GeoLocation
eloquent make:controller GeoLocation
```

Mongo environment example:

```env
DB_CONNECTION=mongo
MONGO_URI=mongodb://127.0.0.1:27017/eloquent_app
MONGO_DB_NAME=eloquent_app
```

Model base:

```ts
import { MongoModel, column } from "eloquent-orm.js";

export class GeoLocation extends MongoModel<{ id?: number; name?: string }> {
  static tableName = "geolocations";
  static connectionName = "mongo";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
  };

  constructor() {
    super("geolocations", "mongo");
  }
}
```

Use next:

- `src/documentation/nosql-usage-guide.md`

## Scenario 3: Build a Blog with Relations

Use this when you need `User`, `Post`, `Comment`, favorites, and morph relations.

Fastest path:

```bash
eloquent make:scenario blog --test --controllers --services --run --force
```

What this gives you:

- model generation
- factory generation
- controllers and services
- migrations
- seed scenario
- relation-ready blog data

Typical SQL relation shape:

```ts
posts: relation("hasMany", "Post", { foreignKey: "user_id" })
author: relation("belongsTo", "User", { foreignKey: "user_id" })
favorites: relation("belongsToMany", "Post", {
  pivotTable: "post_user_pivot",
  pivotLocalKey: "user_id",
  pivotForeignKey: "post_id",
})
comments: relation("morphMany", "Comment", { morphName: "commentable" })
commentable: relation("morphTo", "Commentable", { morphName: "commentable" })
```

Use next:

- `src/documentation/usage-guides.md`
- `docs/orm/relations`

## Scenario 4: Add Soft Delete and Restore

Use this when records should be recoverable.

Generate a controller with restore support:

```bash
eloquent make:controller User --soft
```

Model schema:

```ts
deleted_at: column("softDeletes")
```

or:

```ts
softDeletes: mixin("SoftDeletes")
```

Do not declare both at once.

Service examples:

```ts
await service.delete(id);
await service.restore(id);
await service.forceDelete?.(id);
```

Controller restore route:

```ts
app.patch("/users/:id/restore", controller.restore.bind(controller));
```

Use next:

- `src/documentation/usage-guides-controller.md`
- `src/documentation/usage-guides-services.md`

## Scenario 5: Cache Heavy Read Endpoints

Use this when you have expensive GET endpoints or dashboard queries.

Runtime setup:

```ts
import { CacheManager, setupCache } from "eloquent-orm.js";

setupCache();
```

Service pattern:

```ts
async activeUsers() {
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

async createUser(data: Record<string, unknown>) {
  const created = await new User().create(data);
  await CacheManager.delete("users:active:v1");
  return created;
}
```

CLI support:

```bash
eloquent cache:stats
eloquent cache:clear
```

## Scenario 6: Keep Test Data Isolated

Use this when you want app and test data fully separated.

Generate test-only artifacts:

```bash
eloquent make:model User --test
eloquent make:service User --test
eloquent make:controller User --test
eloquent make:registry --test
eloquent make:migration --all --test
eloquent migrate:run --test --all-migrations
eloquent db:seed --test --class BlogScenarioSeeder
```

Test artifacts land under:

- `src/test/database/models`
- `src/test/services`
- `src/test/controllers`

## Scenario 7: Manage Many-to-Many Favorites or Tags

Use this when you need attach/detach/sync behavior on a pivot collection or pivot table.

Service pattern:

```ts
async syncFavoritePosts(userId: number | string, postIds: Array<number | string>) {
  const user = new User() as User & {
    sync?: (
      pivotTable: string,
      foreignKey: string,
      relatedKey: string,
      id: number | string,
      relatedIds: Array<number | string>
    ) => Promise<void>;
  };

  if (!user.sync) {
    throw new Error("Pivot sync not supported for this model.");
  }

  await user.sync("post_user_pivot", "user_id", "post_id", userId, postIds);
}
```

Use next:

- `src/documentation/usage-guides-services.md`

## Scenario 8: Use Global Scopes, Casts, and Serialization

Use this when you want cleaner service/controller output.

Casts:

```ts
protected casts = {
  is_active: "boolean",
  created_at: "date",
  settings: "json",
} as const;
```

Scope:

```ts
User.addGlobalScope("active", (records) =>
  records.filter((record) => record.is_active === true)
);
```

Serialization:

```ts
const user = await new User().find(id);
return user?.toObject?.() ?? user;
```

Use next:

- `src/documentation/usage-guides-services.md`

## Scenario 9: Run Production-Safe Migrations

Use this when you need operational discipline before release.

Recommended order:

1. `eloquent migrate:status`
2. `eloquent db:seed:precheck --all-connections`
3. `eloquent migrate:run --all-migrations`
4. destructive flows only with explicit `--force --yes`

Also keep least-privilege roles in place:

- `ELOQUENT_DB_ROLE=runtime`
- `ELOQUENT_DB_ROLE=migration`

Use next:

- `src/documentation/cli-production-safety.md`
- `src/documentation/db-least-privilege-env-contract.md`
- `src/documentation/migration-rollback-recovery-runbook.md`

## If You Are Not Sure Where to Start

Use this order:

1. start with SQL CRUD API
2. add services and controllers
3. add relations
4. add soft deletes if you need recovery
5. add caching after endpoints are stable
6. add Mongo only if your domain is document-first
