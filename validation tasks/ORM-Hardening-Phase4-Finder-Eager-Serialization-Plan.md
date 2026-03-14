# ORM Hardening Phase 4: Finder Eager Serialization Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Ensure eager-loaded results returned from the safe-finder path serialize correctly through `toObject()` and `toJSON()`.

## Scope
- Cover SQL finder results loaded through `with(...).first()`.
- Cover Mongo finder results loaded through `with(...).get()`.
- Ensure nested eager-loaded model instances serialize recursively, including hidden-field filtering.

## Implemented
- Added a dedicated runtime test for SQL and Mongo safe-finder eager-loading serialization.
- Locked recursive serialization of eager-loaded nested model instances returned from the finder path.
- Verified that nested hidden fields stay filtered when eager-loaded relations are serialized.

## Acceptance Criteria
- Safe-finder results keep `toObject()` and `toJSON()` after eager loading.
- Eager-loaded nested model instances serialize recursively on both SQL and Mongo paths.
- Nested hidden fields do not leak through serialized eager-loaded relations.
