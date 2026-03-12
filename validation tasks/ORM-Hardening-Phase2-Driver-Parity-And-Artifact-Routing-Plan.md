# ORM Hardening Phase 2: Driver Parity and Artifact Routing Plan

Last updated: 2026-03-12  
Status: PLANNED

## Goal
- Make SQL and `mongo` routing deterministic across CLI commands, artifact discovery, migration tracking, and runtime compatibility checks.

## Scope
- Harden artifact classification for:
  - models
  - factories
  - seeders
  - scenarios
  - migrations
- Keep explicit driver-targeted CLI flows correct for:
  - `--mongo`
  - `--pg`
  - `--mysql`
  - `--sqlite`
- Expand parity coverage around:
  - `ArtifactStorage`
  - `resolveConnectionName`
  - `MongoMigrationTracker`
  - mixed SQL/`mongo` compatibility handling

## Current Hotspots
- `src/cli/utils/ArtifactStorage.ts` (`263` lines)
- `src/cli/utils/migrations/MongoMigrationTracker.ts`: branches `0%`
- Mixed seeder/scenario routing remains one of the easiest places for parity drift.

## Non-Goals
- No attempt to make SQL and `mongo` identical at the storage-engine level.
- No hidden driver fallback when the user explicitly picked a driver.
- No silent execution of mixed SQL/`mongo` artifacts in a single targeted flow.

## Proposed Work Slices
- Formalize an artifact compatibility matrix: `sql`, `mongo`, `mixed`.
- Add deterministic skip/fail behavior for incompatible artifacts.
- Expand Mongo migration tracker coverage and runtime confidence.
- Keep relation and seeding flows aligned with explicit driver selection.

## Acceptance Criteria
- `--mongo` commands only load Mongo-compatible artifacts.
- Mixed artifacts are rejected or skipped deterministically with a clear reason.
- SQL-targeted commands never execute Mongo-only artifacts by accident.
- `MongoMigrationTracker` has dedicated coverage and no longer sits at `0%` branches.
- Driver-targeting behavior is documented and enforced through tests.

## Validation Strategy
- Contract test for this plan file.
- Focused CLI/runtime tests for artifact loading and routing.
- `npm run typecheck`
- `npm run test:pack-smoke` when CLI/runtime routing changes
