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

## 7) NoSQL Workflow (Mongo)
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

## 8) Model Scenarios by Driver

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

