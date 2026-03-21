# Usage Guides

Last updated: 2026-03-10

## 1) Runtime Setup
1. Configure environment variables in `.env`.
2. Select default connection with `DB_CONNECTION`.
3. Initialize model registration at app startup:
   - `registerModels([User, Post, ...])`
   - or generate a bootstrap helper with `eloquent make:registry`
4. Keep strict mode enabled by default unless migration path requires lazy behavior.
5. Express.js is a recommended requirement for HTTP-based usage and should run without runtime integration issues.

## 2) Migration Workflow
Generate migrations:
- single model: `eloquent make:migration User`
- all models: `eloquent make:migration --all`

Apply migrations:
- app mode: `eloquent migrate:run --all-migrations`
- test mode: `eloquent migrate:run --test --all-migrations`

Inspect status:
- `eloquent migrate:status`
- `eloquent migrate:status --test`

Rollback:
- `eloquent migrate:rollback --step 1`
- full reset: `eloquent migrate:reset --all-migrations --force --yes` (production guard applies)

## 3) Seeding Workflow
Run seeder:
- `eloquent db:seed --class UserSeeder`
- `eloquent db:seed --test --class BlogScenarioSeeder`

Full rebuild + seed:
- `eloquent db:seed:fresh --class UserSeeder --force --yes`

All connections:
- `eloquent db:seed --all-connections --class UserSeeder`
- optional precheck: `eloquent db:seed:precheck --all-connections`

## 4) Multi-Driver Workflow
Target one connection:
- `--mysql` or `--pg` or `--sqlite`

Target all SQL connections:
- `--all-connections`

For one app using different drivers at the same time:
- keep one fallback `DB_CONNECTION`
- keep one fallback `DB_TEST_CONNECTION`
- pin `static connectionName` on models that must stay on a specific driver

Example:

```ts
class User extends SqlModel<{ id?: number; name?: string }> {
  static connectionName = "mysql";
}

class GeoLocation extends MongoModel<{ id?: number; name?: string }> {
  static connectionName = "mongo";
}
```

Examples:
- `eloquent migrate:run --all-connections --all-migrations`
- `eloquent db:seed --all-connections --class UserSeeder`

Detailed contract:
- `docs/orm/multi-connection-strategy`

## 5) Test Mode Workflow
Use `--test` to isolate test fixtures from app data.

Examples:
- `eloquent make:model User --test`
- `eloquent make:registry --test`
- `eloquent make:migration --all --test`
- `eloquent migrate:run --test --all-migrations`
- `eloquent db:seed --test --class BlogScenarioSeeder`

## 6) Recommended Command Order
1. `make:*` (if needed)
2. `make:migration`
3. `migrate:run` (add `--test` for test mode)
4. `db:seed` / `db:seed:fresh`
5. `migrate:status` verification

Detailed runtime guides:
- `src/documentation/common-scenarios.md`
- `src/documentation/usage-guides-controller.md`
- `src/documentation/usage-guides-services.md`

## 7) Cache Runtime Environment
Use cache at the service boundary, not in controllers.

Production cache env keys:

```env
APP_ENV=production
MEMCACHED_HOST=127.0.0.1
MEMCACHED_PORT=11211
CACHE_DIR=.cache
```

Current runtime behavior:
- `APP_ENV=development`: memory cache
- `APP_ENV=staging`: file cache using `CACHE_DIR`
- `APP_ENV=production`: Memcached, then file cache, then memory cache

## 8) Runtime Querying Patterns

### Important: Runtime Querying Contract
The runtime read API is Laravel-like and should stay aligned with the public CRUD contract.

- static safe-finder helpers such as `User.where(...)`, `User.orderBy(...)`, `User.first()`, and `User.findOneBy(...)`
- static primary-key reads such as `User.find(id)`
- instance collection reads such as `new User().all()`
- eager-loading helpers such as `with(...)` and `load(...)` when explicit relation methods exist

Recommended app-level pattern:
1. use static query helpers for filtered reads
2. use `findOneBy(...)` or `first()` when you want one record or `null`
3. use `get()` when you want hydrated arrays
4. use `with(...)` only when the model exposes explicit relation methods

<details>
<summary><strong>Single-record reads</strong></summary>

```ts
const byId = await User.find(1);
const byEmail = await User.findOneBy("email", "alice@example.com");
const newestUser = await User.orderBy("created_at", "desc").first();
```

</details>

<details>
<summary><strong>Collection reads</strong></summary>

