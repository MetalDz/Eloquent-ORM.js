# Template Cleanup Standardization Plan

Last updated: 2026-03-07  
Status: DONE (Closed)

## Goal
- Define what "clean tpl" means for EloquentJS CLI templates.
- Enforce it automatically so template drift is caught in CI.

## Clean Template Contract
- Template files must be ASCII-only.
- No tab indentation.
- No trailing whitespace.
- File must end with a trailing newline.
- Keep generated code comments concise and non-garbled.

## Scope
- `src/cli/templates/model.tpl`
- `src/cli/templates/migration.tpl`
- `src/cli/templates/seed.tpl`
- `src/cli/templates/pivot-factory.tpl`
- Other `.tpl` files in `src/cli/templates`

## Implementation
- Cleaned template comments/content where needed to remove garbled characters and normalize style.
- Added a lab test:
  - `src/lab_test/template.cleanliness.logic.test.ts`
- Test validates the contract for all `.tpl` files in `src/cli/templates`.

## Acceptance Criteria
- [x] All CLI templates satisfy the clean template contract.
- [x] Contract is enforced by automated tests.
- [x] Typecheck/build/test remain green for affected scope.
