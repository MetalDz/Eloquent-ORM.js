# Factory.createMany Concurrency Error Propagation Hardening Plan

## Goal
Ensure `Factory.createMany()` fails fast and rejects reliably when any worker fails under concurrency > 1.

## Problem Summary
Current concurrent flow can resolve successfully even when one or more worker tasks reject.

Impact:
- Hidden failures during seeding/factory generation.
- Partial data can be returned as if operation succeeded.
- Callback failures may be swallowed by scheduler completion flow.

## Scope
- `src/cli/utils/factories/Factory.ts` (`createMany`).
- Add/extend tests under `src/lab_test/` for concurrent error propagation.

## Non-Goals
- Changing `create()` model creation semantics.
- Retrying failed tasks automatically.
- Best-effort partial-success mode.

## Design Direction
- Preserve output ordering by index.
- In concurrent mode, reject on first failure (`create` or callback).
- Stop scheduling new work after first failure.
- Prevent double-settle (never both resolve and reject).
- Keep sequential mode (`concurrency <= 1`) behavior unchanged.

## Work Plan

### Phase 1: Reproduce and Lock Behavior with Tests
- [x] Add failing tests for concurrent mode:
  - [x] Rejects when any `create()` worker throws/rejects.
  - [x] Rejects when callback throws/rejects.
  - [x] Does not resolve partial results after a worker failure.
  - [x] Keeps result ordering when all succeeds.
- [x] Keep sequential path coverage unchanged.

### Phase 2: Implement Error-First Concurrency Control
- [x] Refactor `createMany()` concurrent scheduler to support rejection path.
- [x] Track settle state (`resolved/rejected`) to avoid double-settle.
- [x] Stop enqueuing new tasks after first failure.
- [x] Ensure active workers drain safely without unhandled rejections.

### Phase 3: Verify and Regressions
- [x] Run targeted tests for factory behavior.
- [x] Run `npm.cmd run typecheck`.
- [x] Run full `npm.cmd test`.

### Phase 4: Docs / Notes
- [x] Add short behavior note in docs/changelog if needed.
- [x] Record migration expectation for consumers relying on partial success.

## Progress Log
- `2026-03-06`: Plan created.
- `2026-03-06`: Phase 1 completed with new test file `factory.createMany.concurrency.logic.test.ts`.
- `2026-03-06`: Bug reproduced: concurrent `createMany()` resolves partial results instead of rejecting on worker/callback failure.
- `2026-03-06`: Phase 2 implemented in `Factory.createMany()` with fail-fast rejection, settle-state guard, and scheduling stop on first error.
- `2026-03-06`: Targeted concurrency suite now passes (4/4).
- `2026-03-06`: Phase 3 validation complete.
- `2026-03-06`: `npm.cmd test -- --runTestsByPath src/lab_test/factory.createMany.concurrency.logic.test.ts` passed (4/4).
- `2026-03-06`: `npm.cmd run typecheck` passed.
- `2026-03-06`: `npm.cmd test` passed (25 passed, 3 skipped suites).
- `2026-03-06`: Phase 4 completed with docs updates in `README.md` and `CHANGELOG.md`.

## Exit Criteria
- Concurrent `createMany()` always rejects when any worker/callback fails.
- No successful resolve on hidden worker failures.
- Success path still returns ordered results (`results[i]`).
- Typecheck and test suite pass.
