# Register Models CLI Generator Plan

Status: COMPLETED

## Goal
Generate a bootstrap helper from the CLI so consumers do not have to hand-write `registerModels([...])` every time they add or reorganize models.

## Delivered
- Added `eloquent make:registry`.
- Supports app mode and `--test` mode.
- Supports `--force` overwrite behavior and production override gating.
- Generates:
  - `src/app/registerModels.ts`
  - `src/test/registerModels.ts`
- Emits explicit model imports and wraps them in:
  - `registerAppModels(options?)`
  - `registerTestModels(options?)`
- Uses `registerModels([...])` under the hood and preserves `RegisterModelsOptions`.
- Documented the workflow in:
  - `src/documentation/model-registry-hooks.md`
  - `src/documentation/usage-guides.md`

## Validation
- CLI command surface tests updated.
- CLI help tests updated.
- CLI generator integration covers app and test registry generation.
- Dedicated generator logic coverage added in `src/lab_test/make.registry.logic.test.ts`.
