# ORM Hardening Phase 1 CoreModel Validation and Events Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Pull validation orchestration and lifecycle-event execution out of `CoreModel` into a dedicated helper module without changing runtime behavior.

## Scope
- Extract internal helper logic for:
  - `ELOQUENT_DISABLE_MODEL_HOOKS` evaluation
  - validation-rule assembly from schema
  - validation execution with hooks and custom rules
  - lifecycle-event execution and cancellation handling
- Keep the public `CoreModel` API unchanged.

## Non-Goals
- No schema or validation rule semantic changes.
- No lifecycle event contract changes.
- No public export changes.
- No new hook types or event names.

## Acceptance Criteria
- `CoreModel` delegates validation/event orchestration to a dedicated module.
- Helper behavior is covered by a focused test file.
- Existing CRUD, validation, and Mongo validation tests still pass.
- `npm run typecheck` stays green.

## Validation Strategy
- Focused helper/runtime test
- Existing CoreModel CRUD and Mongo validation suites
- `npm run typecheck`
