# ORM Hardening Phase 1 CoreModel Persistence State Extraction Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Pull the persistence-state helper cluster out of `CoreModel` into a dedicated helper module without changing runtime behavior.

## Scope
- Extract internal helper logic for:
  - primary-key resolution
  - persisted snapshot creation
  - assignable payload validation
  - dirty-field calculation
  - Mongo primary-key filter construction
- Keep the public `CoreModel` API unchanged.

## Non-Goals
- No CRUD semantic changes.
- No schema validation behavior changes.
- No public export changes.
- No query/runtime feature expansion.

## Acceptance Criteria
- `CoreModel` delegates persistence-state helper logic to a dedicated module.
- Helper behavior is covered by a focused test file.
- Existing instance persistence behavior (`fill`, `save`, `patch`) still passes.
- `npm run typecheck` stays green.

## Validation Strategy
- Focused helper/runtime test
- Existing persistence runtime tests
- `npm run typecheck`
