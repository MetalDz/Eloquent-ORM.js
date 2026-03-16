# Coverage Source Scope Plan

Last updated: 2026-03-16 14:26  
Status: COMPLETED

## Goal
- Keep `npm run test:coverage` focused on shipped source instead of double-counting built output or repo-only fixture trees.

## Problem
- Jest coverage was counting `dist/**` when built CLI paths were executed during tests.
- That made the denominator jump and collapsed the reported percentage even though runtime quality had not regressed.
- Repo fixture trees under `src/app/**`, `src/test/**`, and test harness code under `src/lab_test/**` also do not represent the publishable ORM runtime surface.

## Resolution
- Add `collectCoverageFrom` in `jest.config.cjs` for source-only TypeScript files.
- Exclude:
  - `src/app/**/*.ts`
  - `src/test/**/*.ts`
  - `src/lab_test/**/*.ts`
  - generated declarations
- Add `coveragePathIgnorePatterns` for `dist/` so built CLI execution cannot pollute the release coverage gate.

## Validation
- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/coverage.source-scope.logic.test.ts`
- `npm.cmd run test:coverage`
