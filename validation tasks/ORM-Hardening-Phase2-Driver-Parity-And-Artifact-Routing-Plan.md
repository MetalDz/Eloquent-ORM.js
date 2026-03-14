# ORM Hardening Phase 2: Driver Parity and Artifact Routing Plan

Last updated: 2026-03-14  
Status: COMPLETED

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
- [x] Formalize an artifact compatibility matrix: `sql`, `mongo`, `mixed`.
- [x] Add deterministic skip/fail behavior for incompatible artifacts.
- [x] Expand Mongo migration tracker coverage and runtime confidence.
- [x] Keep relation and seeding flows aligned with explicit driver selection.

## Completed Phase 2 Slices
- [x] `src/cli/utils/ArtifactCompatibility.ts`
  - extracted the storage-kind compatibility matrix and grouped-kind collapse logic out of `ArtifactStorage`
- [x] `src/lab_test/orm.hardening.phase2.mongo-migration-tracker.logic.test.ts`
  - added dedicated runtime coverage for Mongo migration history, relink/prune rules, and lock behavior
- [x] `src/cli/utils/ArtifactRoutingReport.ts`
  - added deterministic targeted-artifact skip reporting for `db:seed` and factory auto-discovery
- [x] `src/cli/utils/ScenarioMorphAliasRouting.ts`
  - aligned scenario/demo relation morph-alias resolution with explicit driver targeting

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
