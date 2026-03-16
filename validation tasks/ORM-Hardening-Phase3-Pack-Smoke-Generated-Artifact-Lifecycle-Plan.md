# ORM Hardening Phase 3: Pack Smoke Generated Artifact Lifecycle Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extend packaged smoke coverage so generated TypeScript artifacts are loaded through the packaged runtime, not just created on disk.

## Scope
- Cover at least one generated SQL model lifecycle in the packaged sample app.
- Cover at least one generated Mongo model lifecycle in the packaged sample app.
- Keep the smoke assertions focused on the default `BaseModel` surface exposed by generated artifacts.

## Implemented
- Added a packaged runtime helper in `pack-smoke.js` that loads generated model files through the installed package `dist/cli/utils/typescript/tsRuntime` path.
- Added a generated SQL model runtime smoke check for `DemoAuto.ts`.
- Added a generated SQL scenario model runtime smoke check for `User.ts`.
- Added a generated Mongo model runtime smoke check for `GeoLocation.ts`.

## Acceptance Criteria
- Pack-smoke validates a generated SQL model through the packaged TypeScript runtime path.
- Pack-smoke validates a generated Mongo model through the packaged TypeScript runtime path.
- Generated model serialization and default safe-finder/static surface are asserted in the packaged sample app.
