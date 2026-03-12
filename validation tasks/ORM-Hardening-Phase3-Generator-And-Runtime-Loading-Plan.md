# ORM Hardening Phase 3: Generator and Runtime Loading Plan

Last updated: 2026-03-12  
Status: PLANNED

## Goal
- Keep generated artifacts and runtime loading behavior stable across app/test/temp files, pack smoke, and CI.

## Scope
- Maintain parity between:
  - `model.tpl`
  - inline `make:scenario` model generation
  - generated factory/seed/scenario artifacts
- Harden:
  - `tsRuntime`
  - temp-file loading
  - app-model fallback fixtures used in tests
  - packaged smoke behavior for generated TypeScript files

## Current Hotspots
- `src/cli/utils/typescript/tsRuntime.ts` (`149` lines)
- Generated temp `.ts` files and `/tmp` loading have already caused CI-only regressions.
- Template and inline generator paths can drift when new BaseModel capabilities are added.

## Non-Goals
- No replacement of the TypeScript runtime with a separate build pipeline.
- No duplication of model behavior in generator templates.
- No generator-only features that bypass the runtime stack.

## Proposed Work Slices
- Keep template and inline generator outputs feature-aligned.
- Validate generated app/test models against the default BaseModel stack.
- Keep temp-module loading stable both inside and outside Jest resolution.
- Extend pack-smoke contracts for generated artifact lifecycles.

## Acceptance Criteria
- Generated models from `make:model` and `make:scenario` inherit the same default runtime surface.
- Temp-generated `.ts` files can be loaded reliably in local and CI contexts.
- Template and inline generator changes are protected by dedicated tests.
- Pack-smoke covers at least one generated SQL flow and one generated Mongo flow for the touched slice.

## Validation Strategy
- Contract test for this plan file.
- Focused generator/runtime tests.
- `npm run typecheck`
- `npm run build`
- `npm run test:pack-smoke`
