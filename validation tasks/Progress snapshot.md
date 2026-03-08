# Progress snapshot (2026-03-07)

## Done

- Milestone 1: Release blockers completed.
  - Reversible migrations (`up`/`down`) for create/update/pivot.
  - Pivot factory template import path fixes.
  - Cache commands (`cache:clear`, `cache:stats`) implemented and tested.
  - Mongo connection lifecycle fixed and tested.
- Milestone 2: Test coverage and quality gate completed.
  - CoreModel CRUD tests added.
  - Relation tests added (`belongsTo`, `hasMany`, `belongsToMany`, `morphTo`, `morphMany`, `morphOne`, `hasOne`).
  - CLI integration tests added for migration/seed/scenario flows.
  - CI quality gate present (`typecheck`, `build`, `test:coverage`).
- Milestone 3: Multi-DB hardening completed.
  - Matrix validation on MySQL, Postgres, SQLite.
  - Dialect-specific migration/schema behavior hardened.
  - Scenario matrix in CI is configured and passing.
- Milestone 4: Security and stability hardening completed.
  - SQLi regression and identifier safety coverage added.
  - Migration locking + history/checksum safety logic added.
  - Critical stability rerun job added.
- Milestone 5: Package and API hardening completed.
  - 5.1 Package surface (`exports`, `files`, CLI bin path).
  - 5.2 Tarball validation closure (`npm pack` + clean install + CLI/runtime smoke in CI).
  - 5.3 API freeze.
  - 5.4 Dialect-aware schema update hardening.
  - 5.5 SQL runtime parity hardening.
- Milestone 5 follow-up cleanup completed (2026-03-07).
  - Standardized test migration command usage to `migrate:run --test`.
  - Removed legacy alias surface usage (`migrate:run:test`) from smoke flow.
  - Updated pack smoke script to use `migrate:run --test` only.
  - Migration tracker single-table contract finalized:
    - tracker bootstrap persists `migrations` only
    - locking is native per driver (PG advisory lock, MySQL named lock, SQLite `BEGIN IMMEDIATE`)
    - legacy `migration_locks` behavior documented as compatibility-only.
  - API surface tightened by removing legacy `TableBackedMigrationLockStrategy` export.

## In Progress

- Milestone 6.1 Documentation completion.
  - Final README polish (supported features, known limits).
  - Production configuration and upgrade notes.
  - Security/support policy docs.
- Milestone 6.2 Coverage ratchet.
  - Raise branch coverage gradually.
  - Add targeted tests for low-covered files (cache internals, TS runtime helper, selected mixins).
- Milestone 6.3 Release execution.
  - Semantic-release dry run on `master`.
  - First release from `master` only.
  - Post-publish install/run/migrate/seed verification.
- Milestone 6.4 Dependency security cleanup.
  - Resolve open Dependabot highs (`tar`, `minimatch`) and re-verify full gate.

## Remaining

- Complete Milestone 6 done criteria.
  - Checklist fully green.
  - CI matrix green.
  - Reproducible install/runtime flow post-publish.

## Latest project check (local)

- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm test`: FAIL on this host due spawn permission (`spawnSync ... node.exe EPERM`) in CLI integration suites.
  - Observed totals in current run: `7 failed`, `1 skipped`, `47 passed` suites (`54/55` total), `73 failed`, `23 skipped`, `205 passed` tests (`301` total).
- `npm run test:coverage`: FAIL on this host for the same EPERM reason (coverage summary still produced).
  - Statements: `65.86%` (`2559/3885`)
  - Branches: `46.41%` (`1004/2163`)
  - Functions: `65.36%` (`402/615`)
  - Lines: `68.17%` (`2481/3639`)
- `npm run test:pack-smoke`: PASS
- Focused tracker contract regression:
  - `npm test -- --runInBand --runTestsByPath src/lab_test/migration.tracker.single-table.contract.logic.test.ts`: PASS (`6/6`)

## Notes

- Current working tree includes runtime artifacts from local runs (`*.sqlite`, `coverage/coverage-summary.json`).
- Keep these out of release commits unless intentionally versioned.
