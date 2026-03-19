# Installation and Quick Start

Last updated: 2026-03-16

## Installation
Install the package from npm:

```bash
npm install eloquent-orm.js express dotenv
npm install -D typescript ts-node @types/express @types/node
```

This package is a TypeScript Eloquent ORM. If your app serves HTTP routes, install Express.js up front because the runtime examples and generated controllers are Express-oriented.

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

## Full `.env` Setup
Use one active value in `DB_CONNECTION` and one active value in `DB_TEST_CONNECTION`. Do not place multiple connection names inside one variable.

```env
# Active runtime selectors
DB_CONNECTION=sqlite
DB_TEST_CONNECTION=sqlite_test
ELOQUENT_DB_ROLE=runtime

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=eloquent_app
DB_TEST_HOST=127.0.0.1
DB_TEST_PORT=3306
DB_TEST_USER=root
DB_TEST_PASSWORD=
DB_TEST_NAME=eloquent_app_test

# PostgreSQL
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_NAME=eloquent_app_pg
PG_TEST_HOST=127.0.0.1
PG_TEST_PORT=5432
PG_TEST_USER=postgres
PG_TEST_PASSWORD=postgres
PG_TEST_NAME=eloquent_app_pg_test

# SQLite
SQLITE_PATH=./storage/app.sqlite
SQLITE_TEST_PATH=./storage/app.test.sqlite

# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB=eloquent_app
MONGO_TEST_URI=mongodb://127.0.0.1:27017
MONGO_TEST_DB=eloquent_app_test

# Cache / Memcached
MEMCACHED_HOST=127.0.0.1
MEMCACHED_PORT=11211
CACHE_DIR=.cache
```

## Quick `.env` Key List
- `DB_CONNECTION`: active app connection name such as `mysql`, `pg`, `sqlite`, or `mongo`
- `DB_TEST_CONNECTION`: active test connection name such as `mysql_test`, `pg_test`, `sqlite_test`, or `mongo_test`
- `ELOQUENT_DB_ROLE`: use `runtime` for the app process and `migration` only for migration or reset jobs
- `APP_ENV`: use `development` for local work and `production` only for real production processes
- `DB_*` and `DB_TEST_*`: MySQL runtime and test credentials
- `PG_*` and `PG_TEST_*`: PostgreSQL runtime and test credentials
- `SQLITE_PATH` and `SQLITE_TEST_PATH`: SQLite file paths
- `MONGO_URI`, `MONGO_DB`, `MONGO_TEST_URI`, and `MONGO_TEST_DB`: Mongo runtime and test targets
- `MEMCACHED_HOST` and `MEMCACHED_PORT`: Memcached endpoint for production cache mode
- `CACHE_DIR`: file-cache fallback directory used in staging and in the production fallback chain

## `.env` Constant Reference

### Connection Selectors
- `DB_CONNECTION`: default application connection. Use one value such as `mysql`, `pg`, `sqlite`, or `mongo`.
- `DB_TEST_CONNECTION`: default isolated test connection. Use one value such as `mysql_test`, `pg_test`, `sqlite_test`, or `mongo_test`.
- `ELOQUENT_DB_ROLE`: credential role selector. Use `runtime` for normal app traffic and `migration` for migration or reset jobs.
- `APP_ENV`: deployment mode. Use `development` for local work and `production` only for real production processes.

### MySQL Constants
- `DB_HOST`: MySQL host or IP for runtime traffic.
- `DB_PORT`: MySQL port for runtime traffic. Usually `3306`.
- `DB_USER`: MySQL username for runtime traffic.
- `DB_PASSWORD`: MySQL password for runtime traffic.
- `DB_NAME`: MySQL database name for runtime traffic.
- `DB_TEST_HOST`: MySQL host or IP for isolated test traffic.
- `DB_TEST_PORT`: MySQL port for isolated test traffic.
- `DB_TEST_USER`: MySQL username for isolated test traffic.
- `DB_TEST_PASSWORD`: MySQL password for isolated test traffic.
- `DB_TEST_NAME`: MySQL database name for isolated test traffic.

### PostgreSQL Constants
- `PG_HOST`: PostgreSQL host or IP for runtime traffic.
- `PG_PORT`: PostgreSQL port for runtime traffic. Usually `5432`.
- `PG_USER`: PostgreSQL username for runtime traffic.
- `PG_PASSWORD`: PostgreSQL password for runtime traffic.
- `PG_NAME`: PostgreSQL database name for runtime traffic.
- `PG_TEST_HOST`: PostgreSQL host or IP for isolated test traffic.
- `PG_TEST_PORT`: PostgreSQL port for isolated test traffic.
- `PG_TEST_USER`: PostgreSQL username for isolated test traffic.
- `PG_TEST_PASSWORD`: PostgreSQL password for isolated test traffic.
- `PG_TEST_NAME`: PostgreSQL database name for isolated test traffic.

### SQLite Constants
- `SQLITE_PATH`: file path for the runtime SQLite database.
- `SQLITE_TEST_PATH`: file path for the isolated test SQLite database.

### MongoDB Constants
- `MONGO_URI`: MongoDB connection string for the runtime database.
- `MONGO_DB`: runtime MongoDB database name.
- `MONGO_TEST_URI`: MongoDB connection string for the isolated test database.
- `MONGO_TEST_DB`: isolated test MongoDB database name.

### Cache Constants
- `MEMCACHED_HOST`: Memcached host or IP used in production cache mode.
- `MEMCACHED_PORT`: Memcached port used in production cache mode. Usually `11211`.
- `CACHE_DIR`: file-cache directory used in staging and as a fallback in production.

