# ORM Hardening Phase 5: Demo Scenario Operations Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Raise direct confidence in `src/cli/commands/demoScenario.ts` across the SQL and Mongo runtime branches that were previously covered mostly through indirect CLI flows.

## Scope
- Add direct tests for SQL `--random` execution and empty-post handling.
- Add direct tests for SQL no-user and failure handling branches.
- Add direct tests for Mongo default-user selection and no-user handling.
- Add direct tests for top-level failure logging and CLI-mode exit scheduling.

## Implemented
- Added a dedicated direct runtime suite for `demoScenario(...)`.
- Locked SQL random-function selection with `RANDOM()` in non-MySQL drivers.
- Locked SQL zero-post behavior so `comments on posts` is reported as `0` without building an `IN` clause.
- Locked Mongo default `findOne({})` selection and no-user reporting.
- Locked shared failure logging and CLI exit scheduling behavior.

## Acceptance Criteria
- `demoScenario` SQL and Mongo branches have dedicated direct tests, not only indirect CLI integration coverage.
- Failure handling remains explicit and stable.
- CLI-mode exit scheduling remains intentional and testable.
