# DB Least-Privilege Env Contract

Last updated: 2026-03-06

## Goal
- Run application traffic with limited DB permissions.
- Run migrations with a separate privileged DB identity.

## Execution Role
- `ELOQUENT_DB_ROLE=runtime` (default)
  - Uses runtime user/password env keys first.
- `ELOQUENT_DB_ROLE=migration`
  - Uses migration user/password env keys first.

## What `ELOQUENT_DB_ROLE` means
`ELOQUENT_DB_ROLE` tells the ORM which credential family to prefer when a connection is resolved.

- `runtime`
  - use for normal application execution
  - Express requests, controllers, services, queues, and standard CRUD traffic
- `migration`
  - use only for migration-oriented jobs
  - schema create/alter/drop flows, CI migration stages, and controlled maintenance tasks

The contract is least privilege:
- runtime credentials should handle normal data access
- migration credentials may need elevated schema permissions

## When to use it in development vs production
The role meaning does not change between environments. What changes is where the process is running.

### Local development app process
```env
APP_ENV=development
ELOQUENT_DB_ROLE=runtime
```

### Local development migration command
```env
APP_ENV=development
ELOQUENT_DB_ROLE=migration
```

### Production app process
```env
APP_ENV=production
ELOQUENT_DB_ROLE=runtime
```

### Production migration job
```env
APP_ENV=production
ELOQUENT_DB_ROLE=migration
```

In production, destructive CLI commands are further restricted by the production safety guard contract.

## MySQL Contract
- Runtime keys:
  - `DB_RUNTIME_HOST`, `DB_RUNTIME_USER`, `DB_RUNTIME_PASSWORD`, `DB_RUNTIME_NAME`, `DB_RUNTIME_PORT`
- Migration keys:
  - `DB_MIGRATION_HOST`, `DB_MIGRATION_USER`, `DB_MIGRATION_PASSWORD`, `DB_MIGRATION_NAME`, `DB_MIGRATION_PORT`
- Test variants:
  - `DB_TEST_RUNTIME_*`
  - `DB_TEST_MIGRATION_*`

Fallback keeps compatibility with existing keys:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- `DB_TEST_HOST`, `DB_TEST_USER`, `DB_TEST_PASSWORD`, `DB_TEST_NAME`, `DB_TEST_PORT`

## PostgreSQL Contract
- Runtime keys:
  - `PG_RUNTIME_HOST`, `PG_RUNTIME_USER`, `PG_RUNTIME_PASSWORD`, `PG_RUNTIME_NAME`/`PG_RUNTIME_DB_NAME`, `PG_RUNTIME_PORT`
- Migration keys:
  - `PG_MIGRATION_HOST`, `PG_MIGRATION_USER`, `PG_MIGRATION_PASSWORD`, `PG_MIGRATION_NAME`/`PG_MIGRATION_DB_NAME`, `PG_MIGRATION_PORT`
- Test variants:
  - `PG_TEST_RUNTIME_*`
  - `PG_TEST_MIGRATION_*`

Fallback compatibility:
- `PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_NAME`/`PG_DB_NAME`, `PG_PORT`
- `PG_TEST_HOST`, `PG_TEST_USER`, `PG_TEST_PASSWORD`, `PG_TEST_NAME`/`PG_TEST_DB_NAME`, `PG_TEST_PORT`

## SQLite Contract
- Runtime path:
  - `SQLITE_RUNTIME_PATH` (fallback `SQLITE_PATH`)
- Migration path:
  - `SQLITE_MIGRATION_PATH` (fallback `SQLITE_PATH`)
- Test variants:
  - `SQLITE_TEST_RUNTIME_PATH`
  - `SQLITE_TEST_MIGRATION_PATH`

## Recommended Operational Usage
1. Application runtime:
   - `ELOQUENT_DB_ROLE=runtime`
2. Migration jobs:
   - `ELOQUENT_DB_ROLE=migration`
3. CI test migrations:
   - `ELOQUENT_DB_ROLE=migration` + `DB_TEST_MIGRATION_*`/`PG_TEST_MIGRATION_*`

## Minimum Permission Model
- Runtime user:
  - Read/write data tables.
  - No schema-alter privileges.
- Migration user:
  - Schema create/alter/drop only in target DB.
  - No superuser/global admin privileges.