## Runtime role and environment mode
Use these two variables together:

- `ELOQUENT_DB_ROLE=runtime`
  - normal app runtime
  - Express requests
  - controllers, services, and standard CRUD traffic
- `ELOQUENT_DB_ROLE=migration`
  - migration commands
  - reset or fresh flows
  - controlled schema-change jobs
- `APP_ENV=development`
  - your local machine
  - normal development and testing
- `APP_ENV=production`
  - real production deploys
  - production migration jobs

Recommended combinations:

```env
# Local app runtime
APP_ENV=development
ELOQUENT_DB_ROLE=runtime

# Local migration command
APP_ENV=development
ELOQUENT_DB_ROLE=migration

# Production app runtime
APP_ENV=production
ELOQUENT_DB_ROLE=runtime

# Production migration job
APP_ENV=production
ELOQUENT_DB_ROLE=migration
```

## Cache Environment Keys
When `APP_ENV=production`, cache setup uses this fallback chain:

1. Memcached
2. file cache
3. memory cache

Use these env keys:

```env
MEMCACHED_HOST=127.0.0.1
MEMCACHED_PORT=11211
CACHE_DIR=.cache
```

Defaults:
- `MEMCACHED_HOST` defaults to `127.0.0.1`
- `MEMCACHED_PORT` defaults to `11211`
- `CACHE_DIR` defaults to `.cache`

Example SQL-first setup:

```env
DB_CONNECTION=sqlite
SQLITE_PATH=./database.sqlite
DB_TEST_CONNECTION=sqlite_test
SQLITE_TEST_PATH=./database.test.sqlite
```

Example Mongo setup:

```env
DB_CONNECTION=mongo
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB=eloquent_app
DB_TEST_CONNECTION=mongo_test
MONGO_TEST_URI=mongodb://127.0.0.1:27017
MONGO_TEST_DB=eloquent_app_test
```

## Quick Start
1. Install the package and Express.js:

```bash
npm install eloquent-orm.js express dotenv
```

2. Add the `.env` keys for your selected driver. SQLite minimum:

```env
DB_CONNECTION=sqlite
DB_TEST_CONNECTION=sqlite_test
SQLITE_PATH=./storage/app.sqlite
SQLITE_TEST_PATH=./storage/app.test.sqlite
```

3. Create a model:

```bash
eloquent make:model User --with-migration
```

Express.js is the recommended HTTP layer for runtime route usage. The ORM works with Express.js without known runtime integration issues.

4. Register your models at app startup:

```ts
import { registerModels } from "eloquent-orm.js";
import { User } from "./app/models/User";

registerModels([User]);
```

### Explicit SQL and Mongo model imports

For runtime model classes, use explicit named exports:

```ts
import { registerModels, column } from "eloquent-orm.js";
import { SqlModel, MongoModel, type ModelInstance } from "eloquent-orm.js/Model";
```

### Laravel-Style SQL Model Import

If you want a Laravel-style SQL-first import path, use the root `Model` alias:

```ts
import { Model, column, registerModels, type ModelInstance } from "eloquent-orm.js";
```

Use `Model` as the SQL model base class when you want the shorter root import surface, and use `eloquent-orm.js/Model` when you need explicit `SqlModel` and `MongoModel` separation.

Example SQL model:

```ts
import { Model, column, registerModels, type ModelInstance } from "eloquent-orm.js";

type UserAttrs = {
  id?: number;
  name?: string;
};

export class User extends Model<UserAttrs> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "sqlite";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
  };

  constructor() {
    super("users", process.env.DB_CONNECTION ?? "sqlite");
  }
}

export interface User extends ModelInstance<UserAttrs> {}

registerModels([User]);
```

Use `SqlModel` for SQL-backed models and `MongoModel` for Mongo-backed models.

### Driver-aware relation model examples

Build relations in `static schema` and keep connection-specific behavior explicit.

```ts
import { column, relation } from "eloquent-orm.js";
import { SqlModel } from "eloquent-orm.js/Model";

class User extends SqlModel<{ id?: number; name?: string }> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "sqlite";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
    posts: relation("hasMany", "Post", { foreignKey: "user_id" }),
  };
}
```

- SQL drivers: prefer migration-backed constraints and explicit pivot tables (`belongsToMany`).
- Mongo drivers: keep references document-first; avoid SQL-only FK/pivot guarantees.

Cross-check:
- `docs/api/models` for complete model examples,
- `docs/orm/relations` for the relation contract by scenario,
- `src/documentation/nosql-usage-guide.md` for NoSQL commands and constraints.

5. Run migrations:

```bash
eloquent migrate:run --all-migrations
```

6. Seed or inspect:

```bash
eloquent db:seed --class UserSeeder
eloquent demo:scenario --random
```

## First Runtime Example

```ts
const created = await User.create({
  name: "Alice",
  email: "alice@example.com",
});

const found = await User.find(created.id as number);
if (found) {
  found.update({ name: "Alice Updated" });
  await found.save();
}

await User.deleteById(created.id as number);
```

## Where to Go Next
- First runnable walkthrough:
  - [Quick Start](./quick-start.md)
- Runtime, migrations, seeding, multi-driver, and test workflows:
  - [Usage Guides](./usage-guides.md)
- Public package/runtime surface:
  - [API Reference](./api-reference.md)
- Mongo-specific workflow:
  - [NoSQL (Mongo) Usage Guide](./nosql-usage-guide.md)
- Upgrade path:
  - [Upgrade and Migration Guide](./upgrade-guide.md)
- Support expectations:
  - [Support Policy](./support-policy.md)
