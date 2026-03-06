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
- Production Readiness Step 3 completed:
  - secret redaction utility applied to CLI/core logs and surfaced errors
  - role-aware DB env contract for runtime vs migration users
  - least-privilege DB documentation + verification tests
- Production Readiness Step 4 completed:
  - structured logging mode (`ELOQUENT_LOG_FORMAT=json`, `ELOQUENT_LOG_LEVEL`)
  - migration/seed audit events with command/actor/connection/timestamp/result
  - audit trail validation test coverage
- Production Readiness Step 5 completed:
  - `SECURITY.md`, API reference, CLI safety guide, usage guides, and upgrade guide
  - docs presence quality gate test for production documentation set
- Production Readiness Step 6 completed:
  - CI dependency/security gate (`package-lock` policy + `npm audit --omit=dev --audit-level=high`)
  - release qualification checklist with explicit pass/fail criteria
  - Step 6 validation test and tracking plan

## Current
- No active hardening tasks.
- ORM real-scenario CLI validation Phases 1-5 are completed with command evidence.
- Production readiness assessment Steps 1-6 are completed and tracked:
  - `validation tasks/Production-Readiness-Assessment.md`

## Locked (Until Previous Task Is Fully Closed)
- No locked items.

## Working Assumptions
- Hooks must remain isolated per model constructor (no cross-model leakage).
- Update migration rollback should be non-destructive.
- createMany() rejects on first worker failure in concurrent mode.
