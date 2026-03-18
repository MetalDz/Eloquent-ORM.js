# Controller Usage Guide

Last updated: 2026-03-17

## Purpose
Use generated controllers as thin HTTP adapters. Keep validation, persistence, relation loading, cache invalidation, and soft-delete policy in the model/service layer.

Express.js is the supported HTTP runtime for these controller examples.

## Generate a Controller

Standard controller:

```bash
eloquent make:controller User
```

Soft-delete aware controller:

```bash
eloquent make:controller User --soft
```

Test artifact:

```bash
eloquent make:controller User --test
```

Generated output:

- app mode: `src/app/controllers/UserController.ts`
- test mode: `src/test/controllers/UserController.ts`

## Generated CRUD Contract

The generated controller delegates to the paired service:

- `index()` -> list all records
- `show()` -> find one by `req.params.id`
- `store()` -> create from `req.body`
- `update()` -> update by `req.params.id`
- `destroy()` -> delete by `req.params.id`
- `restore()` -> restore soft-deleted record when generated with `--soft`

## Express Route Wiring

Bind controller methods so `this.service` stays intact:

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
app.patch("/users/:id/restore", controller.restore.bind(controller));
```

Only add the restore route when the controller was generated with `--soft`.

## CRUD Example

Typical generated behavior:

```ts
// GET /users
async index(req: Request, res: Response): Promise<void> {
  const data = await this.service.all();
  res.json(data);
}

// POST /users
async store(req: Request, res: Response): Promise<void> {
  const created = await this.service.create(req.body as Record<string, unknown>);
  res.status(201).json(created);
}

// DELETE /users/:id
async destroy(req: Request, res: Response): Promise<void> {
  await this.service.delete(req.params.id);
  res.json({ message: "User deleted successfully" });
}
```

## Mixin-Aware Controller Behavior

Controllers do not apply mixins directly. Mixins live in the model runtime stack and affect what service/model calls do.

### SoftDeletes

If the model supports soft deletes, `destroy()` should remain a soft delete and `restore()` should be exposed from the controller.

Model schema pattern:

```ts
import { SqlModel, column } from "eloquent-orm.js";

export class User extends SqlModel<{ id?: number; deleted_at?: string | null }> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "sqlite";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    deleted_at: column("softDeletes"),
  };
}
```

Alternative declaration for migration generation:

```ts
softDeletes: mixin("SoftDeletes")
```

Do not declare both `column("softDeletes")` and `mixin("SoftDeletes")` in the same schema, or you will duplicate `deleted_at`.

### SerializeMixin

If you use hidden fields or appended computed fields on the model, prefer `toObject()` before sending a response:

```ts
const item = await this.service.find(req.params.id);
if (!item) {
  res.status(404).json({ message: "User not found" });
  return;
}

res.json(typeof (item as { toObject?: () => unknown }).toObject === "function"
  ? (item as { toObject: () => unknown }).toObject()
  : item);
```

Prefer `toObject()` over `toJSON()` in Express controllers because `toJSON()` returns a JSON string.

### EagerLoading

Keep relation loading in the service, then return the hydrated record from the controller:

```ts
const item = await this.service.findWithPosts(req.params.id);
res.json(item);
```

### Scope

If the model uses global scopes, controller methods that call `service.all()` or `service.find()` automatically receive scope-filtered results.

Scope note:

- current scope behavior is in-memory post-fetch filtering, not SQL query rewriting.

### Query Cache

Do not put cache logic in the controller by default. Keep caching in services so reads and invalidation rules stay centralized.

## SQL and Mongo Notes

- The controller surface is the same for `SqlModel` and `MongoModel`.
- Generated services already accept `id: number | string`, which fits SQL ids and Mongo-oriented ids.
- Driver-specific behavior should stay inside the model/service layer, not in route handlers.

## Recommended Pattern

1. Keep controllers thin.
2. Put CRUD and custom queries in services.
3. Put relation definitions, casts, scopes, hooks, and soft-delete behavior in models.
4. Keep cache reads/invalidation in services.
