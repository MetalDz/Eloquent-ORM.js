# Upgrade and Migration Guide

Last updated: 2026-03-10

## Versioned Upgrade Notes

## 0.10.x

### Model Registration and Hooks
- Public helpers available:
  - `registerModels`
  - `isModelRegistered`
  - `setModelRegistryStrictMode`
  - `isModelRegistryStrictMode`
- Recommendation:
  - register all models during bootstrap
  - keep strict mode enabled by default

### Factory Concurrency Semantics
- `Factory.createMany(..., concurrency > 1)` is fail-fast.
- If any worker fails, the entire call rejects.
- Migration action:
  - replace partial-success assumptions with explicit `allSettled` strategy where needed.

### Migration Tracking and Safety
- Migration tracker hardening now validates history/checksums and append-only behavior.
- If rollback fails, command exits non-zero and must be recovered via rollback runbook.

### Production Command Guardrails
- Destructive command execution in production now requires:
  - `ELOQUENT_ALLOW_PROD_DESTRUCTIVE=true`
  - `--force --yes`
- Migration action:
  - update CI/CD job commands to include explicit guard contract.

### Secrets and Access Contract
- Redaction is applied to CLI/core surfaced logs.
- DB role selection:
  - `ELOQUENT_DB_ROLE=runtime|migration`
- Migration action:
  - split runtime and migration DB credentials in deployment environments.

### Observability and Audit
- Structured logging support:
  - `ELOQUENT_LOG_FORMAT=json`
  - `ELOQUENT_LOG_LEVEL=debug|info|warn|error`
- Audit trail captures migration/seed command events.

### NoSQL Enablement (SQL-first to mixed SQL + Mongo)
If you already run SQL-first and want to enable mongo:
- Add mongo env keys:
  - `MONGO_URI`
  - `MONGO_DB_NAME`
  - `MONGO_TEST_URI`
  - `MONGO_TEST_DB_NAME`
- Keep SQL migration commands on SQL connections.
- Use explicit mongo targeting for NoSQL workflows:
  - `db:seed --mongo`
  - `db:seed --mongo --test`
  - `db:seed:fresh --mongo`
  - `demo:scenario --test` (with mongo test target)

Expected behavior changes:
- SQL migration commands targeted to mongo are skipped with actionable guidance.
- `--all-connections` remains SQL-only by design.
- No implicit multi-document transaction/session orchestration is introduced by default.

Migration action:
- Split operational runbooks into:
  - SQL schema migration path
  - Mongo seed/scenario validation path
- Add NoSQL regression checks to CI via `nosql-regression` gate.

## Pre-Upgrade Checklist
1. Backup target databases.
2. Confirm migration files are committed and immutable after apply.
3. Validate `.env` keys for runtime/migration role split.
4. Validate deployment scripts include production guard flags where required.

## Post-Upgrade Checklist
1. Run `migrate:status` for all active connections.
2. Run targeted smoke seed and scenario checks.
3. Verify audit log output and structured logging format.
4. Confirm no secret leakage in logs.
5. For mongo-enabled deployments, run:
   - `db:seed:precheck --mongo [--test]`
   - `db:seed --mongo [--test] --class <Seeder>`
   - `demo:scenario [--test]`

