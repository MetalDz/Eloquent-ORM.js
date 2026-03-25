# Mixin Scenarios Guide

Last updated: 2026-03-17

## Purpose

This page explains how consumers should use mixin-backed runtime behavior in real applications.
Focus on service and model patterns, not internal implementation details.

## SoftDeletes Scenario

Use this when deletes should be reversible.

Schema:

```ts
deleted_at: column("softDeletes")
```

or:

```ts
softDeletes: mixin("SoftDeletes")
```

Do not define both.

Service methods:

```ts
async trashed() {
  const model = new User() as User & { onlyTrashed?: () => Promise<unknown[]> };
  return model.onlyTrashed?.() ?? [];
}

async restore(id: number | string) {
  const model = new User() as User & { restore?: (value: number | string) => Promise<void> };
  if (!model.restore) throw new Error("Restore not supported for this model.");
  await model.restore(id);
}

async forceDelete(id: number | string) {
  const model = new User() as User & { forceDelete?: (value: number | string) => Promise<void> };
  if (!model.forceDelete) throw new Error("Force delete not supported for this model.");
  await model.forceDelete(id);
}
```

## EagerLoading Scenario

Use this when a controller response needs related records in one service call.

Important runtime rule:

- eager loading requires explicit relation methods on the model instance
- schema relation metadata alone does not make `load()` or `with()` available

Example model pattern:

```ts
export class User extends SqlModel<UserAttrs> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "sqlite";

  posts() {
    return this.hasMany(Post as any, "user_id");
  }
}
```

```ts
async findWithPosts(id: number | string) {
  const user = await new User().find(id);
  if (!user) return null;

  const eager = user as User & { load?: (...relations: string[]) => Promise<User> };
  await eager.load?.("posts", "comments");
  return user;
}
```

## Serialize Scenario

Use this when API responses should hide internal fields or expose appended values.

```ts
const user = await new User().find(id);
if (!user) return null;

const serializable = user as User & { toObject?: () => Record<string, unknown> };
return typeof serializable.toObject === "function" ? serializable.toObject() : user;
```

Prefer `toObject()` in controllers and services for explicitness. `toJSON()` now returns the same plain-object payload shape for JSON serialization.

## Casts Scenario

Use this when the consumer wants booleans, dates, and JSON payloads normalized after reads.

```ts
export class User extends SqlModel<UserAttrs> {
  protected casts = {
    is_active: "boolean",
    created_at: "date",
    settings: "json",
  } as const;
}
```

Service reads can then treat values as normalized runtime data.

## Scope Scenario

Use this when some records should be filtered from `all()` and `find()` globally.

```ts
User.addGlobalScope("active", (records) =>
  records.filter((record) => record.is_active === true)
);
```

Important limitation:

- current scope behavior is in-memory post-fetch filtering
- do not treat it as SQL query pushdown

## Hooks Scenario

Use this when consumers need audit, side effects, or cache invalidation around writes.

Preferred model path:

```ts
static modelEvents = {
  beforeCreate: async (data: Record<string, unknown>) => {
    console.log("[beforeCreate] User", data);
  },
  afterUpdate: async (payload: Record<string, unknown>) => {
    console.log("[afterUpdate] User", payload);
  },
};
```

Runtime rule:

- register models with `registerModels([...])` before relying on hook flows

## PivotHelper Scenario

Use this when consumers need many-to-many management in services.

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

## Cache Scenario

Use `CacheManager` and `setupCache()` at the service boundary for consumer-facing apps.

```ts
import { CacheManager, setupCache } from "@alpha.consultings/eloquent-orm.js";

setupCache();
```

Then cache expensive reads and invalidate after writes:

```ts
const key = "users:active:v1";
const cached = await CacheManager.get(key);
if (cached) return cached;

const users = await User.where("is_active", true).get();
await CacheManager.set(key, users, 60);
await CacheManager.delete(key);
```

## Recommended Consumer Rule

1. define schema and relation behavior in models
2. use mixin-backed behavior in services
3. keep controllers thin
4. keep cache logic out of controllers
