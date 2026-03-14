# ORM Hardening Phase 4: Real Model Read and Persistence Integration Plan

Last updated: 2026-03-14  
Status: COMPLETED

## Goal
- Extend real-model integration coverage so actual app models exercise the current read, serialization, and persistence path on both SQL and Mongo.

## Scope
- Cover the real `AppSmoke` SQL model through finder hydration, serialization, and persisted writes.
- Cover the real `GeoLocalisation` Mongo model through finder hydration, serialization, and persisted writes.
- Reuse the app-model resolver so CI can fall back to committed fixtures when app models are absent.

## Implemented
- Added a dedicated runtime integration test for real SQL and Mongo app models.
- Verified hydrated finder results keep `toObject()` / `toJSON()` on real app models.
- Verified persisted real-model instances continue to use the current `save()` / `patch()` path after finder hydration.
- Kept the test CI-safe by loading models through the shared app-model resolver.

## Acceptance Criteria
- Real SQL and Mongo app models can be loaded consistently in local and CI contexts.
- Real-model finder results serialize correctly through the default `BaseModel` surface.
- Real-model persisted updates remain compatible with the current `fill()` / `save()` / `patch()` path.
