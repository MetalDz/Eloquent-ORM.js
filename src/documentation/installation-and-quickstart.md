# Installation and Quick Start

Last updated: 2026-03-14

## Installation
Install the package from npm:

```bash
npm install eloquentjs
```

If you use TypeScript in your app, keep your project TypeScript toolchain available and ensure your build/runtime setup can load your model files.

## Minimal Environment Setup
Add the runtime values your app needs in `.env`.

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
MONGO_URI=mongodb://127.0.0.1:27017/eloquent_app
MONGO_DB_NAME=eloquent_app
DB_TEST_CONNECTION=mongo_test
MONGO_TEST_URI=mongodb://127.0.0.1:27017/eloquent_app_test
MONGO_TEST_DB_NAME=eloquent_app_test
```

## Quick Start
1. Create a model:

```bash
eloquent make:model User --with-migration
```

2. Register your models at app startup:

```ts
import { registerModels } from "eloquentjs";
import { User } from "./app/models/User";

registerModels([User]);
```

### Laravel-Style SQL Model Import

For SQL-backed models, you can use the Laravel-style `Model` alias instead of `SqlModel`:

```ts
import { Model, column, registerModels, type ModelInstance } from "eloquentjs";

type UserAttrs = {
  id?: number;
  name?: string;
};

export class User extends Model<UserAttrs> {
  static tableName = "users";
  static connectionName = process.env.DB_CONNECTION ?? "mysql";

  static schema = {
    id: column("increments", undefined, { primary: true }),
    name: column("string", 255),
  };

  constructor() {
    super("users", process.env.DB_CONNECTION ?? "mysql");
  }
}

export interface User extends ModelInstance<UserAttrs> {}

registerModels([User]);
```

If you prefer a class-style import, the package also exposes:

```ts
import { SqlModel, MongoModel, type ModelInstance } from "eloquentjs/Model";
```

Use `SqlModel` from that subpath for SQL-backed models and `MongoModel` for Mongo-backed models.

3. Run migrations:

```bash
eloquent migrate:run --all-migrations
```

4. Seed or inspect:

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
