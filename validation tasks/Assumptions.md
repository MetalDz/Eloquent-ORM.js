# Assumptions and Status

Last updated: 2026-03-06

## Done
- Hook leak issue is resolved by model-scoped guarded hook storage (ModelRegistry + HookStore).
- Phase 1 complete: internal registry/store infrastructure added.
- Phase 2 complete: HooksMixin and QueryCacheMixin migrated to guarded hook flow with duplicate prevention.
- Phase 3 complete: registerModels([...]) entrypoint, strict guard, and lazy registration (non-strict auto-grant on first usage).
- Phase 4 complete: deprecation warnings, explicit errors, and migration docs.
- Phase 5 complete: unit/integration coverage for registry, hook store, lifecycle, cache behavior.
- Validation complete: npm.cmd run typecheck passed, npm.cmd test passed.
- Factory.createMany() concurrency hardening completed (fail-fast rejection, no partial-success resolve in concurrent mode).
- makeModel --with-migration rollback safety completed for update migrations (non-destructive `down()` generation).
- migrateRun empty-migration detection hardening completed (runtime query-execution detection, no brittle source regex skip).
- ConnectionFactory cold-start race hardening completed (deduped in-flight initialization for connection and adapter caches).
- SchemaBuilder default-string escaping hardening completed (safe default literal formatting for quoted strings).
- makeMigration append-only tracking hardening completed (no auto-delete of generated model/pivot migrations).
- Production Readiness Step 1 completed:
  - production destructive-command guardrails (`--force --yes` + `ELOQUENT_ALLOW_PROD_DESTRUCTIVE=true`)
  - `db:seed:precheck` bootstrap validation command
  - enforced precheck before `db:seed --all-connections`
- Production Readiness Step 2 completed:
  - partial rollback recovery runbook with operator commands
  - integration workflow test for partial rollback failure -> recover -> re-apply

## Current
- No active hardening tasks.
- ORM real-scenario CLI validation Phases 1-5 are completed with command evidence.
- Production readiness assessment added with remaining P0/P1/P2 tasks:
  - `validation tasks/Production-Readiness-Assessment.md`

## Locked (Until Previous Task Is Fully Closed)
- No locked items.

## Working Assumptions
- Hooks must remain isolated per model constructor (no cross-model leakage).
- Update migration rollback should be non-destructive.
- createMany() rejects on first worker failure in concurrent mode.
