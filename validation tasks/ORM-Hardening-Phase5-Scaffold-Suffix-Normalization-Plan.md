# ORM Hardening Phase 5: Scaffold Suffix Normalization Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Prevent duplicated scaffold suffixes when `make:controller` or `make:service` receive names that already end with `Controller` or `Service`.

## Scope
- Normalize the scaffold base name in the shared scaffold helper.
- Keep the generated file/class name suffix exactly once.
- Keep controller route names and import paths aligned with the normalized base model name.
- Lock the behavior with a dedicated generator test.

## Implemented
- Added `normalizeScaffoldModelName(...)` in `ScaffoldGeneratorSupport.ts`.
- Updated `resolveScaffoldArtifact(...)` to derive the model base from the normalized name.
- Updated `makeController(...)` to derive route names from the normalized model class name.
- Added dedicated regression coverage for `UserController` and `UserService` style inputs.

## Acceptance Criteria
- `make:controller UserController` produces `UserController.ts` wired to `UserService` and `User`.
- `make:service UserService` produces `UserService.ts` wired to `User`.
- Generated controller routes use the normalized resource base instead of `userController`.
