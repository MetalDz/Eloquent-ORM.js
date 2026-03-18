# Documentation Usage Gaps Plan

Last updated: 2026-03-17
Owner: ORM docs maintainers
Status: COMPLETED

## Goal

Make developer-facing docs explicit and practical for day-to-day ORM usage:
model generation, CRUD workflows, soft delete/restore, service generation, and caching on reads.
Add a scenario-first documentation path so consumers can choose the correct implementation path quickly.

## Planned improvements

### P1 - README as entry narrative
- [x] Replace legacy, mojibake content with clean package-level getting started.
- [x] Add correct CLI command syntax (`eloquent make:model ...`) and command intent.
- [x] Add a concrete `setupCache` + `CacheManager` read/write flow for get-heavy endpoints.
- [x] Publish a short "Documentation gaps" block with next actions.

### P2 - Mintlify docs alignment
- [x] Update `docs/getting-started/quick-start.mdx` with explicit model-migration-migrate-seed sequence.
- [x] Expand `docs/getting-started/usage-guides.mdx` with runtime CRUD examples:
  - `all`, `find`, `findOneBy`, `where/orderBy/limit/get`
  - safe finder examples
  - `create/save/patch/delete/restore`
- [x] Update service/controller docs references in `docs/cli/generators.mdx` and `docs/cli/commands.mdx` with explicit outcomes.
- [x] Add a scenario-first entry page covering SQL CRUD, Mongo, relations, soft delete, cache, tests, pivot flows, and production-safe migrations.
- [x] Add a cookbook page with end-to-end copy-paste recipes.
- [x] Add a dedicated mixin scenarios page for SoftDeletes, EagerLoading, Serialize, Casts, Scope, Hooks, PivotHelper, and cache usage.

### P3 - Soft delete + restore documentation
- [x] Add a dedicated section in `docs/orm` (or `docs/getting-started`) showing:
  - when `delete()` is soft vs hard
  - how `restore()` works and what schema fields are required
  - optional safety checks around restore after force-delete

### P4 - Caching and operations
- [x] Add a clear `cache in GET/read path` section in Mintlify docs:
  - `setupCache()`
  - `CacheManager.get/set/delete`
  - key versioning strategy
  - write-through invalidation (post create/update/delete)
- [x] Add `cache:stats` and `cache:clear` commands into operations checklist.

### P5 - Navigation and consistency
- [x] Ensure all links in `docs/index.mdx` and `docs/getting-started/package-docs.mdx` point to the updated pages.
- [x] Add doc smoke check in CI/lab tests for required command syntax patterns and examples.
  - Coverage lives in `src/lab_test/documentation.usage.gaps.logic.test.ts`.

## Acceptance criteria

- A first-time user can follow README in order from model generation to first query.
- Soft delete + restore behavior is documented with one runnable snippet.
- At least one cache read-path example includes invalidation after write.
- A consumer can choose a scenario page and reach the right controller/service/model docs in one click.
- Doc smoke coverage locks required command syntax, scenario pages, mixin guidance, and operations references in tests.
- `docs:lint` and `docs:build` pass with updated links.