```ts
const allUsers = await new User().all();

const recentActiveUsers = await User.where("is_active", true)
  .orderBy("created_at", "desc")
  .limit(20)
  .get();
```

</details>

<details>
<summary><strong>Filtering, ordering, and limits</strong></summary>

```ts
const admins = await User.where("role", "admin")
  .orderBy("created_at", "asc")
  .limit(10)
  .get();
```

Rules:
- `where(field, value)` filters by declared schema fields
- `orderBy(field, direction)` supports only `asc` or `desc`
- always pass the direction explicitly for predictable output
- `limit(count)` should be used on user-facing list endpoints

</details>

<details>
<summary><strong>Eager loading with <code>with(...)</code> and <code>load(...)</code></strong></summary>

```ts
const users = await User.where("is_active", true)
  .with("posts")
  .get();

const user = await (new User()).with("posts", "profile").find(1);
```

Important rules:
- schema relation metadata alone is not enough
- `with(...)` and `load(...)` require explicit relation methods on the model instance
- use eager loading in services, not controllers

</details>

<details>
<summary><strong>Scope-based query reads</strong></summary>

```ts
const active = await User.active().first();
const inactive = await User.inactive().get();
const published = await Post.published().limit(10).get();
```

</details>

<details>
<summary><strong>Recommended service-layer query pattern</strong></summary>

```ts
export class UserService {
  async findByEmail(email: string) {
    return User.findOneBy("email", email);
  }

  async recentActive(limit = 20) {
    return User.where("is_active", true)
      .orderBy("created_at", "desc")
      .limit(limit)
      .get();
  }

  async detail(id: number | string) {
    return (new User()).with("posts", "profile").find(id);
  }
}
```

</details>

## 9) Runtime CRUD Patterns

### Important: Runtime CRUD Contract
The runtime write API is split into three layers:

- `User.create(data)`
  - create a new row or document
- `User.createMany(rows)`
  - create multiple rows or documents in one explicit bulk call
- loaded instance methods: `update()`, `fill()`, `save()`, `delete()`, `restore()`, and `patch()`
  - update an already loaded model instance
- explicit bulk methods: `User.updateMany(ids, data)`, `User.patchMany(rows)`, `User.deleteMany(ids)`, and `User.restoreMany(ids)`
  - direct bulk writes across explicit primary keys
- explicit low-level by-id methods: `User.updateById(id, data)`, `User.deleteById(id)`, and `User.restoreById(id)`
  - direct writes when you already know the primary key

Recommended app-level pattern:
1. read with query helpers
2. update with `update() + save()` or `patch()` on a loaded instance
3. use `User.updateById(...)`, `User.deleteById(...)`, and `User.restoreById(...)` only when you intentionally want a direct by-id service path
4. use bulk helpers only when the service already owns a concrete list of ids or row payloads

<details>
<summary><strong>Create: insert a new record</strong></summary>

Use `create()` when you want to insert a new model in one call.

```ts
const created = await User.create({
  name: "Alice",
  email: "alice@example.com",
});
```

Bulk create:

```ts
const createdMany = await User.createMany([
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" },
]);
```

</details>

<details>
<summary><strong>Read: load records before mutation</strong></summary>

```ts
const allUsers = await new User().all();
const byId = await User.find(1);
const byEmail = await User.findOneBy("email", "alice@example.com");
```

```ts
const recentActiveUsers = await User.where("is_active", true)
  .orderBy("created_at", "desc")
  .limit(20)
  .get();

const newestUser = await User.orderBy("created_at", "desc").first();
```

</details>

<details>
<summary><strong>Update: preferred loaded-instance flow with <code>update()</code> and <code>save()</code></strong></summary>

```ts
const user = await User.findOneBy("email", "alice@example.com");
if (user) {
  user.update({ name: "Alice Updated" });
  await user.save();
}
```

</details>

<details>
<summary><strong>Patch: partial update on a persisted instance</strong></summary>

```ts
const user = await User.findOneBy("email", "alice@example.com");

if (user) {
  await user.patch({ name: "Alice Patch" });
}
```

Important rules:
- `patch()` is for a persisted instance
- it is not a static method
- it is the right companion to `save()` for partial updates

</details>

<details>
<summary><strong>Bulk create, update, patch, delete, and restore</strong></summary>

Use bulk helpers only when the service already has an explicit target list.

