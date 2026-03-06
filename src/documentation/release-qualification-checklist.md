# Release Qualification Checklist

Last updated: 2026-03-06

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
- Pass Criteria:
  - All 3 critical runs pass.
- Fail Criteria:
  - Any rerun fails once.

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
  - CI job: `package-smoke`
- Pass Criteria:
  - `npm pack --dry-run` passes.
  - `npm run test:pack-smoke` passes.
- Fail Criteria:
  - Tarball surface validation fails.
  - Smoke consumer execution fails.

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

## Release Decision
- Release is allowed only when all hard gates pass in the same commit/PR.
- If any hard gate fails, release is blocked until the failure is resolved and CI is green.
