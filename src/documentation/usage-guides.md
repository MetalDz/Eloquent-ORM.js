# Usage Guides

Last updated: 2026-03-06

## 1) Runtime Setup
1. Configure environment variables in `.env`.
2. Select default connection with `DB_CONNECTION`.
3. Initialize model registration at app startup:
   - `registerModels([User, Post, ...])`
4. Keep strict mode enabled by default unless migration path requires lazy behavior.

## 2) Migration Workflow
Generate migrations:
- single model: `eloquent make:migration User`
- all models: `eloquent make:migration --all`

Apply migrations:
- app mode: `eloquent migrate:run --all-migrations`
- test mode: `eloquent migrate:run:test --all-migrations`

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
Use `--test` (or `migrate:run:test`) to isolate test fixtures from app data.

Examples:
- `eloquent make:model User --test`
- `eloquent make:migration --all --test`
- `eloquent migrate:run --test --all-migrations`
- `eloquent db:seed --test --class BlogScenarioSeeder`

## 6) Recommended Command Order
1. `make:*` (if needed)
2. `make:migration`
3. `migrate:run` / `migrate:run:test`
4. `db:seed` / `db:seed:fresh`
5. `migrate:status` verification

