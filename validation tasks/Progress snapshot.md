# Progress snapshot (2026-03-08)

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
- Milestone 6.2 branch-coverage ratchet progress (2026-03-08).
  - Phase 1 utility branch suite implemented and passing.
  - Phase 2 cache/connection branch suite implemented and passing.
  - Phase 3 CLI command branch suite implemented and passing (`11/11`):
    - `makeModel`, `makeMigration`, `migrateFresh`, `dbSeed`, `cacheClear`, `cacheStats`
  - Phase 4 ORM mixin branch suite implemented and passing.
  - Phase 5 migration/schema safety branch suite implemented and passing.
  - Additional support suites added:
    - `branch.coverage.70.cli-support.logic.test.ts`
    - `branch.coverage.70.cli-support-shared.logic.test.ts`
    - `branch.coverage.70.factory-path-resolver.logic.test.ts`
    - `branch.coverage.70.dbseedfresh.logic.test.ts`
  - Global branch coverage increased from `46.41%` to `70.22%` (`+23.81` points, `+515` covered branches).

## In Progress

- Milestone 6.1 Documentation completion.
  - Final README polish (supported features, known limits).
  - Production configuration and upgrade notes.
  - Security/support policy docs.
- Milestone 6.2 Coverage ratchet.
  - Branch target reached (`>=70%`).
  - Remaining work is environment-level stability of full CLI integration spawn in this local host policy.
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
- `npm run test:coverage`: SUMMARY TARGET MET (command exit non-zero in this host due `spawnSync ... node.exe EPERM` in CLI integration spawn tests)
  - Coverage summary:
    - Statements: `85.92%` (`3338/3885`)
    - Branches: `70.22%` (`1519/2163`)
    - Functions: `87.64%` (`539/615`)
    - Lines: `88.15%` (`3208/3639`)
- `npm run test:pack-smoke`: PASS
- Focused tracker contract regression:
  - `npm test -- --runInBand --runTestsByPath src/lab_test/migration.tracker.single-table.contract.logic.test.ts`: PASS (`6/6`)

## Notes

- Current working tree includes runtime artifacts from local runs (`*.sqlite`, `coverage/coverage-summary.json`).
- Keep these out of release commits unless intentionally versioned.
