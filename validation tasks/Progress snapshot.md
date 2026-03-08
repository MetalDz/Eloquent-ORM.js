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
- Milestone 6.2+ coverage escalation progress (2026-03-08, continued).
  - Phase 6 ORM edge-branch suite added and passing:
    - `src/lab_test/branch.coverage.100.phase6.orm-branches.logic.test.ts` (`5/5`)
  - Phase 7 CLI migration command edge suites added and passing:
    - `src/lab_test/branch.coverage.100.phase7.migrate-run.logic.test.ts` (`6/6`)
    - `src/lab_test/branch.coverage.100.phase7.make-model.logic.test.ts` (`5/5`)
    - `src/lab_test/branch.coverage.100.phase7.make-migration.logic.test.ts` (`5/5`)
  - Command-branch focused lifts:
    - `migrateRun.ts`: `67.64%` -> `88.23%`
    - `makeModel.ts`: `62.13%` -> `81.55%`
    - `makeMigration.ts`: `68.46%` -> `77.69%`
  - Latest global branch coverage: `82.17%` (`1770/2154`).

## In Progress

- Milestone 6.1 Documentation completion.
  - Final README polish (supported features, known limits).
  - Production configuration and upgrade notes.
  - Security/support policy docs.
- Milestone 6.2 Coverage ratchet.
  - Branch target reached (`>=70%`).
  - Full local run now also green in the same cycle (`69/69` suites).
- Milestone 6.2+ Coverage escalation to 100% (new track, started 2026-03-08).
  - Plan created: `validation tasks/Branch-Coverage-100-Execution-Plan.md`.
  - Contract test created: `src/lab_test/branch.coverage.100.plan.logic.test.ts`.
  - Phase-1 deterministic branch suite created:
    - `src/lab_test/branch.coverage.100.phase1.logic.test.ts`
  - Phase-2 mid-complexity core branch suite created and passing:
    - `src/lab_test/branch.coverage.100.phase2.logic.test.ts` (`11/11`)
    - focused module branch snapshot (Phase 2 subset): `81%`
  - Phase-3 CLI command branch suite created and passing:
    - `src/lab_test/branch.coverage.100.phase3.logic.test.ts` (`8/8`)
    - focused command subset branch snapshot: `68.62%` (was `44.77%` before adding Phase 3 suite)
  - Phase-4 migration tracker/locking edge suite created and passing:
    - `src/lab_test/branch.coverage.100.phase4.logic.test.ts` (`8/8`)
    - focused migration module closure:
      - `src/cli/utils/migrations/MigrationLockStrategy.ts`: branches `100%`
      - `src/cli/utils/migrations/MigrationTracker.ts`: branches `100%`
    - runtime cleanup aligned with single-table tracker contract:
      - removed dead legacy `TableBackedMigrationLockStrategy` code path
  - Phase-5 hard-to-reach/environment suite expanded and passing:
    - `src/lab_test/branch.coverage.100.phase5.logic.test.ts` (`5/5`)
    - `src/lab_test/branch.coverage.100.phase5.cache-hooks.logic.test.ts` (`6/6`)
    - Added spawn-capability gating for CLI integration/help suites so host EPERM policy now skips those suites deterministically.
  - Phase-6 ORM branch closure suite created and passing:
    - `src/lab_test/branch.coverage.100.phase6.orm-branches.logic.test.ts` (`5/5`)
  - Phase-7 CLI migration edge branch suites created and passing:
    - `src/lab_test/branch.coverage.100.phase7.migrate-run.logic.test.ts` (`6/6`)
    - `src/lab_test/branch.coverage.100.phase7.make-model.logic.test.ts` (`5/5`)
    - `src/lab_test/branch.coverage.100.phase7.make-migration.logic.test.ts` (`5/5`)
  - Latest global coverage snapshot:
    - Statements: `94.77%` (`3667/3869`)
    - Branches: `82.17%` (`1770/2154`)
    - Functions: `95.08%` (`580/610`)
    - Lines: `96.3%` (`3490/3624`)
- Structured logger branch hardening expanded in:
    - `src/lab_test/cli.audit.trail.logic.test.ts`.
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

- `npm run typecheck`: PASS (last known)
- `npm run build`: PASS (last known)
- `npm.cmd run test:coverage`: PASS (latest shell snapshot)
  - Coverage summary:
    - Statements: `94.77%` (`3667/3869`)
    - Branches: `82.17%` (`1770/2154`)
    - Functions: `95.08%` (`580/610`)
    - Lines: `96.3%` (`3490/3624`)
  - Test suites: `68 passed`, `8 skipped`, `76 total`
  - Tests: `377 passed`, `96 skipped`, `473 total`
- `npm run test:pack-smoke`: PASS
- Focused tracker contract regression:
  - `npm test -- --runInBand --runTestsByPath src/lab_test/migration.tracker.single-table.contract.logic.test.ts`: PASS (`6/6`)
- Focused branch-100 phase validation:
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.plan.logic.test.ts src/lab_test/branch.coverage.100.phase1.logic.test.ts src/lab_test/branch.coverage.100.phase2.logic.test.ts`: PASS (`16/16`)
- Focused phase-3 command validation:
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase3.logic.test.ts`: PASS (`8/8`)
- Focused phase-4 migration validation:
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase4.logic.test.ts`: PASS (`8/8`)
  - `npm.cmd test -- --runInBand --coverage --coverageReporters=text --collectCoverageFrom=src/cli/utils/migrations/MigrationLockStrategy.ts --collectCoverageFrom=src/cli/utils/migrations/MigrationTracker.ts src/lab_test/branch.coverage.70.migration-and-schema.logic.test.ts src/lab_test/migration.tracker.logic.test.ts src/lab_test/migration.tracker.single-table.contract.logic.test.ts src/lab_test/branch.coverage.100.phase4.logic.test.ts`: PASS (focused modules at `100%` for statements/branches/functions/lines)
- Focused phase-5 cache/hooks validation:
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase5.cache-hooks.logic.test.ts`: PASS (`6/6`)
- Focused combined phase validation:
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.plan.logic.test.ts src/lab_test/branch.coverage.100.phase1.logic.test.ts src/lab_test/branch.coverage.100.phase2.logic.test.ts src/lab_test/branch.coverage.100.phase3.logic.test.ts`: PASS (`24/24`)
- Focused phase-6 ORM validation:
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase6.orm-branches.logic.test.ts`: PASS (`5/5`)
- Focused phase-7 command-edge validations:
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase7.migrate-run.logic.test.ts`: PASS (`6/6`)
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase7.make-model.logic.test.ts`: PASS (`5/5`)
  - `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/branch.coverage.100.phase7.make-migration.logic.test.ts`: PASS (`5/5`)

## Notes

- Current working tree includes runtime artifacts from local runs (`*.sqlite`, `coverage/coverage-summary.json`).
- Keep these out of release commits unless intentionally versioned.
