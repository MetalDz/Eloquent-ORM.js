# Installation and Quick Start

Last updated: 2026-03-16

## Installation
Install the package from npm:

```bash
npm install eloquent-orm.js express dotenv
npm install -D typescript ts-node @types/express @types/node
```

This package is a TypeScript Eloquent ORM. If your app serves HTTP routes, install Express.js up front because the runtime examples and generated controllers are Express-oriented.

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
```

## Quick `.env` Key List
- `DB_CONNECTION`: active app connection name such as `mysql`, `pg`, `sqlite`, or `mongo`
- `DB_TEST_CONNECTION`: active test connection name such as `mysql_test`, `pg_test`, `sqlite_test`, or `mongo_test`
- `DB_*` and `DB_TEST_*`: MySQL runtime and test credentials
- `PG_*` and `PG_TEST_*`: PostgreSQL runtime and test credentials
- `SQLITE_PATH` and `SQLITE_TEST_PATH`: SQLite file paths
- `MONGO_URI`, `MONGO_DB`, `MONGO_TEST_URI`, and `MONGO_TEST_DB`: Mongo runtime and test targets

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

Example SQL model:

```ts
import { registerModels, column } from "eloquent-orm.js";
import { SqlModel, type ModelInstance } from "eloquent-orm.js/Model";

type UserAttrs = {
  id?: number;
  name?: string;
};

export class User extends SqlModel<UserAttrs> {
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
const user = new User();

user.fill({
  name: "Alice",
  email: "alice@example.com",
});

await user.save();

const stored = await User.findOneBy("email", "alice@example.com");
console.log(stored?.toJSON());
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
