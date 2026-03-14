# ORM Hardening Phase 3: tsRuntime Transpile Fallback Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep `loadModule()` reliable for generated `.ts` artifacts even when `ts-node` registration is unavailable.

## Scope
- Preserve the current `dist` fallback for `src/...` files when compiled output exists.
- Fall back to the built-in `typescript` transpile loader when no compiled `dist` file exists.
- Keep relative temp-file imports and workspace `.ts` imports working in the same runtime path.

## Implemented
- Added an internal `loadTypeScriptModule(...)` path in `tsRuntime`.
- Reused the existing `dist` fallback when available.
- Removed the hard failure for raw `.ts` files with no `dist` output when `ts-node` cannot register.
- Added regression coverage for temp modules outside the workspace importing both temp and workspace `.ts` files.

## Acceptance Criteria
- `loadModule()` can load temp-generated `.ts` files without `ts-node` if the internal transpile path is available.
- Workspace `.ts` imports reached from temp-generated modules still resolve correctly.
- Existing `dist` fallback behavior remains intact for compiled `src/...` files.
