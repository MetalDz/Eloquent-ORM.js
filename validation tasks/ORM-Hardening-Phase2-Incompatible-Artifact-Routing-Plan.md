# ORM Hardening Phase 2: Incompatible Artifact Routing Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Make incompatible artifact skipping deterministic and visible in targeted CLI flows.

## Scope
- Add a shared routing-report helper for targeted artifact decisions.
- Use the helper in `db:seed` targeted filtering.
- Use the helper in factory auto-discovery when a storage target is requested.
- Keep skip behavior unchanged while making the reason explicit.

## Files
- `src/cli/utils/ArtifactRoutingReport.ts`
- `src/cli/commands/dbSeed.ts`
- `src/cli/utils/factories/FactoryRegistry.ts`
- `src/lab_test/orm.hardening.phase2.incompatible-artifact-routing.logic.test.ts`

## Acceptance Criteria
- Incompatible targeted artifact skips are explicit and deterministic.
- `db:seed` reports skipped incompatible seeders in targeted flows.
- `FactoryRegistry.autoDiscover(..., { storageKind })` warns when it skips incompatible factories.
- Runtime compatibility decisions still come from the shared artifact compatibility matrix.

## Validation
- Focused Jest coverage for routing-report behavior and targeted CLI/factory paths.
- `npm run typecheck`
