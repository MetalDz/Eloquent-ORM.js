# 🌟 EloquentJS ORM

A **Laravel-inspired ORM** built for **Node.js + TypeScript** — combining the beauty of Eloquent with the flexibility of modern JavaScript.

---

## 🏗️ Project Structure

src/
│
├── config/
│ └── database.ts # Loads env vars & exports DatabaseConfig
│
├── core/
│ ├── connection/
│ │ ├── DatabaseConnection.ts # Handles all DB drivers (MySQL, PG, SQLite, Mongo)
│ │ ├── ConnectionFactory.ts # Creates, caches & closes connections
│ │ └── BaseModel.ts # ORM foundation (CRUD, query helpers)
│ │
│ └── orm/
│ ├── Relation.ts # Base relation class
│ ├── HasOne.ts / HasMany.ts # Example relation classes
│ └── ... more relations
│
├── database/
│ ├── migrations/ # Database schema definitions
│ ├── seeders/ # Seeders using factories
│ └── factories/ # Fake data generators
│
├── models/ # Application-level models
│
└── testConnection.ts # Verifies DB connectivity


🔌 Connection Flow
Layer	            File	                Responsibility
DatabaseConnection	DatabaseConnection.ts	Creates connections for MySQL, PostgreSQL, SQLite, MongoDB
ConnectionFactory	ConnectionFactory.ts	Caches and returns existing connections
BaseModel	        BaseModel.ts	        Provides ORM interface (CRUD, query) using the active connection
Relation	        Relation.ts	            Abstract base for relationships (HasOne, BelongsTo, etc.)

🧩 Supported Drivers
Driver	        Library	                Type	        Notes
MySQL	        mysql2/promise	        SQL	            Full support
PostgreSQL	    pg	                    SQL	            Full support
SQLite	        sqlite3	                SQL	            Local + test DBs
MongoDB	        mongodb	                NoSQL	        Document-based ORM support


🧮 Migrations & Seeding
Example Migration

import { getConnection } from "@/core/connection/ConnectionFactory";

export async function up() {
  const db = await getConnection("sqlite");
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );
  `);
}

Example Seeder


import { faker } from "@faker-js/faker";
import { getConnection } from "@/core/connection/ConnectionFactory";

export async function run() {
  const db = await getConnection("sqlite");
  for (let i = 0; i < 10; i++) {
    await db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
      faker.person.fullName(),
      faker.internet.email(),
    ]);
  }
}


🧠 Architecture Principles

Principl                    Description

Driver-Agnostic	            ORM works for both SQL and NoSQL connections.
Separation of Concerns	    Connection handling ≠ ORM logic.
Lazy Initialization	        Connections created only when required.
DRY	                        No driver redeclaration in models.
Extensible	                Easily add new drivers or relations.
Type-Safe	                Fully typed with interfaces and discriminated unions.

🧭 Roadmap
Step	    Feature	Description
✅	       Multi-driver core	MySQL, PG, SQLite, Mongo
🚧	        Relations	HasOne, HasMany, BelongsTo, MorphOne, etc.
🚧	        Query Builder	Fluent chaining (where, orderBy, join)
🚧	        CLI Tool	eloquent migrate, eloquent seed commands
🚧	        Transactions	Commit/rollback for SQL drivers
🚧	        Eager Loading	with() for related models
🚧	        Publish to npm	npm install eloquentjs

✅ Phase 1 — Core Model Architecture

Implemented BaseModel with:

CRUD operations (create, update, delete, find, where)

Connection support (PostgreSQL, MySQL, MongoDB)

Query Builder structure

Added Mixins for:

SoftDeletesMixin

TimestampMixin

JSON casting & attribute hooks

✅ Phase 2 — Relations & Eager Loading

Added support for:

hasOne, hasMany, belongsTo, belongsToMany

EagerLoadingMixin for .with() method

Lazy loading fallback

Query builder optimized for relational joins.

✅ Phase 3 — Migration & Schema Management

Built migration CLI system:

eloquent make:migration

eloquent migrate / eloquent rollback

Schema builder with chainable methods:

table.increments('id').primary()
table.string('name').notNullable()
table.timestamps()


Added compound primary key support

Fixed type comparison issue with "increments"

-------------
🧠 Migration Management Rules

Only 1 migration file per model (either create_... or update_...).

Each new update:

Deletes the old migration file.

Generates a new update_ file with a fresh timestamp.

down() does not auto-reverse — because migrations are regenerated from the model itself.

Includes clear philosophical comment explaining this in every generated file.

🧩 Smart Features

✅ Auto column order (e.g., created_at, updated_at always at the end).
✅ Detects and drops missing columns.
✅ Detects and adds new columns.
✅ Cleans outdated migrations automatically.
✅ Supports MySQL / PostgreSQL / SQLite.
✅ Closes DB connections automatically after execution.
 
🧑‍💻 Authors
Created with ❤️ by ALPHA Consultings who love Laravel, Node.js, and TypeScript.
## Model Registration and Hook Access

Register your models once at startup:

```ts
import { registerModels } from "eloquentjs";
import { User } from "./app/models/User";
import { Post } from "./app/models/Post";

registerModels([User, Post]); // strict mode is enabled by default

// Optional: allow lazy auto-registration on first model usage
registerModels([User, Post], { strict: false });
```

Lifecycle hook access is now gated:
- In strict mode, hook registration is denied for unregistered models.
- In strict mode, unregistered models are blocked from lifecycle hook execution paths.
- In non-strict mode, models are lazily granted on first hook registration or first lifecycle usage.

Migration notes:
- `Model.on(...)` and `model.registerHook(...)` are deprecated and emit warnings.
- Prefer `static modelEvents` and bootstrap registration with `registerModels([...])`.
- Full guide: `src/documentation/model-registry-hooks.md`

## Factory createMany Concurrency Behavior

`Factory.createMany(count, callback, concurrency > 1)` now fails fast:
- If any worker or callback fails, the whole call rejects.
- It no longer resolves with partial/sparse arrays when one task fails.

Migration note:
- If you need best-effort partial success, use an explicit `Promise.allSettled(...)` strategy or run sequentially and handle per-item errors.
