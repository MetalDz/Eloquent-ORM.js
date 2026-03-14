# ORM Hardening Phase 3: Template and Inline Model Parity Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep `model.tpl` and inline `make:scenario` model generation aligned for the default `BaseModel` surface.

## Scope
- Align scenario-generated model files with the notable default model scaffolding from `model.tpl`.
- Keep the inline scenario path consistent for both SQL and Mongo model generation.

## Implemented
- Added `RELATIONS EXAMPLES` scaffolding to inline `make:scenario` models.
- Added `OPTIONAL MIXINS` scaffolding to inline `make:scenario` models.
- Added `static validationHooks`, `static customRules`, and `static modelEvents` to inline `make:scenario` models.
- Added a regression test that verifies SQL and Mongo scenario-generated models contain the same notable blocks as `model.tpl`.

## Acceptance Criteria
- Scenario-generated models include the same documented default model surface as `make:model` output.
- SQL and Mongo scenario-generated models remain loadable and compatible with the default runtime stack.
- Future drift between `model.tpl` and inline `make:scenario` output is caught by a dedicated parity test.
