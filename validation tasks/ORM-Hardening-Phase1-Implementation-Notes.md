# ORM Hardening Phase 1 Implementation Notes

Last updated: 2026-03-14  
Status: IN PROGRESS

## Boundary Matrix

### CoreModel
- Owns:
  - hydration
  - driver-agnostic CRUD
  - validation dispatch
  - lifecycle event dispatch
  - persistence state tracking (`_exists`, `_originalAttributes`)
  - safe-finder construction entry points
- Does not own:
  - relation helper convenience methods
  - morph alias convenience
  - serialization defaults
  - eager-loading convenience surface

### BaseModel
- Owns:
  - the default composed model runtime stack
  - static delegation to safe-finder methods
  - typed relation helper methods
  - morph alias convenience lookups
- Composition order:
  - `CoreModel`
  - `MorphableMixin`
  - `PivotHelperMixin`
  - `CastsMixin`
  - `SoftDeletesMixin`
  - `ScopeMixin`
  - `HooksMixin`
  - `QueryCacheMixin`
  - `EagerLoadingMixin`
  - `SerializeMixin`

### SqlModel
- Owns:
  - SQL-only connection guard
  - typed SQL `getDB()`
- Constraint:
  - must never accept a `mongo` driver connection

### MongoModel
- Owns:
  - Mongo-only connection guard
  - typed Mongo `getDB()`
- Constraint:
  - must always sit on top of the same composed `BaseModel` stack as SQL models

### Generated Models
- `make:model` and inline `make:scenario` model generation must:
  - extend `SqlModel` or `MongoModel`
  - never extend `CoreModel` directly
  - inherit the default `BaseModel` mixin stack unchanged

## Extraction Targets

### CoreModel Extraction Targets
- persistence state helpers
- validation / event orchestration helpers
- safe-finder factory setup
- Extracted on `2026-03-14`:
  - `src/core/model/CoreModelPersistenceState.ts`
  - covers primary-key resolution, snapshots, assignable payload checks, dirty tracking, and Mongo PK filters
  - `src/core/model/CoreModelValidationEvents.ts`
  - covers hook-disable evaluation, schema-driven validation rule assembly, validation dispatch, and lifecycle event cancellation handling

### BaseModel Extraction Targets
- static safe-finder delegation helpers
- relation-helper grouping
- composition metadata that should remain explicit during refactors

### CLI Extraction Targets
- command registration maps in `src/cli/eloquent.ts`
- shared flag normalization
- driver-target resolution helpers
- production-safety gating wrappers
- Extracted on `2026-03-14`:
  - `src/cli/utils/CliBootstrapSupport.ts`
  - covers `--test` detection, CLI test-connection env override, requested storage-kind resolution, and factory auto-load command gating
  - `src/cli/utils/CliCommandTargets.ts`
  - covers repeated command-level driver target resolution and primary-connection selection for single-target CLI commands
  - `src/cli/utils/CliActionRuntime.ts`
  - covers shared async action error normalization, default CLI error rendering, and `process.exitCode = 1` handling for wrapped CLI actions
  - `src/cli/utils/CliProductionGuards.ts`
  - covers destructive-command override enforcement and test-only production enforcement so `src/cli/eloquent.ts` no longer owns guard helpers directly
  - `src/cli/utils/CliCommandCatalog.ts`
  - covers the shared `list` command help rows so `src/cli/eloquent.ts` no longer embeds the command-help table inline
  - `src/cli/utils/CliPresentation.ts`
  - covers the startup banner and presentation strings so `src/cli/eloquent.ts` only invokes the shared helper

## Phase 1 Runtime Locks
- Public exports from `src/index.ts` must point to the same runtime classes as deep model imports.
- Generated SQL models must inherit `SqlModel -> BaseModel -> CoreModel` behavior.
- Generated Mongo models must inherit `MongoModel -> BaseModel -> CoreModel` behavior.
- BaseModel composition order must remain explicit and testable.
