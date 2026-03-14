# ORM Hardening Phase 4: Safe Finder Restrictions Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Keep the public safe-finder path constrained to schema-backed fields and deterministic eager-loading relation paths.

## Scope
- Verify real app SQL models reject unknown finder fields before any adapter access.
- Verify real app Mongo models reject unknown finder fields before any connection access.
- Verify schema relation fields are rejected as filter/sort fields.
- Verify `with(...)` rejects malformed or missing top-level relation paths before query execution.

## Implemented
- Added a dedicated runtime hardening suite for safe-finder restrictions on real app models and relation-aware synthetic models.
- Hardened `SafeFinder.with(...)` so it validates non-empty relation names, nested-path syntax, and top-level relation existence before executing the query path.

## Acceptance Criteria
- Unknown filter and sort fields fail before SQL or Mongo query execution.
- Relation schema entries cannot be used as safe-finder filter or sort fields.
- Invalid eager-loading relation paths fail before the finder hits the database.
- Valid nested eager-loading paths still work when the top-level relation exists.
