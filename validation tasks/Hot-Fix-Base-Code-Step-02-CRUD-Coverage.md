# Hot Fix Base Code Step 02 - CRUD Coverage Targets

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: READY

## Coverage purpose

Define the regression branches that Step 02 must protect before and during runtime CRUD refactors.
This is not the implementation step; it is the coverage target map for the contract-test slice.

## Required regression targets

- SQL loaded-instance create through `fill(...) + save()`
- Mongo loaded-instance create through `fill(...) + save()`
- static `User.create(...)` contract path once introduced
- loaded-instance `found.update({...}); await found.save();`
- persisted-instance `await found.patch({...});`
- loaded-instance `await found.delete();`
- loaded soft-delete `await found.restore();`
- no-op save on unchanged hydrated models
- primary-key mutation rejection on persisted models
- safe-finder query reads staying Laravel-like while CRUD changes land

## Files expected to carry new or updated coverage

- `src/lab_test/instance.persistence.layer.runtime.logic.test.ts`
- `src/lab_test/real.model.instance.persistence.integration.logic.test.ts`
- `src/lab_test/generated.model.instance.persistence.cli.logic.test.ts`
- `src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts`
- `src/lab_test/orm.hardening.phase4.real-model-read-persistence.logic.test.ts`
- `src/lab_test/orm.hardening.phase4.hydrated-dirty-tracking.logic.test.ts`
- `src/lab_test/safe.finder.api.runtime.logic.test.ts`

## Guard rules

- statement, branch, function, and line coverage must stay at the captured Step-01 baseline
- every new alias or redirect path must get runtime coverage, not only doc coverage
- generated artifact examples count as public surface and must be exercised when they change
- no slice closes with pack-smoke green but uncovered public CRUD branches

## Exit criteria

- each CRUD branch named above is either covered or explicitly deferred with rationale
- coverage remains at or above:
  - `Statements   : 100% (6290/6290)`
  - `Branches     : 100% (3326/3326)`
  - `Functions    : 100% (1031/1031)`
  - `Lines        : 100% (5954/5954)`
