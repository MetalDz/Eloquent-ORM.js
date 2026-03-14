# Release Qualification Checklist

Last updated: 2026-03-10

Use this checklist before creating a release tag or publishing a package.

## Hard Gates

### 1) Typecheck + Build + Test
- Command source:
  - CI job: `quality-gate`
- Pass Criteria:
  - `npm run typecheck` passes.
  - `npm run build` passes.
  - `npm run test:coverage` passes.
- Fail Criteria:
  - Any of the three commands fails.
  - Coverage run exits non-zero.

### 2) Critical Stability Re-runs
- Command source:
  - CI job: `critical-stability`
  - Runs `npm run test:critical` three times in sequence.
- CI budget:
  - Job timeout: `25` minutes
  - Repeat step timeout: `15` minutes
- Pass Criteria:
  - All 3 critical runs pass.
- Fail Criteria:
  - Any rerun fails once.
  - CI times out before all 3 reruns complete.

### 3) Multi-Driver Scenario Matrix
- Command source:
  - CI job: `scenario-matrix`
  - Drivers: `mysql`, `pg`, `sqlite`
- Pass Criteria:
  - Scenario lifecycle completes on each driver:
    - `make:scenario`
    - `make:migration --all --test`
    - `migrate:run --test`
    - `db:seed --test`
    - `demo:scenario --test`
    - rollback and re-run migrate
- Fail Criteria:
  - Any driver job fails.

### 4) Package Smoke Validation
- Command source:
  - CI jobs: `package-smoke`, `package-smoke-windows`
- Pass Criteria:
  - `npm pack --dry-run` passes.
  - `npm run test:pack-smoke` passes on Linux with `ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1`.
  - `npm run test:pack-smoke` passes on Windows.
- Fail Criteria:
  - Tarball surface validation fails.
  - Smoke consumer execution fails.
  - Windows tarball smoke regresses.

### 5) Dependency Security and Lockfile Policy
- Command source:
  - CI job: `dependency-security`
- Pass Criteria:
  - `package-lock.json` exists in repo.
  - `npm ci --ignore-scripts` passes.
  - `npm audit --omit=dev --audit-level=high` passes.
- Fail Criteria:
  - Missing lockfile.
  - Lockfile install fails.
  - Production dependency audit reports high/critical vulnerabilities.

### 6) NoSQL Regression Gate
- Command source:
  - CI job: `nosql-regression`
  - Focused suites:
    - `src/lab_test/nosql.full.integration.contract.logic.test.ts`
    - `src/lab_test/nosql.cli.phase3.parity.logic.test.ts`
    - `src/lab_test/nosql.phase4.validation-and-gates.logic.test.ts`
- Pass Criteria:
  - NoSQL contract and CLI parity suites pass in CI.
  - NoSQL app/test routing checks pass.
  - NoSQL tarball smoke wiring checks pass.
- Fail Criteria:
  - Any NoSQL focused suite fails.
  - NoSQL command-surface/behavior contracts regress.
  - Tarball NoSQL runtime smoke assertions regress.

### 7) NoSQL Documentation Closure
- Required documents:
  - `src/documentation/nosql-usage-guide.md`
  - `src/documentation/usage-guides.md` (NoSQL workflow section)
  - `src/documentation/upgrade-guide.md` (SQL-first to Mongo upgrade notes)
- Pass Criteria:
  - NoSQL support matrix is documented.
  - SQL-only unsupported behavior on mongo is explicitly documented.
  - SQL-first enabling steps for mongo are documented for app and test environments.
- Fail Criteria:
  - Missing NoSQL usage/limitation documentation.
  - Missing upgrade guidance for SQL-first projects enabling mongo.

## Release Decision
- Release is allowed only when all hard gates pass in the same commit/PR.
- If any hard gate fails, release is blocked until the failure is resolved and CI is green.
