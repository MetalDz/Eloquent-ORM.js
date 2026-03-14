# CLI Bootstrap ProcessEnv Type Compatibility Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep the extracted CLI bootstrap helper type-compatible with `process.env` under the build-only TypeScript configuration.

## Scope
- Widen the bootstrap env contract so `process.env` can be passed directly to:
  - `applyCliTestConnectionOverride(...)`
  - `resolveCliRequestedStorageKind(...)`
- Lock the compatibility contract with a dedicated source-level regression test.

## Implemented
- Added an index signature to `CliBootstrapEnv` in `src/cli/utils/CliBootstrapSupport.ts`.
- Kept the explicit `DB_CONNECTION` / `DB_TEST_CONNECTION` fields while making the helper compatible with `NodeJS.ProcessEnv`.

## Acceptance Criteria
- `src/cli/eloquent.ts` can pass `process.env` to the bootstrap helpers without `TS2559`.
- `npm run build` passes under `tsconfig.build.json`.
