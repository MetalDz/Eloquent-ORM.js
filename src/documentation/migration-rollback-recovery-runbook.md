# Migration Rollback Partial-Failure Recovery Runbook

Last updated: 2026-03-06

## Purpose
- Recover safely when `migrate:rollback` stops mid-run because one migration `down()` failed.
- Restore a clean migration state, then re-apply migrations in a controlled way.

## Signals You Are in This Situation
- `migrate:rollback` exits non-zero.
- Logs contain `Error rolling back ...`.
- `migrate:status` shows mixed state (some files rolled back, one or more still applied).

## Safety Rules
- Take a database backup/snapshot before retrying rollback in production.
- Fix migration files in source control, not directly in generated runtime artifacts.
- Never delete rows manually from `migrations` unless you have no safer option.

## Recovery Workflow (Single Connection)
1. Capture current status:
   - `eloquent migrate:status --mysql`
   - or `--pg` / `--sqlite` / `--test` as applicable
2. Identify the failing migration from rollback logs.
3. Fix the migration `down()` implementation so it is idempotent and safe.
4. Re-run rollback for remaining applied migrations:
   - `eloquent migrate:rollback --mysql --all-migrations`
   - test mode: `eloquent migrate:rollback --test --mysql --all-migrations`
5. Verify rollback completion:
   - `eloquent migrate:status --mysql`
6. Re-apply schema from migrations:
   - `eloquent migrate:run --mysql --all-migrations`
   - test mode: `eloquent migrate:run --test --mysql --all-migrations`
7. Final verification:
   - `eloquent migrate:status --mysql`
   - optional smoke seed: `eloquent db:seed --mysql --class <SeederClass>`

## Recovery Workflow (All Connections)
1. Run status for each target connection:
   - `eloquent migrate:status --all-connections`
   - test mode: `eloquent migrate:status --test --all-connections`
2. Fix failing `down()` migration file once in source.
3. Re-run rollback across all targeted connections:
   - `eloquent migrate:rollback --all-connections --all-migrations`
   - test mode: `eloquent migrate:rollback --test --all-connections --all-migrations`
4. Re-run migration apply:
   - `eloquent migrate:run --all-connections --all-migrations`
   - test mode: `eloquent migrate:run --test --all-connections --all-migrations`
5. Re-check status:
   - `eloquent migrate:status --all-connections`

## Post-Incident Hardening Checklist
- Add/extend a regression test for the failed rollback pattern.
- Ensure `down()` handles already-absent columns/tables defensively.
- Update release notes with migration remediation steps if needed.

## Migration Tracker Single-Table Contract (Upgrade Note)
- Current migration tracker contract persists only the `migrations` history table.
- Legacy table `migration_locks` is no longer required for locking in current versions.
- Existing installs that still have `migration_locks` remain compatible:
  - runtime ignores that table
  - migration locking uses native driver mechanisms
- Optional cleanup (manual, after upgrade validation):
  - MySQL / SQLite: `DROP TABLE IF EXISTS migration_locks;`
  - PostgreSQL: `DROP TABLE IF EXISTS migration_locks CASCADE;`

