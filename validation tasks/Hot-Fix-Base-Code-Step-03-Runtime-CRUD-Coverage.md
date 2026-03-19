# Hot Fix Base Code Step 03 - Runtime CRUD Coverage

Last updated: 2026-03-19
Owner: ORM core maintainers
Status: READY

## Purpose

Lock the first runtime CRUD regression branches that the live persistence suite edits must protect.
This is the coverage companion to Step 03 and applies to the first implementation-facing runtime test changes.

## Coverage branches for the first runtime slice

- loaded-instance SQL create through `fill(...) + save()`
- loaded-instance Mongo create through `fill(...) + save()`
- loaded-instance SQL update through `update({...}) + save()`
- loaded-instance Mongo update through `update({...}) + save()`
- loaded-instance SQL patch through `patch({...})`
- loaded-instance Mongo patch through `patch({...})`
- loaded-instance SQL delete through `delete()`
- loaded-instance Mongo delete through `delete()`
- loaded-instance SQL soft-delete restore through `restore()`
- loaded-instance Mongo soft-delete restore through `restore()`
- generated SQL model runtime examples matching the new update contract
- generated Mongo model runtime examples matching the new update contract

## Suites expected to carry the first coverage changes

- `src/lab_test/instance.persistence.layer.runtime.logic.test.ts`
- `src/lab_test/real.model.instance.persistence.integration.logic.test.ts`
- `src/lab_test/generated.model.instance.persistence.cli.logic.test.ts`
- `src/lab_test/scenario.generated.model.instance.persistence.logic.test.ts`

## Guard rules

- preserve 100% statement, branch, function, and line coverage
- every new loaded-instance CRUD alias must be exercised in both SQL and Mongo paths where supported
- generated artifacts count as public runtime guidance and require direct test coverage when updated
- no patch-related branch may be lost while adding `update({...}) + save()`

## Exit criteria

- the first runtime CRUD slice keeps full coverage
- loaded-instance update/delete/restore branches are directly covered
- generated model examples are covered when they change
