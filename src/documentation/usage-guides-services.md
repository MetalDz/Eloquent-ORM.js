# Service Usage Guide

Last updated: 2026-03-17

## Purpose
Use generated services as the application boundary for CRUD, relation loading, cache policy, soft-delete restore flows, and model mixin usage.

Controllers should delegate to services. Services should delegate to models.

## Generate a Service

```bash
eloquent make:service User
```

Test artifact:

```bash
eloquent make:service User --test
```

Generated output:

- app mode: `src/app/services/UserService.ts`
- test mode: `src/test/services/UserService.ts`

## Generated CRUD Contract

Generated service methods:

- `all()`
- `find(id)`
- `create(data)`
- `update(id, data)`
- `delete(id)`
- `restore(id)`

Generated shape:

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

  async restore(id: number | string) {
    const model = new User() as unknown as { restore?: (value: number | string) => unknown };
    if (typeof model.restore === "function") {
      return model.restore(id);
    }
    throw new Error("Restore not supported for this model.");
  }
}
```

## Extend the Service for Real Runtime Usage

Keep generated CRUD, then add custom read/write methods:

```ts
import { User } from "../models/User";

export class UserService {
  async all() {
    return new User().all();
  }

  async find(id: number | string) {
    return new User().find(id);
  }

  async findByEmail(email: string) {
    return User.findOneBy("email", email);
  }

  async recentActive(limit = 20) {
    return User.where("is_active", true)
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();
  }

  async findWithPosts(id: number | string) {
    const user = await new User().find(id);
    if (!user) return null;
    await (user as { load?: (...relations: string[]) => Promise<unknown> }).load?.("posts");
    return user;
  }
}
```

Eager-loading note:

- `load()` and `with()` require explicit relation methods on the model instance
- schema relation metadata alone is not enough for eager-loading calls

## Mixin-Aware Service Patterns

### SoftDeletesMixin

Use service methods to centralize soft-delete behavior:

```ts
async trashed() {
  const model = new User() as User & {
    onlyTrashed?: () => Promise<unknown[]>;
    withTrashed?: () => Promise<unknown[]>;
  };
  return model.onlyTrashed?.() ?? [];
}

async allIncludingDeleted() {
  const model = new User() as User & { withTrashed?: () => Promise<unknown[]> };
  return model.withTrashed?.() ?? [];
}

async forceDelete(id: number | string) {
  const model = new User() as User & { forceDelete?: (value: number | string) => Promise<void> };
  if (typeof model.forceDelete === "function") {
    await model.forceDelete(id);
    return;
  }
  throw new Error("Force delete not supported for this model.");
}
```

Model schema requirement:

- use `deleted_at: column("softDeletes")`
- or use `mixin("SoftDeletes")`
- do not use both at once

### EagerLoadingMixin

Use eager loading in services, not controllers:

Example model method:

```ts
posts() {
  return this.hasMany(Post as any, "user_id");
}
```

```ts
async showProfile(id: number | string) {
  const user = await new User().find(id);
  if (!user) return null;

  const eager = user as User & { load?: (...relations: string[]) => Promise<User> };
  await eager.load?.("posts", "comments");
  return user;
}
```

### SerializeMixin

If your model hides fields or appends computed values, normalize at the service boundary:

```ts
async publicProfile(id: number | string) {
  const user = await new User().find(id);
  if (!user) return null;

  const serializable = user as User & { toObject?: () => Record<string, unknown> };
  return typeof serializable.toObject === "function" ? serializable.toObject() : user;
}
```

### CastsMixin

Define casts in the model, then consume casted values naturally in services:

```ts
export class User extends SqlModel<UserAttrs> {
  protected casts = {
    is_active: "boolean",
    created_at: "date",
    settings: "json",
  } as const;
}
```

Service code can then treat `find()` and `all()` results as already normalized.

### ScopeMixin

Global scopes affect `all()` and `find()` automatically:

```ts
User.addGlobalScope("active", (records) =>
  records.filter((record) => record.is_active === true)
);
```

Use this with care:

- current scope behavior is applied after fetching records into memory
- do not treat it as SQL query optimization

### HooksMixin

Services do not need to call hooks manually. `create`, `update`, and `delete` already trigger lifecycle hooks and `static modelEvents`.

Use services to keep write paths consistent so hooks fire through one path.

### PivotHelperMixin

Many-to-many attach/detach/sync helpers are useful in services:

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

  if (typeof user.sync !== "function") {
    throw new Error("Pivot sync not supported for this model.");
  }

  await user.sync("post_user_pivot", "user_id", "post_id", userId, postIds);
}
```

Use this in services, not controllers, so pivot-table policy stays centralized.

### Query Cache

For consumer-facing code, prefer `CacheManager` in the service layer:

```ts
import { CacheManager, setupCache } from "eloquent-orm.js";
import { User } from "../models/User";

setupCache();

export class UserService {
  async activeList() {
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

  async create(data: Record<string, unknown>) {
    const created = await new User().create(data);
    await CacheManager.delete("users:active:v1");
    return created;
  }
}
```

This keeps cache reads and invalidation close to business logic.

## SQL and Mongo Notes

- Service method signatures stay the same for SQL and Mongo models.
- Keep ids typed as `number | string`.
- SQL-specific concerns like pivot-table structure belong in SQL services.
- Mongo-specific concerns like document references and polymorphic ids should stay in Mongo services.

## Recommended Pattern

1. Generate the service.
2. Keep base CRUD methods unchanged.
3. Add relation loading, cache reads, and soft-delete helpers in the service.
4. Keep controller code thin and HTTP-only.
