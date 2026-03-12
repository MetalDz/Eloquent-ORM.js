# Real Model Instance Persistence Integration Plan

Last updated: 2026-03-12  
Status: IN PROGRESS

## Goal
- Verify `fill()`, `save()`, and `patch()` on real application model files.
- Cover one SQL model and one Mongo model without adding a separate fake model layer.
- Keep the tests on the safe ORM path:
  - schema-backed assignment
  - validated `create()` / `update()`
  - SQL parameter binding
  - Mongo native document updates

## Real Model Targets
- SQL: `src/app/models/AppSmoke.ts`
- Mongo: `src/app/models/GeoLocalisation.ts`

## What Must Be Verified
- `fill()` accepts only schema-backed columns on the real model files.
- `save()` creates new rows/documents on the first call.
- `save()` updates only dirty fields on persisted instances.
- `patch()` performs partial updates on persisted instances.
- Validation still blocks invalid payloads on both SQL and Mongo model files.

## Test Strategy
- Mock connection adapters only at the connection boundary.
- Import the real model files directly.
- Assert the generated SQL/update payloads, not just return values.
- Keep hooks disabled during this slice to focus on persistence semantics.

## Acceptance Criteria
- `AppSmoke` passes `fill().save().patch()` integration coverage.
- `GeoLocalisation` passes `fill().save().patch()` integration coverage.
- SQL assertions prove bound-value writes, not raw string interpolation.
- Mongo assertions prove native `insertOne` / `updateOne` document writes.
- Focused Jest run and `typecheck` both pass.
