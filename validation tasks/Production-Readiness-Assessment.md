# Production Readiness Assessment

Last updated: 2026-03-06

## Verdict
- **Not fully production-ready yet** for broad/public deployment.
- **Conditionally ready** for controlled production usage if you run the validated migration/seed workflows and keep current hardening tests in CI.

## Evidence (Current Strength)
- Core robustness hardening tasks are implemented and tracked:
  - Hook registry isolation
  - Factory `createMany` fail-fast concurrency behavior
  - `makeModel --with-migration` rollback safety
  - `migrate:run` empty migration detection
  - ConnectionFactory cold-start race protection
  - SchemaBuilder default-string escaping
  - Migration append-only tracking and baseline integrity recovery
- Real scenario CLI lifecycle (Phases 1-5) is documented with command evidence:
  - `validation tasks/ORM-Real-Scenario-CLI-Validation-Plan.md`

## Ordered Production Task Plan (No Rework)

### Step 1: CLI Production Safety Controls (Implement First)
- [x] Add production guardrails for destructive commands (`migrate:fresh`, `migrate:reset`, `db:seed:fresh`, `make:*` in prod).
- [x] Require explicit override contract for destructive prod actions (`--force --yes` + env allow flag).
- [x] Add preflight "clean bootstrap before all-connections seed" check/command.
- [x] Add tests:
  - `src/lab_test/cli.production.safety.logic.test.ts`
  - `src/lab_test/cli.bootstrap.precheck.logic.test.ts`
  - Tracking: `validation tasks/CLI-Production-Safety-Controls-Plan.md`

### Step 2: Migration/Rollback Failure Safety
- [x] Rollback returns non-zero exit when `down()` fails.
- [x] Regression test added for rollback failure exit code.
- [ ] Add partial rollback recovery runbook section with concrete operator steps.
- [ ] Add integration test for partial rollback recovery workflow.

### Step 3: Secrets + Access Hardening
- [ ] Enforce secret redaction in CLI/core logs and surfaced errors.
- [ ] Add least-privilege DB guidance and env contract (runtime user vs migration user).
- [ ] Add tests:
  - `src/lab_test/cli.secret.redaction.logic.test.ts`
  - `src/lab_test/db.user.role.separation.logic.test.ts`

### Step 4: Observability + Audit Trail
- [ ] Add structured logging mode (JSON + log levels).
- [ ] Add migration/seed audit fields (command, actor, connection, timestamp, result).
- [ ] Add test:
  - `src/lab_test/cli.audit.trail.logic.test.ts`

### Step 5: Security and API Documentation
- [ ] Add `SECURITY.md` (scope, supported versions, reporting process).
- [ ] Add API documentation for public exports and extension points.
- [ ] Add production CLI safety document (safe vs destructive commands).
- [ ] Add usage guides (runtime, migrations, seeding, multi-driver, test mode).
- [ ] Add versioned upgrade/migration guide.
- [ ] Add docs presence test:
  - `src/lab_test/docs.production.presence.logic.test.ts`

### Step 6: CI + Release Qualification (Finalize Last)
- [ ] CI enforcement: `typecheck`, hardening tests, CLI scenario gates.
- [ ] CI matrix coverage for `mysql`, `pg`, `sqlite`.
- [ ] Add dependency/security checks in CI (`npm audit` policy + lockfile policy).
- [ ] Add release qualification checklist with explicit pass/fail criteria.

## Dependency Rules (Do Not Reorder)
1. Complete Step 1 before new docs: behavior must be final before documenting it.
2. Complete Step 2 before release checklist: rollback behavior is a release gate.
3. Complete Step 3 before Step 4: structured logs must not leak secrets.
4. Complete Step 5 after core behavior stabilizes: avoid documentation churn/rewrite.
5. Complete Step 6 last: CI should lock final behavior/docs, not moving targets.

## New Test Coverage Added for this Assessment
- `src/lab_test/production.readiness.gates.logic.test.ts`
  - Verifies critical hardening test files exist.
  - Verifies critical validation-task docs exist.

## Command Evidence for New Assessment Gate
- `npm.cmd test -- --runTestsByPath src/lab_test/production.readiness.gates.logic.test.ts`
  - Expected: `PASS`
