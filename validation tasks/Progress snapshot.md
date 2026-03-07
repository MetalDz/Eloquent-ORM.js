# Progress snapshot (2026-03-05)

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
- `npm test`: PASS (`22/22` suites, `159/159` tests)
- `npm run test:coverage`: PASS
  - Statements: `65.56%`
  - Branches: `45.77%`
  - Functions: `62.70%`
  - Lines: `68.16%`
- `npm run test:pack-smoke`: PASS

## Notes

- Current working tree includes runtime artifacts from local runs (`*.sqlite`, `coverage/coverage-summary.json`).
- Keep these out of release commits unless intentionally versioned.
