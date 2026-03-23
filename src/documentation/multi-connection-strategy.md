# Multi-Connection Strategy

Last updated: 2026-03-18

## Core rule
This ORM supports multiple named connections in one app, but it does not support multiple values inside `DB_CONNECTION`.

Correct:

```env
DB_CONNECTION=sqlite
DB_TEST_CONNECTION=sqlite_test
```

Incorrect:

```env
DB_CONNECTION=mysql,pg
```

Incorrect for the current resolver contract:

```env
DB_MYSQL_CONNECTION=mysql
DB_SQLITE_CONNECTION=sqlite
DB_PG_CONNECTION=pg
DB_MONGO_CONNECTION=mongo
```

Those keys are not part of the current package env contract and are ignored unless the codebase is extended to read them.

## Supported runtime pattern
- one active default app selector: `DB_CONNECTION`
- one active default test selector: `DB_TEST_CONNECTION`
- all driver credential blocks may live in the same `.env`
- models can pin `static connectionName`
- SQL and Mongo connections can be active in one process at the same time

## Recommended `.env` layout

```env
DB_CONNECTION=sqlite
DB_TEST_CONNECTION=sqlite_test

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

## Mixed-driver runtime example

```ts
import { column, registerModels } from "@alpha.consultings/eloquent-orm.js";
import { SqlModel, MongoModel, type ModelInstance } from "@alpha.consultings/eloquent-orm.js/Model";

type UserAttrs = { id?: number; name?: string };
type GeoAttrs = { id?: number; name?: string };

export class User extends SqlModel<UserAttrs> {
  static tableName = "users";
  static connectionName = "mysql";
  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
  };

  constructor() {
    super("users", "mysql");
  }
}

export class GeoLocation extends MongoModel<GeoAttrs> {
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

export interface User extends ModelInstance<UserAttrs> {}
export interface GeoLocation extends ModelInstance<GeoAttrs> {}

registerModels([User, GeoLocation]);
```

In that setup:
- `User` always resolves to `mysql`
- `GeoLocation` always resolves to `mongo`
- `DB_CONNECTION` remains the fallback for models that do not pin `connectionName`

## CLI behavior
- `--all-connections` is SQL-only by design
- Mongo must be targeted explicitly with `--mongo`
- test flows use `DB_TEST_CONNECTION` unless a model or command target overrides it

Examples:
- `eloquent migrate:run --all-connections --all-migrations`
- `eloquent db:seed --all-connections --class UserSeeder`
- `eloquent db:seed --mongo --class GeoLocationSeeder`
- `eloquent db:seed --mongo --test --class GeoLocationSeeder`

## Stable design recommendation
1. Keep one default app selector.
2. Keep one default test selector.
3. Keep all driver credentials in `.env`.
4. Use explicit per-model `connectionName` only when mixed-driver runtime is needed.

## Related docs
- [Installation and Quick Start](./installation-and-quickstart.md)
- [Usage Guides](./usage-guides.md)
- [NoSQL (Mongo) Usage Guide](./nosql-usage-guide.md)