```ts
const createdMany = await User.createMany([
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" },
]);

await User.updateMany([1, 2], { status: "inactive" });

await User.patchMany([
  { id: 1, email: "alice+1@example.com" },
  { id: 2, email: "bob+1@example.com" },
]);

await User.deleteMany([1, 2]);
await User.restoreMany([1, 2]);
```

Rules:
- `createMany(...)` returns hydrated models in input order
- `updateMany(...)`, `deleteMany(...)`, and `restoreMany(...)` require explicit primary-key lists
- `patchMany(...)` requires the primary key on every item

</details>

<details>
<summary><strong>Low-level by-id helpers</strong></summary>

```ts
await User.updateById(1, {
  name: "Alice Updated Directly",
});

await User.deleteById(1);
await User.restoreById(1);
```

</details>

<details>
<summary><strong>Delete and restore</strong></summary>

```ts
const user = await User.find(1);
if (user) {
  await user.delete();
}

const trashed = await User.find(1);
if (trashed) {
  await trashed.restore();
}
```

</details>

<details>
<summary><strong>Recommended service-layer CRUD pattern</strong></summary>

```ts
export class UserService {
  async create(data: Record<string, unknown>) {
    return User.create(data);
  }

  async createMany(rows: Record<string, unknown>[]) {
    return User.createMany(rows);
  }

  async update(id: number | string, data: Record<string, unknown>) {
    const user = await User.find(id);
    if (!user) return null;

    user.update(data);
    await user.save();
    return user;
  }

  async patch(id: number | string, data: Record<string, unknown>) {
    const user = await User.find(id);
    if (!user) return null;

    await user.patch(data);
    return user;
  }

  async delete(id: number | string) {
    return User.deleteById(id);
  }

  async restore(id: number | string) {
    return User.restoreById(id);
  }

  async deactivateMany(ids: Array<number | string>) {
    await User.updateMany(ids, { status: "inactive" });
  }
}
```

</details>

## 10) NoSQL Workflow (Mongo)
Use explicit mongo targeting when running NoSQL paths:
- app mode: `--mongo`
- test mode: `--mongo --test` (targets `mongo_test` when configured)

Key notes:
- `--all-connections` remains SQL-only (`mysql`, `pg`, `sqlite`) by design.
- SQL migration commands on mongo targets are skipped with actionable guidance.
- Preferred mongo verification path:
  - `eloquent db:seed:precheck --mongo [--test]`
  - `eloquent db:seed --mongo [--test] --class <Seeder>`
  - `eloquent demo:scenario [--test]`

## 11) Model Scenarios by Driver

### SQL model example

Implement model relations in `static schema` and choose `SqlModel` (or root `Model` alias) when your data needs migrations and SQL semantics.

```ts
import { column, relation } from "eloquent-orm.js";
import { SqlModel, type ModelInstance } from "eloquent-orm.js/Model";

type PostAttrs = { id?: number; title?: string; user_id?: number };

class User extends SqlModel<{ id?: number; name?: string }> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
    posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
  };
}

class Post extends SqlModel<PostAttrs> {
  static tableName = "posts";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    title: column("string", 255),
    user_id: column("int", undefined, { notNull: true }),
    author: relation("belongsTo", "User", { foreignKey: "user_id" }),
    favorites: relation("belongsToMany", "Post", {
      pivotTable: "post_favorites",
      pivotLocalKey: "user_id",
      pivotForeignKey: "post_id",
    }),
  };
}

export interface User extends ModelInstance<{ id?: number; name?: string }> {}
export interface Post extends ModelInstance<PostAttrs> {}
```

### Mongo model example

Use `MongoModel` for document workflows and explicit mongo targeting:

```ts
import { column, relation } from "eloquent-orm.js";
import { MongoModel, type ModelInstance } from "eloquent-orm.js/Model";

class GeoLocation extends MongoModel<{ id?: number; name?: string }> {
  static tableName = "geolocations";
  static connectionName = "mongo";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
  };
}

class Comment extends MongoModel<{ id?: number; body?: string; commentable_id?: number; commentable_type?: string }> {
  static tableName = "comments";
  static connectionName = "mongo";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    body: column("text"),
    commentable_id: column("int"),
    commentable_type: column("string", 255),
    commentable: relation("morphTo", "Photo", { morphName: "commentable" }),
  };
}
```

For Mongo:

- keep relation definitions explicit,
- use `--mongo [--test]` in commands,
- avoid SQL-only assumptions (especially FK and pivot guarantees).

Detailed matrix and contract:
- `src/documentation/nosql-usage-guide.md`
- `docs/orm/nosql`

