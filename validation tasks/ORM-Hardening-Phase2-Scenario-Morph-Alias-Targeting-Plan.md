# ORM Hardening Phase 2: Scenario Morph Alias Targeting Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep relation-driven scenario/demo flows aligned with explicit driver targeting by resolving morph aliases only from storage-compatible model files.

## Scope
- Extract scenario morph-alias routing into a dedicated helper.
- Respect the explicit connection target when choosing whether a model file can supply a morph alias.
- Fall back to the default table alias when the available model file belongs to the wrong storage kind.

## Files
- `src/cli/utils/ScenarioMorphAliasRouting.ts`
- `src/cli/commands/demoScenario.ts`
- `src/lab_test/orm.hardening.phase2.scenario-morph-alias-targeting.logic.test.ts`

## Acceptance Criteria
- `demo:scenario --mongo` does not trust SQL-only model files for morph alias resolution.
- SQL-targeted scenario/demo flows do not trust Mongo-only model files for morph alias resolution.
- Compatible model files still provide their custom morph aliases.

## Validation
- Focused Jest coverage for targeted morph-alias routing and the scenario runtime path.
- `npm run typecheck`
