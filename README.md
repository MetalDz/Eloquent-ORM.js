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

 
🧑‍💻 Authors
Created with ❤️ by ALPHA Consultings who love Laravel, Node.js, and TypeScript.