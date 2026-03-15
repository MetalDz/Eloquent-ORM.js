# Usage Guides

Last updated: 2026-03-10

## 1) Runtime Setup
1. Configure environment variables in `.env`.
2. Select default connection with `DB_CONNECTION`.
3. Initialize model registration at app startup:
   - `registerModels([User, Post, ...])`
   - or generate a bootstrap helper with `eloquent make:registry`
4. Keep strict mode enabled by default unless migration path requires lazy behavior.

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

Examples:
- `eloquent migrate:run --all-connections --all-migrations`
- `eloquent db:seed --all-connections --class UserSeeder`

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

Detailed matrix and contract:
- `src/documentation/nosql-usage-guide.md`

