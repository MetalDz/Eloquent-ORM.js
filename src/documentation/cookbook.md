# Cookbook

Last updated: 2026-03-17

## Purpose

This page is the copy-paste recipe layer for consumers.
Use it when you want a full working pattern, not just an API explanation.

## Recipe 1: SQL User CRUD API

Use this when you want the fastest route to a standard REST API on SQL.

CLI flow:

```bash
eloquent make:model User --with-migration
eloquent make:service User
eloquent make:controller User
eloquent make:migration --all
eloquent migrate:run --all-migrations
```

Model:

```ts
import { column } from "eloquent-orm.js";
import { SqlModel, type ModelInstance } from "eloquent-orm.js/Model";

type UserAttrs = {
  id?: number;
  name?: string;
  email?: string;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
};

export class User extends SqlModel<UserAttrs> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "sqlite";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
    email: column("string", 255, { unique: true }),
    created_at: column("timestamp"),
    updated_at: column("timestamp"),
  };

  constructor() {
    super("users", process.env.DB_CONNECTION ?? "sqlite");
  }
}

export interface User extends ModelInstance<UserAttrs> {}
```

Service:

```ts
import { User } from "../models/User";

export class UserService {
  async all() {
    return new User().all();
  }

  async find(id: number | string) {
    return new User().find(id);
  }

  async create(data: Record<string, unknown>) {
    return new User().create(data);
  }

  async update(id: number | string, data: Record<string, unknown>) {
    return new User().update(id, data);
  }

  async delete(id: number | string) {
    return new User().delete(id);
  }
}
```

Controller and routes:

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

## Recipe 2: Blog API with Relations

Use this when your consumer wants a realistic relational app quickly.

Fast path:

```bash
eloquent make:scenario blog --test --controllers --services --run --force
```

Key relation pattern:

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

Service query example:

```ts
async feed(limit = 20) {
  return Post.where("published", true)
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();
}
```

## Recipe 3: Mongo Document API

Use this when the consumer is building a document-first service.

CLI flow:

```bash
eloquent make:model GeoLocation --mongo
eloquent make:service GeoLocation
eloquent make:controller GeoLocation
```

Model:

```ts
import { column } from "eloquent-orm.js";
import { MongoModel, type ModelInstance } from "eloquent-orm.js/Model";

type GeoLocationAttrs = {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
};

export class GeoLocation extends MongoModel<GeoLocationAttrs> {
  static tableName = "geolocations";
  static connectionName = "mongo";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
    latitude: column("float"),
    longitude: column("float"),
  };

  constructor() {
    super("geolocations", "mongo");
  }
}

export interface GeoLocation extends ModelInstance<GeoLocationAttrs> {}
```

Keep the service/controller surface the same as SQL. Keep driver-specific logic inside the model choice.

## Recipe 4: Soft Delete Admin Restore Flow

Use this when a consumer needs recoverable deletes for admin tooling.

Generate:

```bash
eloquent make:controller User --soft
eloquent make:service User
```

Model schema:

```ts
deleted_at: column("softDeletes")
```

Service:

```ts
async trashed() {
  const model = new User() as User & { onlyTrashed?: () => Promise<unknown[]> };
  return model.onlyTrashed?.() ?? [];
}

async restore(id: number | string) {
  const model = new User() as User & { restore?: (value: number | string) => Promise<void> };
  if (!model.restore) {
    throw new Error("Restore not supported for this model.");
  }
  await model.restore(id);
}
```

Routes:

```ts
app.get("/admin/users/trashed", async (_req, res) => {
  res.json(await service.trashed());
});

app.patch("/admin/users/:id/restore", controller.restore.bind(controller));
```

## Recipe 5: Cache-First Dashboard Service

Use this when read endpoints are expensive and the consumer wants deterministic invalidation.

```ts
import { CacheManager, setupCache } from "eloquent-orm.js";

setupCache();

export class DashboardService {
  async overview() {
    const key = "dashboard:overview:v1";
    const cached = await CacheManager.get(key);
    if (cached) return cached;

    const payload = {
      users: await User.where("is_active", true).get(),
      posts: await Post.orderBy("created_at", "desc").limit(10).get(),
    };

    await CacheManager.set(key, payload, 60);
    return payload;
  }

  async publishPost(id: number | string) {
    await new Post().update(id, { published: true });
    await CacheManager.delete("dashboard:overview:v1");
  }
}
```

## Recipe 6: Test-Only Application Surface

Use this when the consumer wants isolated app and test artifacts.

```bash
eloquent make:model User --test
eloquent make:service User --test
eloquent make:controller User --test
eloquent make:registry --test
eloquent make:migration --all --test
eloquent migrate:run --test --all-migrations
eloquent db:seed --test --class BlogScenarioSeeder
```

Generated paths:

- `src/test/database/models`
- `src/test/services`
- `src/test/controllers`

## Recipe 7: Mixin-Driven Service Layer

Use this when the consumer wants runtime behavior beyond plain CRUD.

Supported practical mixin scenarios:

- soft delete and restore
- eager loading
- serialization
- casts
- scopes
- lifecycle hooks
- pivot attach/detach/sync
- service-boundary caching

See:

- `src/documentation/mixin-scenarios.md`

## What to Read Next

- `src/documentation/common-scenarios.md`
- `src/documentation/usage-guides-controller.md`
- `src/documentation/usage-guides-services.md`
- `src/documentation/nosql-usage-guide.md`
