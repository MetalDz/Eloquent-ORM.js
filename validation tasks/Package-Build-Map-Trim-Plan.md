# Package Build Map Trim Plan

Status: COMPLETED

Date: 2026-03-24

## Goal

Reduce published package size without changing ORM runtime behavior.

## Decision

- Keep TypeScript declarations for consumers.
- Stop emitting publish-time JavaScript source maps.
- Stop emitting publish-time declaration maps.
- Keep local development debugging behavior separate from publish output.

## Why

- Published unpacked size was dominated by `.map` files.
- Source maps and declaration maps are debug metadata, not runtime logic.
- Removing them reduces tarball size without affecting ORM, CLI, or public API behavior.

## Files

- `tsconfig.build.json`
- `src/lab_test/package.build.map-trim.logic.test.ts`

## Validation

- `npm.cmd test -- --runInBand --runTestsByPath src/lab_test/package.build.map-trim.logic.test.ts`
- `npm.cmd run build`
- `npm.cmd pack --dry-run --json --cache .npm-cache`
