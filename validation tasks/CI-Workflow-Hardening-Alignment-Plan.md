# CI Workflow Hardening Alignment Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Align `.github/workflows/ci.yml` with the latest hardening work so CI exercises the current tarball, Mongo, and CLI-operations regression paths directly.

## Scope
- Run tarball smoke on Linux with live Mongo runtime enabled.
- Add a Windows tarball smoke job to cover the Windows-specific packaging path.
- Extend the NoSQL regression job with the newer `demoScenario` runtime hardening suites.
- Keep the release qualification checklist aligned with the updated package-smoke gates.

## Implemented
- Added a Mongo service and `ELOQUENT_PACK_SMOKE_ENABLE_MONGO_RUNTIME=1` to `package-smoke`.
- Added `package-smoke-windows` on `windows-latest`.
- Extended `nosql-regression` with:
  - `src/lab_test/nosql.phase8.demo-and-factory-status.logic.test.ts`
  - `src/lab_test/nosql.phase15.cli-scenario-runtime.logic.test.ts`
  - `src/lab_test/orm.hardening.phase5.demo-scenario-operations.logic.test.ts`
- Updated the release checklist package-smoke section to mention the Linux live-Mongo and Windows gates.

## Acceptance Criteria
- CI covers the Linux live-Mongo tarball smoke path.
- CI covers the Windows tarball smoke path.
- NoSQL regression explicitly includes the newer `demoScenario` runtime hardening suites.
