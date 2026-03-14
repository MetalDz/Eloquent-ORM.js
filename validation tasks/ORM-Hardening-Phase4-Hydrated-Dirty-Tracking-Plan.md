# ORM Hardening Phase 4: Hydrated Dirty Tracking Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep instance persistence dirty-tracking explicit and testable after models are hydrated from the read path.

## Scope
- Cover hydrated SQL app models.
- Cover hydrated Mongo app models.
- Verify both `save()` and `patch()` on unchanged hydrated values remain no-ops.
- Verify changed hydrated values still persist through the existing update path.

## Implemented
- Added a dedicated runtime test for dirty-tracking on hydrated real app models.
- Locked no-op `save()` and `patch()` behavior for unchanged hydrated values.
- Locked follow-up persisted updates after a dirty change on both SQL and Mongo.

## Acceptance Criteria
- Hydrated models do not emit duplicate writes when `save()` is called without a real change.
- Hydrated models do not emit duplicate writes when `patch()` receives unchanged values.
- Dirty hydrated values still update through the current SQL and Mongo write path.
