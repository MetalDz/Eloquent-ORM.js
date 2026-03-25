# Advanced Integration / Real Backend Harness

Last updated: 2026-03-25

This page documents a real consumer-project validation harness built around `@alpha.consultings/eloquent-orm.js`.

## What we achieved

This consumer-project pass now proves that `@alpha.consultings/eloquent-orm.js` can support:

- Express routing with clean router/service separation
- JWT access tokens and refresh token rotation
- authenticated user and post APIs
- PostgreSQL migrations, seeding, and runtime CRUD
- Memcached-backed public read caching
- Docker-backed integration validation
- harness-local API docs with one JSON metadata file per endpoint

Consumer harness repo:

- https://github.com/MetalDz/eloquent-orm-js-advanced-integration

Consumer harness API docs:

- https://github.com/MetalDz/eloquent-orm-js-advanced-integration/blob/main/docs/api/README.md

Goal:

- validate the package in a real Express backend
- exercise JWT access tokens and refresh token rotation
- use PostgreSQL as the first serious SQL runtime target
- validate Memcached-backed public read caching
- run integration tests through Docker-backed infrastructure

## Architecture overview

The harness uses a clean layout:

- `src/app/http/createBlogApiApp.ts`
- `src/app/router/index.ts`
- `src/app/router/authRouter.ts`
- `src/app/router/postRouter.ts`
- `src/app/services/AuthService.ts`
- `src/app/services/BlogPostService.ts`
- `src/app/cache/MemcachedPostCache.ts`
- `src/app/middleware/authenticateAccessToken.ts`
- `src/app/middleware/errorHandler.ts`

Rule of thumb:

1. routers stay thin
2. services own ORM calls and cache invalidation
3. auth stays in dedicated services and middleware
4. Docker owns repeatable infrastructure

## Folder structure

```text
src/
  app/
    auth/
    cache/
    config/
    http/
    middleware/
    models/
    router/
    services/
    database/
      migrations/pg/
      seeds/
  tests/
    support/
scripts/
docs/
  plans/
docker-compose.blog-api-test.yml
```

## Step-by-step integration flow

### 1. Consumer project setup

The consumer app installs:

- `@alpha.consultings/eloquent-orm.js`
- `express`
- `jsonwebtoken`
- `dotenv`
- `@faker-js/faker`

### 2. Scenario generation

```bash
eloquent make:scenario blog --controllers --services --force
eloquent make:migration --all --pg --force
```

### 3. Backend shaping

After generation, the app adds:

- dedicated routers
- JWT auth
- refresh token persistence
- Memcached-backed public read caching
- Express error middleware

### 4. PostgreSQL-first validation

```bash
eloquent migrate:fresh --pg --force --yes
eloquent db:seed --pg --class BlogScenarioSeeder
```

### 5. Docker-backed validation

```bash
npm run test:docker
```

This starts PostgreSQL and Memcached, runs the integration suite, then tears the stack down.

## Auth flow

Validated endpoints:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Protected write routes:

- `POST /api/posts`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`

This proves the ORM in real authorization paths, not only anonymous read flows.

## Cache strategy

The harness uses Memcached for:

- `GET /api/posts`
- `GET /api/posts/:slug`

Expected behavior:

1. first request returns `x-cache: MISS`
2. second request returns `x-cache: HIT`

The consumer harness keeps cache reads service-owned and treats invalidation as best-effort so correctness does not depend on cache availability.

## Docker test flow

The Docker-backed validation sequence is:

1. start PostgreSQL 16
2. start Memcached 1.6
3. wait for ports
4. run the Node integration suite
5. tear down containers and volumes

## Key test files

- `src/tests/blog-auth-cache.test.ts`
- `src/tests/blog-api-pg.integration.test.ts`
- `src/tests/support/testHarness.ts`
- `docs/plans/Blog-Backend-Main-Plan.md`
- `docs/plans/Blog-Backend-Auth-Plan.md`
- `docs/plans/Blog-Backend-Data-Cache-Docker-Plan.md`

## Lessons and bugs found while integrating

The consumer-project pass caught real issues:

- stale seeded password hashes can drift from runtime password verification
- cache invalidation must stay best-effort instead of breaking writes
- integration runs need explicit cache hygiene between executions
- Windows Docker orchestration needs careful process launching
- PostgreSQL-first validation exposes migration and connection lifecycle issues faster than isolated unit tests

That is the main value of the harness: it improved package reliability by exercising real backend behavior outside the package repo.

## Related pages

- [Scenarios](./test-scenarios.md)
- [CLI and pack smoke](./test-cli-pack-smoke.md)
- [Runtime Services](./runtime-services.md)
- [Runtime Controllers](./runtime-controllers.md)
- [CLI Test Matrix](./cli-test-matrix.md)
